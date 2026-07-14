import { ArrowLeft, Send } from "lucide-react";
import { motion } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { aiApiClient, AiApiError } from "../../services/api/aiApiClient";
import { chatService } from "../../services/chatService";
import { aiRepository } from "../../services/storage/aiRepository";
import { chatRepository } from "../../services/storage/chatRepository";
import { notificationRepository } from "../../services/storage/notificationRepository";
import { usePhoneStore } from "../../stores/usePhoneStore";
import type { AiStatus } from "../../types/models";
import { ContactProfileEditor } from "./ContactProfileEditor";

interface ConversationViewProps {
  threadId: string;
  onBack: () => void;
}

const formatMessageTime = (timestamp: number) =>
  new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(timestamp);

const statusLabel = (status: AiStatus | null, error: string | null) => {
  if (error) return error;
  if (!status) return "正在检查 AI 服务…";
  if (!status.configured) return "AI 服务未配置，暂时无法发送消息。";
  return "";
};

export function ConversationView({ threadId, onBack }: ConversationViewProps) {
  const summary = useLiveQuery(() => chatRepository.getThreadSummary(threadId), [threadId]);
  const messages = useLiveQuery(() => chatRepository.getMessages(threadId), [threadId]);
  const profile = useLiveQuery(
    () => (summary ? aiRepository.getProfile(summary.contact.id) : undefined),
    [summary?.contact.id],
  );
  const [draft, setDraft] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const refreshStatus = async () => {
    try {
      const status = await aiApiClient.getStatus();
      setAiStatus(status);
      setStatusError(null);
    } catch (error) {
      setAiStatus(null);
      setStatusError(error instanceof AiApiError ? error.message : "无法连接 AI 服务。");
    }
  };

  useEffect(() => {
    let cancelled = false;
    void aiApiClient
      .getStatus()
      .then((status) => {
        if (cancelled) return;
        setAiStatus(status);
        setStatusError(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setAiStatus(null);
        setStatusError(error instanceof AiApiError ? error.message : "无法连接 AI 服务。");
      });
    return () => {
      cancelled = true;
    };
  }, [threadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length, isReplying]);

  useEffect(() => {
    void notificationRepository.markThreadRead(threadId);
  }, [threadId]);

  const canSend =
    Boolean(aiStatus?.configured) &&
    Boolean(profile?.enabled) &&
    !statusError &&
    !isReplying;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || !canSend) return;
    setDraft("");
    setActionError("");
    setIsReplying(true);
    try {
      await chatService.sendAiMessage(
        threadId,
        content,
        () => usePhoneStore.getState().activeThreadId === threadId,
      );
    } catch (error) {
      setActionError(error instanceof AiApiError ? error.message : "发送失败，请稍后重试。");
      if (error instanceof AiApiError && error.code === "AI_NOT_CONFIGURED") {
        await refreshStatus();
      }
    } finally {
      setIsReplying(false);
    }
  };

  const handleRetry = async (userMessageId: string) => {
    setActionError("");
    setIsReplying(true);
    try {
      await chatService.retryFailedMessage(
        threadId,
        userMessageId,
        () => usePhoneStore.getState().activeThreadId === threadId,
      );
    } catch (error) {
      setActionError(error instanceof AiApiError ? error.message : "重试失败，请稍后重试。");
    } finally {
      setIsReplying(false);
    }
  };

  const unavailableMessage = statusLabel(aiStatus, statusError);

  return (
    <motion.section
      className="app-screen conversation"
      initial={{ x: "14%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "10%", opacity: 0 }}
      transition={{ duration: 0.22 }}
    >
      <header className="conversation-header">
        <button type="button" className="icon-button" onClick={onBack} aria-label="返回消息列表">
          <ArrowLeft size={22} />
        </button>
        <button
          type="button"
          className="avatar avatar--small avatar--button"
          onClick={() => setEditingProfile(true)}
          aria-label={`编辑${summary?.contact.name ?? "联系人"}的头像与人设`}
          disabled={!summary}
        >
          {summary?.contact.avatar ?? "…"}
        </button>
        <div>
          <strong>{summary?.contact.name ?? "载入中"}</strong>
          <small>{summary?.contact.status ?? "点头像可改人设"}</small>
        </div>
      </header>

      <div className="message-list" aria-live="polite">
        {messages?.map((message) => (
          <motion.div
            className={`message-row message-row--${message.sender}`}
            key={message.id}
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.18 }}
          >
            <div className="message-bubble">
              <p>{message.content}</p>
              <time>{formatMessageTime(message.createdAt)}</time>
              {message.sender === "user" && message.aiState === "failed" && (
                <button
                  type="button"
                  className="retry-button"
                  onClick={() => handleRetry(message.id)}
                  disabled={isReplying || !canSend}
                >
                  重试
                </button>
              )}
            </div>
          </motion.div>
        ))}
        {isReplying && (
          <div className="message-row message-row--contact">
            <span className="typing-indicator" aria-label="对方正在输入">
              <i />
              <i />
              <i />
            </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {(unavailableMessage || actionError) && (
        <div className="composer-status" role="status">
          <span>{actionError || unavailableMessage}</span>
          <button type="button" onClick={() => void refreshStatus()}>
            重新检测
          </button>
        </div>
      )}

      <form className="composer" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="message-input">
          输入消息
        </label>
        <input
          id="message-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={canSend ? "发消息…" : "AI 不可用"}
          autoComplete="off"
          disabled={!canSend}
        />
        <button
          type="submit"
          className="send-button"
          aria-label="发送消息"
          disabled={!draft.trim() || !canSend}
        >
          <Send size={18} />
        </button>
      </form>
      <div className="home-indicator home-indicator--dark" aria-hidden="true" />
      {editingProfile && summary && (
        <ContactProfileEditor
          contact={summary.contact}
          persona={profile?.persona ?? ""}
          onClose={() => setEditingProfile(false)}
        />
      )}
    </motion.section>
  );
}
