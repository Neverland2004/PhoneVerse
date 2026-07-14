import { AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { ChatApp } from "./apps/chat/ChatApp";
import { ContactsApp } from "./apps/contacts/ContactsApp";
import { NotesApp } from "./apps/notes/NotesApp";
import { PhotosApp } from "./apps/photos/PhotosApp";
import { SettingsApp } from "./apps/settings/SettingsApp";
import { HomeScreen } from "./components/homescreen/HomeScreen";
import { LockScreen } from "./components/lockscreen/LockScreen";
import { NotificationBanner } from "./components/notification/NotificationBanner";
import { PhoneShell } from "./components/phone/PhoneShell";
import { aiApiClient } from "./services/api/aiApiClient";
import { getLocalApiKey } from "./services/api/localApiKey";
import { localEventService } from "./services/events/localEventService";
import { syncPersonasFromDisk } from "./services/personaSync";
import { aiRepository } from "./services/storage/aiRepository";
import { chatRepository } from "./services/storage/chatRepository";
import { contentRepository } from "./services/storage/contentRepository";
import { usePhoneStore } from "./stores/usePhoneStore";

async function syncLocalApiKeyToServer() {
  const apiKey = getLocalApiKey().trim();
  if (!apiKey) {
    // 前端已无密钥时，把服务端内存也清掉，避免刷新后又显示「已配置」
    await aiApiClient.clearApiKey();
    return;
  }
  await aiApiClient.configureApiKey(apiKey);
}

export default function App() {
  const [databaseError, setDatabaseError] = useState<string | null>(null);
  const [databaseReady, setDatabaseReady] = useState(false);
  const page = usePhoneStore((state) => state.page);
  const activeApp = usePhoneStore((state) => state.activeApp);
  const isUnlocked = usePhoneStore((state) => state.isUnlocked);
  const unlock = usePhoneStore((state) => state.unlock);
  const openApp = usePhoneStore((state) => state.openApp);
  const closeApp = usePhoneStore((state) => state.closeApp);

  useEffect(() => {
    void Promise.all([
      chatRepository.initialize(),
      contentRepository.initialize(),
      aiRepository.initialize(),
    ])
      .then(async () => {
        try {
          await syncLocalApiKeyToServer();
        } catch {
          // BFF 未启动时不阻断前端；进 Settings / Chat 再提示
        }
        try {
          await syncPersonasFromDisk();
        } catch {
          // 无文件或 BFF 未启动时用本地 IndexedDB 即可
        }
        setDatabaseReady(true);
      })
      .catch(() => {
        setDatabaseError("本地数据初始化失败，请刷新页面重试。");
      });
  }, []);

  useEffect(() => {
    if (!databaseReady || !isUnlocked) return;
    void localEventService.start(() => usePhoneStore.getState().activeThreadId);
  }, [databaseReady, isUnlocked]);

  return (
    <PhoneShell>
      {databaseError ? (
        <div className="fatal-state" role="alert">
          <strong>暂时无法打开 PhoneVerse</strong>
          <p>{databaseError}</p>
        </div>
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          {page === "lockscreen" && <LockScreen key="lock" onUnlock={unlock} />}
          {page === "home" && <HomeScreen key="home" onOpenApp={openApp} />}
          {page === "app" && activeApp === "chat" && <ChatApp key="chat" />}
          {page === "app" && activeApp === "contacts" && <ContactsApp key="contacts" />}
          {page === "app" && activeApp === "photos" && (
            <PhotosApp key="photos" onBack={closeApp} />
          )}
          {page === "app" && activeApp === "notes" && (
            <NotesApp key="notes" onBack={closeApp} />
          )}
          {page === "app" && activeApp === "settings" && (
            <SettingsApp key="settings" onBack={closeApp} />
          )}
        </AnimatePresence>
      )}
      {!databaseError && databaseReady && <NotificationBanner />}
    </PhoneShell>
  );
}
