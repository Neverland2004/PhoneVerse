import Dexie from "dexie";
import { db, type PhoneVerseDatabase } from "../../db/database";
import { seedContacts, seedMessages, seedThreads } from "../../data/seed/chatSeed";
import type { ContactWithThread, Message, ThreadSummary } from "../../types/models";

const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export class ChatRepository {
  constructor(private readonly database: PhoneVerseDatabase = db) {}

  async initialize(): Promise<void> {
    await this.database.transaction(
      "rw",
      [this.database.contacts, this.database.threads, this.database.messages],
      async () => {
        const [contacts, threads, messages] = await Promise.all([
          this.database.contacts.bulkGet(seedContacts.map(({ id }) => id)),
          this.database.threads.bulkGet(seedThreads.map(({ id }) => id)),
          this.database.messages.bulkGet(seedMessages.map(({ id }) => id)),
        ]);

        const missingContacts = seedContacts.filter((_, index) => !contacts[index]);
        const missingThreads = seedThreads.filter((_, index) => !threads[index]);
        const missingMessages = seedMessages.filter((_, index) => !messages[index]);

        if (missingContacts.length) await this.database.contacts.bulkAdd(missingContacts);
        if (missingThreads.length) await this.database.threads.bulkAdd(missingThreads);
        if (missingMessages.length) await this.database.messages.bulkAdd(missingMessages);
      },
    );
  }

  async getContactsWithThreads(): Promise<ContactWithThread[]> {
    const contacts = await this.database.contacts.orderBy("name").toArray();
    const entries = await Promise.all(
      contacts.map(async (contact) => {
        const thread = await this.database.threads.where("contactId").equals(contact.id).first();
        return thread ? { contact, thread } : undefined;
      }),
    );
    return entries.filter((entry): entry is ContactWithThread => Boolean(entry));
  }

  async getThreadSummaries(): Promise<ThreadSummary[]> {
    const threads = await this.database.threads.orderBy("lastMessageAt").reverse().toArray();

    return Promise.all(
      threads.map(async (thread) => {
        const [contact, lastMessage] = await Promise.all([
          this.database.contacts.get(thread.contactId),
          this.database.messages
            .where("[threadId+createdAt]")
            .between([thread.id, Dexie.minKey], [thread.id, Dexie.maxKey])
            .last(),
        ]);

        if (!contact) throw new Error(`联系人不存在：${thread.contactId}`);
        return { thread, contact, lastMessage };
      }),
    );
  }

  async getThreadSummary(threadId: string): Promise<ThreadSummary | undefined> {
    const thread = await this.database.threads.get(threadId);
    if (!thread) return undefined;
    const contact = await this.database.contacts.get(thread.contactId);
    if (!contact) return undefined;
    const lastMessage = await this.database.messages
      .where("[threadId+createdAt]")
      .between([thread.id, Dexie.minKey], [thread.id, Dexie.maxKey])
      .last();
    return { thread, contact, lastMessage };
  }

  getMessages(threadId: string): Promise<Message[]> {
    return this.database.messages
      .where("[threadId+createdAt]")
      .between([threadId, Dexie.minKey], [threadId, Dexie.maxKey])
      .toArray();
  }

  async addMessage(
    threadId: string,
    sender: Message["sender"],
    content: string,
  ): Promise<Message> {
    const message: Message = {
      id: createId("message"),
      threadId,
      sender,
      type: "text",
      content,
      createdAt: Date.now(),
      status: sender === "user" ? "sent" : "delivered",
    };

    await this.database.transaction(
      "rw",
      [this.database.messages, this.database.threads],
      async () => {
        await this.database.messages.add(message);
        await this.database.threads.update(threadId, { lastMessageAt: message.createdAt });
      },
    );
    return message;
  }

  async updateContact(
    contactId: string,
    patch: { name?: string; avatar?: string; status?: string },
  ): Promise<void> {
    const updates: { name?: string; avatar?: string; status?: string } = {};
    if (patch.name !== undefined) {
      const name = patch.name.trim();
      if (!name) throw new Error("名称不能为空。");
      updates.name = name.slice(0, 20);
    }
    if (patch.avatar !== undefined) {
      const avatar = patch.avatar.trim();
      if (!avatar) throw new Error("头像不能为空。");
      updates.avatar = [...avatar][0] ?? avatar.slice(0, 2);
    }
    if (patch.status !== undefined) {
      updates.status = patch.status.trim().slice(0, 24) || "在线";
    }
    await this.database.contacts.update(contactId, updates);
  }
}

export const chatRepository = new ChatRepository();
