import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PhoneVerseDatabase } from "../db/database";
import { ChatService } from "../services/chatService";
import { AiApiClient } from "../services/api/aiApiClient";
import { AiRepository } from "../services/storage/aiRepository";
import { ChatRepository } from "../services/storage/chatRepository";
import { NotificationRepository } from "../services/storage/notificationRepository";

describe("Phase 2 AI 聊天", () => {
  let database: PhoneVerseDatabase;
  let chats: ChatRepository;
  let notifications: NotificationRepository;
  let ai: AiRepository;

  beforeEach(async () => {
    database = new PhoneVerseDatabase(`phoneverse-ai-test-${crypto.randomUUID()}`);
    chats = new ChatRepository(database);
    notifications = new NotificationRepository(database);
    ai = new AiRepository(database);
    await chats.initialize();
    await ai.initialize();
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  it("初始化 5 位联系人 AI 公开配置", async () => {
    const profiles = await ai.getProfiles();
    expect(profiles).toHaveLength(5);
    expect(profiles.every(({ enabled }) => enabled)).toBe(true);
  });

  it("成功保存用户消息和 AI 回复，不使用本地模拟回复", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/session/anonymous")) {
        return new Response(JSON.stringify({ token: "token-a", expiresAt: Date.now() + 10000 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("/api/chat")) {
        const body = JSON.parse(String(init?.body)) as {
          messageId: string;
          message: { content: string };
        };
        expect(body.message.content).toBe("今天有点累。");
        return new Response(
          JSON.stringify({
            requestId: "request-1",
            messageId: "assistant-1",
            content: "那就先休息一会儿。",
            provider: "deepseek",
            model: "deepseek-chat",
            threadId: "thread-brother",
            contactId: "contact-brother",
            userMessageId: body.messageId,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      throw new Error(`意外请求：${url}`);
    });

    const api = new AiApiClient(fetchMock as unknown as typeof fetch);
    const service = new ChatService(chats, notifications, ai, api);
    await service.sendAiMessage("thread-brother", "今天有点累。", () => true);

    const messages = await chats.getMessages("thread-brother");
    expect(messages.at(-2)).toMatchObject({
      sender: "user",
      content: "今天有点累。",
      aiState: "completed",
    });
    expect(messages.at(-1)).toMatchObject({
      sender: "contact",
      content: "那就先休息一会儿。",
      id: "assistant-1",
    });
    expect(fetchMock).toHaveBeenCalled();
  });

  it("请求失败时保留用户消息并标记失败", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/session/anonymous")) {
        return new Response(JSON.stringify({ token: "token-b", expiresAt: Date.now() + 10000 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({ error: { code: "PROVIDER_ERROR", message: "AI 回复暂时不可用。" } }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    });

    const api = new AiApiClient(fetchMock as unknown as typeof fetch);
    const service = new ChatService(chats, notifications, ai, api);

    await expect(
      service.sendAiMessage("thread-brother", "你好", () => true),
    ).rejects.toThrow("AI 回复暂时不可用。");

    const messages = await chats.getMessages("thread-brother");
    expect(messages.at(-1)).toMatchObject({
      sender: "user",
      content: "你好",
      aiState: "failed",
      errorCode: "PROVIDER_ERROR",
    });
  });

  it("启动时将遗留 pending 请求标记为中断失败", async () => {
    const user = await chats.addMessage("thread-mom", "user", "挂起的消息");
    await ai.createPendingRequest({
      threadId: "thread-mom",
      contactId: "contact-mom",
      userMessageId: user.id,
      attempt: 0,
    });

    await ai.failInterruptedRequests();
    const request = await ai.getRequestByUserMessage(user.id);
    const message = (await chats.getMessages("thread-mom")).find(({ id }) => id === user.id);
    expect(request).toMatchObject({ state: "failed", errorCode: "REQUEST_INTERRUPTED" });
    expect(message).toMatchObject({ aiState: "failed", errorCode: "REQUEST_INTERRUPTED" });
  });
});
