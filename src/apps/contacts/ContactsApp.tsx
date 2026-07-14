import { AnimatePresence } from "framer-motion";
import { ConversationView } from "../chat/ConversationView";
import { usePhoneStore } from "../../stores/usePhoneStore";
import { ContactsList } from "./ContactsList";

export function ContactsApp() {
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
        <ContactsList key="contacts-list" onBack={closeApp} onOpenThread={openThread} />
      )}
    </AnimatePresence>
  );
}
