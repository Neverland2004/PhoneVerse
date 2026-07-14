import Fastify from "fastify";
import cors from "@fastify/cors";
import {
  clearRuntimeApiKey,
  isAiConfigured,
  serverConfig,
  setRuntimeApiKey,
} from "./config/env";
import { assembleMessages, clipByCharBudget, filterContextMessages } from "./prompts/assemble";
import { getServerContact } from "./prompts/profiles";
import { createProvider } from "./providers/deepseek";
import { ProviderError } from "./providers/types";
import { idempotencyStore } from "./utils/idempotency";
import { RateLimiter } from "./utils/rateLimit";
import { issueAnonymousSession, verifyAnonymousSession } from "./utils/session";
import {
  listPersonaProfiles,
  writePersonaProfile,
  type StoredPersonaProfile,
} from "./storage/personaStore";

const app = Fastify({ logger: true, bodyLimit: 64 * 1024 });
const provider = createProvider();
const rateLimiter = new RateLimiter(serverConfig.rateLimitPerMinute);

const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const sendError = (
  reply: { code: (status: number) => { send: (payload: unknown) => unknown } },
  status: number,
  code: string,
  message: string,
) => reply.code(status).send({ error: { code, message } });

const isLocalRequest = (request: { ip: string; hostname?: string; headers: Record<string, unknown> }) => {
  const forwarded = String(request.headers["x-forwarded-for"] ?? "")
    .split(",")[0]
    ?.trim();
  const candidates = [request.ip, forwarded, request.hostname].filter(Boolean);
  return candidates.some(
    (value) =>
      value === "127.0.0.1" ||
      value === "::1" ||
      value === ":ffff:127.0.0.1" ||
      value === "localhost",
  );
};

const allowedOrigins = new Set([
  serverConfig.corsOrigin,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

await app.register(cors, {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("CORS blocked"), false);
  },
  methods: ["GET", "HEAD", "POST", "PUT", "DELETE", "OPTIONS"],
});

app.get("/api/ai/status", async () => ({
  configured: isAiConfigured(),
  provider: serverConfig.provider,
  model: serverConfig.model,
}));

app.get("/api/personas", async () => ({
  items: listPersonaProfiles(),
}));

app.put("/api/personas/:contactId", async (request, reply) => {
  if (!isLocalRequest(request)) {
    return sendError(reply, 403, "FORBIDDEN", "仅允许本机保存人设。");
  }

  const { contactId } = request.params as { contactId: string };
  const contact = getServerContact(contactId);
  if (!contact) {
    return sendError(reply, 400, "INVALID_REQUEST", "未知联系人。");
  }

  const body = request.body as Partial<StoredPersonaProfile>;
  const name = body.name?.trim() ?? "";
  const avatar = body.avatar?.trim() ?? "";
  const persona = body.persona?.trim() ?? "";
  const status = body.status?.trim() || "在线";

  if (!name || !avatar || !persona) {
    return sendError(reply, 400, "INVALID_REQUEST", "名称、头像和人设不能为空。");
  }
  if (persona.length > 2000) {
    return sendError(reply, 400, "INVALID_REQUEST", "人设过长。");
  }

  try {
    const saved = writePersonaProfile({
      contactId,
      name: name.slice(0, 20),
      avatar: [...avatar][0] ?? avatar.slice(0, 2),
      status: status.slice(0, 24),
      persona,
    });
    return { item: saved };
  } catch (error) {
    request.log.error(error);
    return sendError(reply, 500, "PERSONA_WRITE_FAILED", "写入 personas 文件夹失败。");
  }
});

app.post("/api/ai/config", async (request, reply) => {
  if (!isLocalRequest(request)) {
    return sendError(reply, 403, "FORBIDDEN", "仅允许本机配置 API Key。");
  }

  const body = request.body as { apiKey?: string };
  const apiKey = body.apiKey?.trim() ?? "";
  if (!apiKey || apiKey.length < 8 || apiKey.length > 512) {
    return sendError(reply, 400, "INVALID_REQUEST", "请输入有效的 API Key。");
  }

  try {
    setRuntimeApiKey(apiKey);
  } catch (error) {
    request.log.error(error);
    return sendError(reply, 500, "CONFIG_WRITE_FAILED", "保存密钥失败，请检查本机文件权限。");
  }

  request.log.info({ configured: true }, "AI API key updated from local Settings");
  return {
    configured: true,
    provider: serverConfig.provider,
    model: serverConfig.model,
  };
});

app.delete("/api/ai/config", async (request, reply) => {
  if (!isLocalRequest(request)) {
    return sendError(reply, 403, "FORBIDDEN", "仅允许本机配置 API Key。");
  }

  try {
    clearRuntimeApiKey();
  } catch (error) {
    request.log.error(error);
    return sendError(reply, 500, "CONFIG_WRITE_FAILED", "清除密钥失败，请检查本机文件权限。");
  }

  request.log.info({ configured: false }, "AI API key cleared from local Settings");
  return {
    configured: false,
    provider: serverConfig.provider,
    model: serverConfig.model,
  };
});

app.post("/api/session/anonymous", async () => {
  const { token, session } = issueAnonymousSession();
  return {
    token,
    expiresAt: session.expiresAt,
  };
});

app.post("/api/chat", async (request, reply) => {
  const body = request.body as {
    threadId?: string;
    contactId?: string;
    messageId?: string;
    attempt?: number;
    anonymousSessionToken?: string;
    context?: unknown;
    persona?: unknown;
    message?: { role?: string; content?: string };
  };

  const session = verifyAnonymousSession(body.anonymousSessionToken ?? "");
  if (!session) {
    return sendError(reply, 401, "UNAUTHORIZED", "匿名会话无效或已过期。");
  }

  if (!isAiConfigured()) {
    return sendError(reply, 503, "AI_NOT_CONFIGURED", "AI 服务未配置。");
  }

  const ip = request.ip || "unknown";
  if (!rateLimiter.check(`${session.sessionId}:${ip}`)) {
    return sendError(reply, 429, "RATE_LIMITED", "请求过于频繁，请稍后再试。");
  }

  const { threadId, contactId, messageId } = body;
  const attempt = body.attempt ?? 0;
  if (!threadId || !contactId || !messageId || !Number.isInteger(attempt) || attempt < 0) {
    return sendError(reply, 400, "INVALID_REQUEST", "请求参数无效。");
  }

  const contact = getServerContact(contactId);
  if (!contact || !contact.enabled) {
    return sendError(reply, 400, "INVALID_REQUEST", "联系人未启用 AI。");
  }

  const persona = typeof body.persona === "string" ? body.persona.trim() : "";
  if (!persona) {
    return sendError(reply, 400, "INVALID_REQUEST", "请先在前端为该联系人填写人设。");
  }
  if (persona.length > 2000) {
    return sendError(reply, 400, "INVALID_REQUEST", "人设过长。");
  }

  const content = body.message?.content?.trim() ?? "";
  if (body.message?.role !== "user" || !content) {
    return sendError(reply, 400, "INVALID_REQUEST", "消息必须是非空用户文本。");
  }
  if (content.length > serverConfig.maxMessageChars) {
    return sendError(reply, 400, "INVALID_REQUEST", "消息过长。");
  }

  const context = clipByCharBudget(
    filterContextMessages(body.context, serverConfig.maxContextMessages),
    serverConfig.maxContextChars,
  );

  const idempotencyKey = `${session.sessionId}:${messageId}:${attempt}`;
  const existing = await idempotencyStore.get(idempotencyKey);
  if (existing?.status === "completed" && existing.result) {
    return existing.result;
  }
  if (existing?.status === "pending") {
    return sendError(reply, 409, "REQUEST_IN_PROGRESS", "相同请求正在处理中。");
  }
  if (existing?.status === "failed" && existing.error) {
    return sendError(reply, 502, existing.error.code, existing.error.message);
  }

  await idempotencyStore.set(idempotencyKey, {
    status: "pending",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  try {
    const messages = assembleMessages(contact, context, content, persona);
    const result = await provider.generateReply({
      messages,
      temperature: contact.temperature,
      maxTokens: contact.maxOutputTokens,
    });

    const response = {
      requestId: createId("request"),
      messageId: createId("assistant-message"),
      content: result.content,
      provider: result.provider,
      model: result.model,
      threadId,
      contactId,
      userMessageId: messageId,
    };

    await idempotencyStore.set(idempotencyKey, {
      status: "completed",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      result: response,
    });

    request.log.info({
      requestId: response.requestId,
      provider: result.provider,
      model: result.model,
      contactId,
      threadId,
    });

    return response;
  } catch (error) {
    const code = error instanceof ProviderError ? error.code : "PROVIDER_ERROR";
    const message =
      error instanceof ProviderError ? error.message : "AI 回复暂时不可用。";
    await idempotencyStore.set(idempotencyKey, {
      status: "failed",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      error: { code, message },
    });
    return sendError(reply, code === "RATE_LIMITED" ? 429 : 502, code, message);
  }
});

app.listen({ port: serverConfig.port, host: serverConfig.host }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
