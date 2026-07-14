import { config as loadEnv } from "dotenv";

loadEnv();

const readInt = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const serverConfig = {
  port: readInt(process.env.PORT, 8787),
  host: process.env.HOST ?? "127.0.0.1",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://127.0.0.1:5173",
  provider: process.env.AI_PROVIDER ?? "deepseek",
  /** 仅内存。设置页保存时由前端同步；清除后清空。不写文件。 */
  apiKey: (process.env.AI_API_KEY ?? "").trim(),
  model: process.env.AI_MODEL ?? "deepseek-chat",
  baseUrl: process.env.AI_BASE_URL ?? "https://api.deepseek.com",
  requestTimeoutMs: readInt(process.env.AI_REQUEST_TIMEOUT_MS, 30_000),
  maxContextChars: readInt(process.env.AI_MAX_CONTEXT_CHARS, 8_000),
  maxMessageChars: readInt(process.env.AI_MAX_MESSAGE_CHARS, 2_000),
  maxContextMessages: readInt(process.env.AI_MAX_CONTEXT_MESSAGES, 20),
  rateLimitPerMinute: readInt(process.env.AI_RATE_LIMIT, 20),
  anonymousSessionSecret:
    process.env.ANONYMOUS_SESSION_SECRET ?? "phoneverse-dev-session-secret-change-me",
};

export function isAiConfigured(): boolean {
  return Boolean(serverConfig.apiKey.trim());
}

export function setRuntimeApiKey(apiKey: string): void {
  const next = apiKey.trim();
  if (!next) {
    throw new Error("API key 不能为空");
  }
  serverConfig.apiKey = next;
}

export function clearRuntimeApiKey(): void {
  serverConfig.apiKey = "";
}
