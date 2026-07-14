import {
  Images,
  MessageCircle,
  NotebookPen,
  Settings,
  Signal,
  Users,
  Wifi,
} from "lucide-react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type { PhoneApp } from "../../stores/usePhoneStore";

interface HomeScreenProps {
  onOpenApp: (app: PhoneApp) => void;
}

interface AppIcon {
  name: string;
  Icon: LucideIcon;
  color: string;
  app: PhoneApp;
}

const apps: AppIcon[] = [
  { name: "Chat", Icon: MessageCircle, color: "app-icon--chat", app: "chat" },
  { name: "Contacts", Icon: Users, color: "app-icon--contacts", app: "contacts" },
  { name: "Photos", Icon: Images, color: "app-icon--photos", app: "photos" },
  { name: "Notes", Icon: NotebookPen, color: "app-icon--notes", app: "notes" },
  { name: "Settings", Icon: Settings, color: "app-icon--settings", app: "settings" },
];

export function HomeScreen({ onOpenApp }: HomeScreenProps) {
  return (
    <motion.section
      className="home-screen"
      initial={{ opacity: 0, scale: 1.03 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.24 }}
    >
      <header className="status-bar">
        <time>
          {new Date().toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })}
        </time>
        <span>
          <Signal size={14} aria-label="蜂窝信号" />
          <Wifi size={15} aria-label="无线网络" />
          <i className="battery" aria-label="电池电量充足" />
        </span>
      </header>

      <div className="home-title">
        <p>PhoneVerse</p>
        <span>今天也要保持好心情</span>
      </div>

      <div className="app-grid">
        {apps.map(({ name, Icon, color, app }) => (
          <button
            type="button"
            className="app-tile"
            key={name}
            onClick={() => onOpenApp(app)}
            aria-label={`打开 ${name}`}
          >
            <span className={`app-icon ${color}`}>
              <Icon size={29} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <span>{name}</span>
          </button>
        ))}
      </div>

      <div className="home-indicator" aria-hidden="true" />
    </motion.section>
  );
}
