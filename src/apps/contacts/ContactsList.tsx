import { ArrowLeft, ChevronRight, Users } from "lucide-react";
import { motion } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import { chatRepository } from "../../services/storage/chatRepository";

interface ContactsListProps {
  onBack: () => void;
  onOpenThread: (threadId: string) => void;
}

export function ContactsList({ onBack, onOpenThread }: ContactsListProps) {
  const contacts = useLiveQuery(() => chatRepository.getContactsWithThreads(), []);

  return (
    <motion.section
      className="app-screen contacts-screen"
      initial={{ x: "8%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "8%", opacity: 0 }}
      transition={{ duration: 0.22 }}
    >
      <header className="app-header">
        <button
          type="button"
          className="icon-button"
          onClick={onBack}
          aria-label="关闭 Contacts"
        >
          <ArrowLeft size={22} />
        </button>
        <div>
          <p>Contacts</p>
          <span>本地联系人</span>
        </div>
        <span className="header-mark header-mark--contacts">
          <Users size={19} aria-hidden="true" />
        </span>
      </header>

      <div className="contacts-heading">
        <h1>联系人</h1>
        <p>{contacts ? `${contacts.length} 位联系人` : "正在载入…"}</p>
      </div>

      <div className="contact-list" aria-live="polite">
        {contacts?.map(({ contact, thread }) => (
          <button
            type="button"
            className="contact-row"
            key={contact.id}
            onClick={() => onOpenThread(thread.id)}
          >
            <span className="avatar">{contact.avatar}</span>
            <span>
              <strong>{contact.name}</strong>
              <small>{contact.status}</small>
            </span>
            <ChevronRight size={17} aria-hidden="true" />
          </button>
        ))}
      </div>
      <div className="home-indicator home-indicator--dark" aria-hidden="true" />
    </motion.section>
  );
}
