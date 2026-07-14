import { ArrowLeft, ChevronRight, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import { chatRepository } from "../../services/storage/chatRepository";

interface ChatListProps {
  onBack: () => void;
  onOpenThread: (threadId: string) => void;
}

const formatTime = (timestamp?: number) => {
  if (!timestamp) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(timestamp);
};

export function ChatList({ onBack, onOpenThread }: ChatListProps) {
  const threads = useLiveQuery(() => chatRepository.getThreadSummaries(), []);

  return (
    <motion.section
      className="app-screen chat-list"
      initial={{ x: "8%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "8%", opacity: 0 }}
      transition={{ duration: 0.22 }}
    >
      <header className="app-header">
        <button type="button" className="icon-button" onClick={onBack} aria-label="关闭 Chat">
          <ArrowLeft size={22} />
        </button>
        <div>
          <p>Chat</p>
          <span>本地消息</span>
        </div>
        <span className="header-mark">
          <MessageCircle size={19} aria-hidden="true" />
        </span>
      </header>

      <div className="chat-list__heading">
        <h1>消息</h1>
        <p>与重要的人保持联系</p>
      </div>

      <div className="thread-list" aria-live="polite">
        {!threads && <p className="empty-state">正在载入会话…</p>}
        {threads?.map(({ thread, contact, lastMessage }) => (
          <button
            type="button"
            className="thread-row"
            key={thread.id}
            onClick={() => onOpenThread(thread.id)}
          >
            <span className="avatar">{contact.avatar}</span>
            <span className="thread-row__content">
              <span>
                <strong>{contact.name}</strong>
                <time>{formatTime(lastMessage?.createdAt)}</time>
              </span>
              <span>
                <small>{lastMessage?.content ?? "暂无消息"}</small>
                {thread.unreadCount > 0 && (
                  <i className="unread-badge" aria-label={`${thread.unreadCount} 条未读`}>
                    {thread.unreadCount}
                  </i>
                )}
              </span>
            </span>
            <ChevronRight size={17} aria-hidden="true" />
          </button>
        ))}
      </div>
      <div className="home-indicator home-indicator--dark" aria-hidden="true" />
    </motion.section>
  );
}
