import { ArrowLeft, Check } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { contentRepository } from "../../services/storage/contentRepository";
import type { Note } from "../../types/models";

interface NoteEditorProps {
  note: Note;
  onBack: () => void;
}

export function NoteEditor({ note, onBack }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);

  const save = (nextTitle: string, nextContent: string) => {
    void contentRepository.updateNote(note.id, {
      title: nextTitle,
      content: nextContent,
    });
  };

  return (
    <motion.section
      className="note-editor"
      initial={{ x: "12%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "8%", opacity: 0 }}
      transition={{ duration: 0.22 }}
    >
      <header className="note-editor__header">
        <button type="button" className="icon-button" onClick={onBack} aria-label="返回备忘录列表">
          <ArrowLeft size={22} />
        </button>
        <span>
          <Check size={14} aria-hidden="true" />
          自动保存
        </span>
      </header>
      <label className="sr-only" htmlFor="note-title">
        备忘录标题
      </label>
      <input
        id="note-title"
        className="note-title-input"
        value={title}
        onChange={(event) => {
          const nextTitle = event.target.value;
          setTitle(nextTitle);
          save(nextTitle, content);
        }}
        placeholder="标题"
      />
      <label className="sr-only" htmlFor="note-content">
        备忘录内容
      </label>
      <textarea
        id="note-content"
        className="note-content-input"
        value={content}
        onChange={(event) => {
          const nextContent = event.target.value;
          setContent(nextContent);
          save(title, nextContent);
        }}
        placeholder="开始记录…"
        autoFocus
      />
      <div className="home-indicator home-indicator--dark" aria-hidden="true" />
    </motion.section>
  );
}
