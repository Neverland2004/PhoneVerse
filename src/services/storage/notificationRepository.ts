import { db, type PhoneVerseDatabase } from "../../db/database";
import type { AppNotification, Message } from "../../types/models";

const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

interface IncomingMessage {
  threadId: string;
  body: string;
  isThreadActive: boolean;
  notificationId?: string;
  messageId?: string;
  replyToMessageId?: string;
}

export class NotificationRepository {
  constructor(private readonly database: PhoneVerseDatabase = db) {}

  hasNotification(id: string): Promise<boolean> {
    return this.database.notifications.get(id).then(Boolean);
  }

  getNotification(id: string): Promise<AppNotification | undefined> {
    return this.database.notifications.get(id);
  }

  getNotifications(): Promise<AppNotification[]> {
    return this.database.notifications.orderBy("createdAt").toArray();
  }

  async getUndisplayedNotifications(): Promise<AppNotification[]> {
    const notifications = await this.database.notifications.orderBy("createdAt").toArray();
    return notifications.filter(({ displayed, read }) => !displayed && !read);
  }

  markDisplayed(id: string): Promise<number> {
    return this.database.notifications.update(id, { displayed: true });
  }

  async deliverIncomingMessage({
    threadId,
    body,
    isThreadActive,
    notificationId = createId("notification"),
    messageId = createId("message"),
    replyToMessageId,
  }: IncomingMessage): Promise<AppNotification | undefined> {
    const [thread, existingNotification, existingMessage] = await Promise.all([
      this.database.threads.get(threadId),
      this.database.notifications.get(notificationId),
      this.database.messages.get(messageId),
    ]);
    if (!thread || existingNotification || existingMessage) return existingNotification;

    const contact = await this.database.contacts.get(thread.contactId);
    if (!contact) throw new Error(`联系人不存在：${thread.contactId}`);

    const createdAt = Date.now();
    const message: Message = {
      id: messageId,
      threadId,
      sender: "contact",
      type: "text",
      content: body,
      createdAt,
      status: isThreadActive ? "read" : "delivered",
      replyToMessageId,
    };
    const notification: AppNotification = {
      id: notificationId,
      sourceApp: "chat",
      threadId,
      title: contact.name,
      body,
      createdAt,
      read: isThreadActive,
      displayed: isThreadActive,
    };

    await this.database.transaction(
      "rw",
      [this.database.messages, this.database.threads, this.database.notifications],
      async () => {
        await this.database.messages.add(message);
        await this.database.threads.update(threadId, {
          lastMessageAt: createdAt,
          unreadCount: isThreadActive ? thread.unreadCount : thread.unreadCount + 1,
        });
        await this.database.notifications.add(notification);
      },
    );

    return notification;
  }

  async markThreadRead(threadId: string): Promise<void> {
    await this.database.transaction(
      "rw",
      [this.database.messages, this.database.threads, this.database.notifications],
      async () => {
        await this.database.threads.update(threadId, { unreadCount: 0 });
        await this.database.notifications.where("threadId").equals(threadId).modify({ read: true });
        await this.database.messages
          .where("threadId")
          .equals(threadId)
          .modify((message) => {
            if (message.sender !== "user") message.status = "read";
          });
      },
    );
  }

  async openNotification(id: string): Promise<string | undefined> {
    const notification = await this.database.notifications.get(id);
    if (!notification) return undefined;
    await this.markThreadRead(notification.threadId);
    return notification.threadId;
  }
}

export const notificationRepository = new NotificationRepository();
