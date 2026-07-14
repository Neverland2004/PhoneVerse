import { seedNotes, seedPhotos, seedSettings } from "../../data/seed/contentSeed";
import { db, type PhoneVerseDatabase } from "../../db/database";
import type { AppSetting, Note, Photo } from "../../types/models";

const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export class ContentRepository {
  constructor(private readonly database: PhoneVerseDatabase = db) {}

  async initialize(): Promise<void> {
    await this.database.transaction(
      "rw",
      [this.database.photos, this.database.notes, this.database.settings],
      async () => {
        const [photos, notes, settings] = await Promise.all([
          this.database.photos.bulkGet(seedPhotos.map(({ id }) => id)),
          this.database.notes.bulkGet(seedNotes.map(({ id }) => id)),
          this.database.settings.bulkGet(seedSettings.map(({ key }) => key)),
        ]);
        const missingPhotos = seedPhotos.filter((_, index) => !photos[index]);
        const missingNotes = seedNotes.filter((_, index) => !notes[index]);
        const missingSettings = seedSettings.filter((_, index) => !settings[index]);

        if (missingPhotos.length) await this.database.photos.bulkAdd(missingPhotos);
        if (missingNotes.length) await this.database.notes.bulkAdd(missingNotes);
        if (missingSettings.length) await this.database.settings.bulkAdd(missingSettings);
      },
    );
  }

  getPhotos(): Promise<Photo[]> {
    return this.database.photos.orderBy("createdAt").reverse().toArray();
  }

  getNotes(): Promise<Note[]> {
    return this.database.notes.orderBy("updatedAt").reverse().toArray();
  }

  getSettings(): Promise<AppSetting[]> {
    return this.database.settings.toArray();
  }

  async createNote(): Promise<Note> {
    const now = Date.now();
    const note: Note = {
      id: createId("note"),
      title: "新备忘录",
      content: "",
      createdAt: now,
      updatedAt: now,
    };
    await this.database.notes.add(note);
    return note;
  }

  updateNote(id: string, changes: Pick<Note, "title" | "content">): Promise<number> {
    return this.database.notes.update(id, { ...changes, updatedAt: Date.now() });
  }

  deleteNote(id: string): Promise<void> {
    return this.database.notes.delete(id);
  }
}

export const contentRepository = new ContentRepository();
