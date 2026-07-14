import { ArrowLeft, NotebookPen, Plus, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { contentRepository } from "../../services/storage/contentRepository";
import { NoteEditor } from "./NoteEditor";

interface NotesAppProps {
  onBack: () => void;
}

const formatDate = (timestamp: number) =>
  new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(timestamp);

export function NotesApp({ onBack }: NotesAppProps) {
  const notes = useLiveQuery(() => contentRepository.getNotes(), []);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const selectedNote = notes?.find(({ id }) => id === selectedNoteId);

  const createNote = async () => {
    const note = await contentRepository.createNote();
    setSelectedNoteId(note.id);
  };

  return (
    <motion.section
      className="app-screen notes-screen"
      initial={{ x: "8%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "8%", opacity: 0 }}
      transition={{ duration: 0.22 }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {selectedNote ? (
          <NoteEditor
            key={selectedNote.id}
            note={selectedNote}
            onBack={() => setSelectedNoteId(null)}
          />
        ) : (
          <motion.div
            className="notes-list-view"
            key="notes-list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <header className="app-header">
              <button
                type="button"
                className="icon-button"
                onClick={onBack}
                aria-label="关闭 Notes"
              >
                <ArrowLeft size={22} />
              </button>
              <div>
                <p>Notes</p>
                <span>本地备忘录</span>
              </div>
              <span className="header-mark header-mark--notes">
                <NotebookPen size={19} aria-hidden="true" />
              </span>
            </header>

            <div className="notes-heading">
              <span>
                <h1>备忘录</h1>
                <p>{notes ? `${notes.length} 条记录` : "正在载入…"}</p>
              </span>
              <button type="button" className="add-note-button" onClick={createNote}>
                <Plus size={18} aria-hidden="true" />
                新建
              </button>
            </div>

            <div className="note-list">
              {notes?.map((note) => (
                <div className="note-row" key={note.id}>
                  <button
                    type="button"
                    className="note-row__open"
                    onClick={() => setSelectedNoteId(note.id)}
                  >
                    <strong>{note.title.trim() || "无标题"}</strong>
                    <small>{note.content.trim() || "暂无内容"}</small>
                    <time>{formatDate(note.updatedAt)}</time>
                  </button>
                  <button
                    type="button"
                    className="note-delete-button"
                    onClick={() => contentRepository.deleteNote(note.id)}
                    aria-label={`删除备忘录：${note.title || "无标题"}`}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              ))}
            </div>
            <div className="home-indicator home-indicator--dark" aria-hidden="true" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
