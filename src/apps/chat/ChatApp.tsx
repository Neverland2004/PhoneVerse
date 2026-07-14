import { AnimatePresence } from "framer-motion";
import { usePhoneStore } from "../../stores/usePhoneStore";
import { ChatList } from "./ChatList";
import { ConversationView } from "./ConversationView";

export function ChatApp() {
  const activeThreadId = usePhoneStore((state) => state.activeThreadId);
  const closeApp = usePhoneStore((state) => state.closeApp);
  const openThread = usePhoneStore((state) => state.openThread);
  const closeThread = usePhoneStore((state) => state.closeThread);

  return (
    <AnimatePresence mode="wait" initial={false}>
      {activeThreadId ? (
        <ConversationView
          key={activeThreadId}
          threadId={activeThreadId}
          onBack={closeThread}
        />
      ) : (
        <ChatList key="chat-list" onBack={closeApp} onOpenThread={openThread} />
      )}
    </AnimatePresence>
  );
}
