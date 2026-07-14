import { MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface LockScreenProps {
  onUnlock: () => void;
}

const timeFormatter = new Intl.DateTimeFormat("zh-CN", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "long",
  day: "numeric",
  weekday: "long",
});

export function LockScreen({ onUnlock }: LockScreenProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <motion.section
      className="lock-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ y: "-14%", opacity: 0 }}
      transition={{ duration: 0.26 }}
      drag="y"
      dragConstraints={{ top: -100, bottom: 0 }}
      dragElastic={0.18}
      onDragEnd={(_, info) => {
        if (info.offset.y < -55 || info.velocity.y < -450) onUnlock();
      }}
    >
      <div className="lock-screen__glow" />
      <div className="lock-screen__content">
        <div className="lock-screen__clock" aria-label={`当前时间 ${timeFormatter.format(now)}`}>
          <p>{dateFormatter.format(now)}</p>
          <time>{timeFormatter.format(now)}</time>
        </div>

        <div className="lock-notification" aria-label="来自哥哥的预设消息">
          <span className="lock-notification__icon">
            <MessageCircle size={20} aria-hidden="true" />
          </span>
          <span>
            <strong>哥哥</strong>
            <small>刚刚</small>
            <p>到家后告诉我一声。</p>
          </span>
        </div>
      </div>

      <button className="unlock-button" type="button" onClick={onUnlock}>
        <span>向上滑动或点击解锁</span>
        <i aria-hidden="true" />
      </button>
    </motion.section>
  );
}
