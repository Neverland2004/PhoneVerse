import { type FormEvent, useEffect, useState } from "react";
import { persistPersonaToDisk } from "../../services/personaSync";
import { aiRepository } from "../../services/storage/aiRepository";
import { chatRepository } from "../../services/storage/chatRepository";
import type { Contact } from "../../types/models";

interface ContactProfileEditorProps {
  contact: Contact;
  persona: string;
  onClose: () => void;
}

export function ContactProfileEditor({ contact, persona, onClose }: ContactProfileEditorProps) {
  const [name, setName] = useState(contact.name);
  const [avatar, setAvatar] = useState(contact.avatar);
  const [status, setStatus] = useState(contact.status);
  const [personaDraft, setPersonaDraft] = useState(persona);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setName(contact.name);
    setAvatar(contact.avatar);
    setStatus(contact.status);
    setPersonaDraft(persona);
  }, [contact.id, contact.name, contact.avatar, contact.status, persona]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const nextAvatar = avatar.trim();
      const nextName = name.trim();
      const nextPersona = personaDraft.trim();
      if (!nextAvatar || !nextName) {
        throw new Error("头像和名称不能为空。");
      }
      if (!nextPersona) {
        throw new Error("人设不能为空。");
      }
      if (nextPersona.length > 2000) {
        throw new Error("人设最多 2000 字。");
      }

      await chatRepository.updateContact(contact.id, {
        name: nextName,
        avatar: nextAvatar,
        status: status.trim() || "在线",
      });
      await aiRepository.updateProfile(contact.id, {
        displayName: nextName,
        persona: nextPersona,
      });
      await persistPersonaToDisk({
        contactId: contact.id,
        name: nextName,
        avatar: nextAvatar,
        status: status.trim() || "在线",
        persona: nextPersona,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败，请稍后重试。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="profile-editor-backdrop" role="presentation" onClick={onClose}>
      <form
        className="profile-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-editor-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <header>
          <h2 id="profile-editor-title">编辑联系人</h2>
          <p>点头像改形象与人设；保存后会写入项目 `personas/` 文件夹，清浏览器也不会丢。</p>
        </header>

        <label htmlFor="profile-avatar">头像（一个字或表情）</label>
        <input
          id="profile-avatar"
          value={avatar}
          maxLength={4}
          onChange={(event) => setAvatar(event.target.value)}
          disabled={busy}
        />

        <label htmlFor="profile-name">名称</label>
        <input
          id="profile-name"
          value={name}
          maxLength={20}
          onChange={(event) => setName(event.target.value)}
          disabled={busy}
        />

        <label htmlFor="profile-status">状态</label>
        <input
          id="profile-status"
          value={status}
          maxLength={24}
          onChange={(event) => setStatus(event.target.value)}
          disabled={busy}
        />

        <label htmlFor="profile-persona">人设</label>
        <textarea
          id="profile-persona"
          value={personaDraft}
          maxLength={2000}
          rows={5}
          onChange={(event) => setPersonaDraft(event.target.value)}
          disabled={busy}
          placeholder="例如：你是用户的哥哥，稳重体贴……"
        />

        {error && (
          <p className="profile-editor-error" role="alert">
            {error}
          </p>
        )}

        <div className="profile-editor-actions">
          <button type="button" onClick={onClose} disabled={busy}>
            取消
          </button>
          <button type="submit" className="add-note-button" disabled={busy}>
            保存
          </button>
        </div>
      </form>
    </div>
  );
}
