import { aiApiClient, AiApiError } from "./api/aiApiClient";
import { aiRepository, type AiRepository } from "./storage/aiRepository";
import { chatRepository, type ChatRepository } from "./storage/chatRepository";
import {
  notificationRepository,
  type NotificationRepository,
} from "./storage/notificationRepository";

export class ChatService {
  constructor(
    private readonly repository: ChatRepository = chatRepository,
    private readonly notifications: NotificationRepository = notificationRepository,
    private readonly ai: AiRepository = aiRepository,
    private readonly api = aiApiClient,
  ) {}

  async sendAiMessage(
    threadId: string,
    content: string,
    isThreadActive: () => boolean,
  ): Promise<void> {
    const normalized = content.trim();
    if (!normalized) return;

    const summary = await this.repository.getThreadSummary(threadId);
    if (!summary) throw new AiApiError("会话不存在。", "INVALID_REQUEST");

    const profile = await this.ai.getProfile(summary.contact.id);
    if (!profile?.enabled) {
      throw new AiApiError("该联系人未启用 AI。", "AI_NOT_CONFIGURED");
    }
    if (!profile.persona?.trim()) {
      throw new AiApiError("请先点击头像填写该联系人的人设。", "INVALID_REQUEST");
    }

    const pending = await this.ai.getPendingByThread(threadId);
    if (pending.length > 0) {
      throw new AiApiError("当前会话已有进行中的请求。", "REQUEST_IN_PROGRESS");
    }

    const userMessage = await this.repository.addMessage(threadId, "user", normalized);
    const history = await this.repository.getMessages(threadId);
    const context = this.ai.buildContext(history.filter((item) => item.id !== userMessage.id));
    const request = await this.ai.createPendingRequest({
      threadId,
      contactId: summary.contact.id,
      userMessageId: userMessage.id,
      attempt: 0,
    });

    await this.executeRequest({
      requestId: request.id,
      threadId,
      contactId: summary.contact.id,
      userMessageId: userMessage.id,
      attempt: 0,
      content: normalized,
      context,
      persona: profile.persona,
      isThreadActive,
    });
  }

  async retryFailedMessage(
    threadId: string,
    userMessageId: string,
    isThreadActive: () => boolean,
  ): Promise<void> {
    const [summary, existing, history] = await Promise.all([
      this.repository.getThreadSummary(threadId),
      this.ai.getRequestByUserMessage(userMessageId),
      this.repository.getMessages(threadId),
    ]);
    if (!summary || !existing) return;
    if (existing.state === "completed") return;
    if (existing.state === "pending") {
      throw new AiApiError("当前请求仍在处理中。", "REQUEST_IN_PROGRESS");
    }

    const userMessage = history.find((item) => item.id === userMessageId);
    if (!userMessage) return;

    const profile = await this.ai.getProfile(summary.contact.id);
    const attempt = existing.retryCount + 1;
    await this.ai.reopenForRetry(existing.id, userMessageId, attempt);

    const context = this.ai.buildContext(
      history.filter((item) => item.id !== userMessageId && item.aiState !== "failed"),
    );

    await this.executeRequest({
      requestId: existing.id,
      threadId,
      contactId: summary.contact.id,
      userMessageId,
      attempt,
      content: userMessage.content,
      context,
      persona: profile?.persona,
      isThreadActive,
    });
  }

  private async executeRequest(input: {
    requestId: string;
    threadId: string;
    contactId: string;
    userMessageId: string;
    attempt: number;
    content: string;
    context: Array<{ role: "user" | "assistant"; content: string }>;
    persona?: string;
    isThreadActive: () => boolean;
  }): Promise<void> {
    try {
      const response = await this.api.chat({
        threadId: input.threadId,
        contactId: input.contactId,
        messageId: input.userMessageId,
        attempt: input.attempt,
        context: input.context,
        persona: input.persona,
        message: { role: "user", content: input.content },
      });

      const current = await this.ai.getRequestByUserMessage(input.userMessageId);
      if (!current || current.id !== input.requestId || current.state !== "pending") {
        return;
      }

      await this.notifications.deliverIncomingMessage({
        threadId: input.threadId,
        body: response.content,
        isThreadActive: input.isThreadActive(),
        notificationId: `ai-${response.requestId}`,
        messageId: response.messageId,
        replyToMessageId: input.userMessageId,
      });
      await this.ai.markCompleted({
        requestId: input.requestId,
        userMessageId: input.userMessageId,
        assistantMessageId: response.messageId,
      });
    } catch (error) {
      const code = error instanceof AiApiError ? error.code : "PROVIDER_ERROR";
      await this.ai.markFailed(input.requestId, input.userMessageId, code);
      throw error;
    }
  }
}

export const chatService = new ChatService();
