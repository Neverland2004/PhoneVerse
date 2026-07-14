import { MessageCircle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect } from "react";
import { notificationRepository } from "../../services/storage/notificationRepository";
import { usePhoneStore } from "../../stores/usePhoneStore";

const formatRelativeTime = (createdAt: number) => {
  const seconds = Math.max(0, Math.floor((Date.now() - createdAt) / 1_000));
  if (seconds < 60) return "刚刚";
  return `${Math.floor(seconds / 60)} 分钟前`;
};

export function NotificationBanner() {
  const currentId = usePhoneStore((state) => state.currentNotificationId);
  const setCurrent = usePhoneStore((state) => state.setCurrentNotification);
  const openThread = usePhoneStore((state) => state.openThreadFromNotification);
  const pending = useLiveQuery(() => notificationRepository.getUndisplayedNotifications(), []);
  const current = useLiveQuery(
    () => (currentId ? notificationRepository.getNotification(currentId) : undefined),
    [currentId],
  );

  useEffect(() => {
    if (currentId || !pending?.length) return;
    const next = pending[0];
    setCurrent(next.id);
    void notificationRepository.markDisplayed(next.id);
  }, [currentId, pending, setCurrent]);

  useEffect(() => {
    if (!currentId || !current || current.read) {
      if (currentId && current?.read) setCurrent(null);
      return;
    }
    const timer = window.setTimeout(() => setCurrent(null), 4_000);
    return () => window.clearTimeout(timer);
  }, [current, currentId, setCurrent]);

  const handleOpen = async () => {
    if (!current) return;
    const threadId = await notificationRepository.openNotification(current.id);
    setCurrent(null);
    if (threadId) openThread(threadId);
  };

  return (
    <AnimatePresence>
      {current && !current.read && (
        <motion.button
          type="button"
          className="notification-banner"
          initial={{ y: -76, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -54, opacity: 0 }}
          transition={{ duration: 0.24 }}
          onClick={handleOpen}
          aria-label={`打开来自${current.title}的消息：${current.body}`}
        >
          <span className="notification-banner__icon">
            <MessageCircle size={19} aria-hidden="true" />
          </span>
          <span className="notification-banner__content">
            <span>
              <strong>{current.title}</strong>
              <time>{formatRelativeTime(current.createdAt)}</time>
            </span>
            <small>{current.body}</small>
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
