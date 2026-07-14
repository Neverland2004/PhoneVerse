import { db, type PhoneVerseDatabase } from "../../db/database";
import type { AIRequest, ClientContactAIProfile, Message } from "../../types/models";

const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const defaultProfiles: ClientContactAIProfile[] = [
  {
    contactId: "contact-brother",
    enabled: true,
    displayName: "哥哥",
    persona: "你是用户的哥哥。性格稳重体贴，说话像家人，会关心用户休息、吃饭和情绪，语气温暖但不油腻。",
  },
  {
    contactId: "contact-mom",
    enabled: true,
    displayName: "妈妈",
    persona: "你是用户的妈妈。关心日常起居，语气亲切、唠叨但充满爱，会提醒按时吃饭、注意身体。",
  },
  {
    contactId: "contact-sister",
    enabled: true,
    displayName: "妹妹",
    persona: "你是用户的妹妹。语气轻松活泼，偶尔撒娇或吐槽，也会关心哥哥/姐姐的状态。",
  },
  {
    contactId: "contact-classmate",
    enabled: true,
    displayName: "同学",
    persona: "你是用户的同学。说话自然随性，会聊学习、作业或日常安排，语气像朋友。",
  },
  {
    contactId: "contact-assistant",
    enabled: true,
    displayName: "AI 助手",
    persona:
      "你是 PhoneVerse 中的本地演示助手角色。语气清晰、礼貌、简洁，帮助用户整理思路或回答问题，仍保持角色对话风格。",
  },
];

export class AiRepository {
  constructor(private readonly database: PhoneVerseDatabase = db) {}

  async initialize(): Promise<void> {
    await this.database.transaction("rw", this.database.contactAIProfiles, async () => {
      const existing = await this.database.contactAIProfiles.bulkGet(
        defaultProfiles.map(({ contactId }) => contactId),
      );
      const missing = defaultProfiles.filter((_, index) => !existing[index]);
      if (missing.length) await this.database.contactAIProfiles.bulkAdd(missing);

      for (let index = 0; index < defaultProfiles.length; index += 1) {
        const current = existing[index];
        const fallback = defaultProfiles[index];
        if (!current || current.persona?.trim()) continue;
        await this.database.contactAIProfiles.update(fallback.contactId, {
          persona: fallback.persona,
          displayName: current.displayName || fallback.displayName,
        });
      }
    });
    await this.failInterruptedRequests();
  }

  async updateProfile(
    contactId: string,
    patch: { displayName?: string; persona?: string; enabled?: boolean },
  ): Promise<void> {
    const updates: Partial<ClientContactAIProfile> = {};
    if (patch.displayName !== undefined) updates.displayName = patch.displayName.trim() || "未命名";
    if (patch.persona !== undefined) updates.persona = patch.persona.trim();
    if (patch.enabled !== undefined) updates.enabled = patch.enabled;
    await this.database.contactAIProfiles.update(contactId, updates);
  }

  async failInterruptedRequests(): Promise<void> {
    const pending = await this.database.aiRequests.where("state").equals("pending").toArray();
    await this.database.transaction(
      "rw",
      [this.database.aiRequests, this.database.messages],
      async () => {
        for (const request of pending) {
          await this.database.aiRequests.update(request.id, {
            state: "failed",
            errorCode: "REQUEST_INTERRUPTED",
            updatedAt: Date.now(),
          });
          await this.database.messages.update(request.userMessageId, {
            aiState: "failed",
            errorCode: "REQUEST_INTERRUPTED",
          });
        }
      },
    );
  }

  getProfile(contactId: string): Promise<ClientContactAIProfile | undefined> {
    return this.database.contactAIProfiles.get(contactId);
  }

  getProfiles(): Promise<ClientContactAIProfile[]> {
    return this.database.contactAIProfiles.toArray();
  }

  getRequestByUserMessage(userMessageId: string): Promise<AIRequest | undefined> {
    return this.database.aiRequests.where("userMessageId").equals(userMessageId).first();
  }

  getPendingByThread(threadId: string): Promise<AIRequest[]> {
    return this.database.aiRequests
      .where("threadId")
      .equals(threadId)
      .filter((request) => request.state === "pending")
      .toArray();
  }

  async createPendingRequest(input: {
    threadId: string;
    contactId: string;
    userMessageId: string;
    attempt: number;
  }): Promise<AIRequest> {
    const now = Date.now();
    const request: AIRequest = {
      id: createId("ai-request"),
      idempotencyKey: `${input.userMessageId}:${input.attempt}`,
      threadId: input.threadId,
      contactId: input.contactId,
      userMessageId: input.userMessageId,
      state: "pending",
      retryCount: input.attempt,
      createdAt: now,
      updatedAt: now,
    };
    await this.database.transaction(
      "rw",
      [this.database.aiRequests, this.database.messages],
      async () => {
        await this.database.aiRequests.add(request);
        await this.database.messages.update(input.userMessageId, {
          aiState: "pending",
          aiRequestId: request.id,
          errorCode: undefined,
        });
      },
    );
    return request;
  }

  async reopenForRetry(requestId: string, userMessageId: string, attempt: number): Promise<void> {
    await this.database.transaction(
      "rw",
      [this.database.aiRequests, this.database.messages],
      async () => {
        await this.database.aiRequests.update(requestId, {
          state: "pending",
          retryCount: attempt,
          idempotencyKey: `${userMessageId}:${attempt}`,
          errorCode: undefined,
          updatedAt: Date.now(),
        });
        await this.database.messages.update(userMessageId, {
          aiState: "pending",
          aiRequestId: requestId,
          errorCode: undefined,
        });
      },
    );
  }

  async markFailed(requestId: string, userMessageId: string, errorCode: string): Promise<void> {
    await this.database.transaction(
      "rw",
      [this.database.aiRequests, this.database.messages],
      async () => {
        await this.database.aiRequests.update(requestId, {
          state: "failed",
          errorCode,
          updatedAt: Date.now(),
        });
        await this.database.messages.update(userMessageId, {
          aiState: "failed",
          errorCode,
        });
      },
    );
  }

  async markCompleted(input: {
    requestId: string;
    userMessageId: string;
    assistantMessageId: string;
  }): Promise<void> {
    await this.database.transaction(
      "rw",
      [this.database.aiRequests, this.database.messages],
      async () => {
        await this.database.aiRequests.update(input.requestId, {
          state: "completed",
          assistantMessageId: input.assistantMessageId,
          updatedAt: Date.now(),
          errorCode: undefined,
        });
        await this.database.messages.update(input.userMessageId, {
          aiState: "completed",
          errorCode: undefined,
        });
      },
    );
  }

  async clearFailedRequests(): Promise<void> {
    const failed = await this.database.aiRequests.where("state").equals("failed").toArray();
    await this.database.transaction(
      "rw",
      [this.database.aiRequests, this.database.messages],
      async () => {
        for (const request of failed) {
          await this.database.aiRequests.delete(request.id);
          await this.database.messages.update(request.userMessageId, {
            aiState: undefined,
            aiRequestId: undefined,
            errorCode: undefined,
          });
        }
      },
    );
  }

  buildContext(messages: Message[]): Array<{ role: "user" | "assistant"; content: string }> {
    return messages
      .filter(
        (message) =>
          (message.sender === "user" || message.sender === "contact") &&
          message.aiState !== "failed" &&
          message.content.trim(),
      )
      .slice(-20)
      .map((message) => ({
        role: message.sender === "user" ? ("user" as const) : ("assistant" as const),
        content: message.content,
      }));
  }
}

export const aiRepository = new AiRepository();
