import Dexie, { type EntityTable } from "dexie";
import type {
  AIRequest,
  AppNotification,
  AppSetting,
  ClientContactAIProfile,
  Contact,
  Message,
  Note,
  Photo,
  Thread,
} from "../types/models";

export class PhoneVerseDatabase extends Dexie {
  contacts!: EntityTable<Contact, "id">;
  threads!: EntityTable<Thread, "id">;
  messages!: EntityTable<Message, "id">;
  notifications!: EntityTable<AppNotification, "id">;
  photos!: EntityTable<Photo, "id">;
  notes!: EntityTable<Note, "id">;
  settings!: EntityTable<AppSetting, "key">;
  aiRequests!: EntityTable<AIRequest, "id">;
  contactAIProfiles!: EntityTable<ClientContactAIProfile, "contactId">;

  constructor(name = "phoneverse") {
    super(name);
    this.version(1).stores({
      contacts: "id, name",
      threads: "id, contactId, lastMessageAt",
      messages: "id, threadId, createdAt, [threadId+createdAt]",
    });
    this.version(2).stores({
      threads: "id, &contactId, lastMessageAt",
      notifications: "id, threadId, createdAt",
    });
    this.version(3).stores({
      photos: "id, createdAt",
      notes: "id, updatedAt",
      settings: "key",
    });
    this.version(4).stores({
      aiRequests: "id, &userMessageId, threadId, state, updatedAt",
      contactAIProfiles: "contactId",
    });
  }
}

export const db = new PhoneVerseDatabase();
