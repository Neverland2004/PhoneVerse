import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PhoneVerseDatabase } from "../db/database";
import {
  FIRST_UNLOCK_EVENT_ID,
  LocalEventService,
} from "../services/events/localEventService";
import { ChatRepository } from "../services/storage/chatRepository";
import { NotificationRepository } from "../services/storage/notificationRepository";

describe("P1 联系人与通知", () => {
  let databaseName: string;
  let database: PhoneVerseDatabase;
  let chats: ChatRepository;
  let notifications: NotificationRepository;

  beforeEach(async () => {
    databaseName = `phoneverse-p1-test-${crypto.randomUUID()}`;
    database = new PhoneVerseDatabase(databaseName);
    chats = new ChatRepository(database);
    notifications = new NotificationRepository(database);
    await chats.initialize();
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  it("为每位联系人建立唯一的默认会话", async () => {
    const contacts = await chats.getContactsWithThreads();

    expect(contacts.map(({ contact }) => contact.name)).toEqual(
      expect.arrayContaining(["哥哥", "妈妈", "妹妹", "同学", "AI 助手"]),
    );
    expect(contacts).toHaveLength(5);
    expect(new Set(contacts.map(({ thread }) => thread.id)).size).toBe(5);
    expect(new Set(contacts.map(({ thread }) => thread.contactId)).size).toBe(5);
  });

  it("非当前会话的新消息生成通知，并在打开后同步已读状态", async () => {
    const notification = await notifications.deliverIncomingMessage({
      threadId: "thread-mom",
      body: "记得吃饭。",
      isThreadActive: false,
      notificationId: "notification-test",
    });

    let summary = await chats.getThreadSummary("thread-mom");
    expect(summary?.thread.unreadCount).toBe(1);
    expect(notification).toMatchObject({ read: false, displayed: false });
    expect(await notifications.getUndisplayedNotifications()).toHaveLength(1);

    await notifications.markDisplayed("notification-test");
    await notifications.openNotification("notification-test");

    summary = await chats.getThreadSummary("thread-mom");
    const storedNotification = await notifications.getNotification("notification-test");
    const messages = await chats.getMessages("thread-mom");
    expect(summary?.thread.unreadCount).toBe(0);
    expect(storedNotification).toMatchObject({ read: true, displayed: true });
    expect(messages.at(-1)).toMatchObject({ content: "记得吃饭。", status: "read" });
  });

  it("当前会话仅追加消息且不进入通知横幅队列", async () => {
    await notifications.deliverIncomingMessage({
      threadId: "thread-sister",
      body: "我看到啦。",
      isThreadActive: true,
      notificationId: "notification-active",
    });

    const summary = await chats.getThreadSummary("thread-sister");
    const notification = await notifications.getNotification("notification-active");
    expect(summary?.thread.unreadCount).toBe(0);
    expect(notification).toMatchObject({ read: true, displayed: true });
    expect(await notifications.getUndisplayedNotifications()).toHaveLength(0);
  });

  it("本地事件只触发一次，刷新后消息、通知和未读数仍保留", async () => {
    const events = new LocalEventService(notifications);
    await events.triggerNow(null);
    await events.triggerNow(null);

    expect(await notifications.getNotifications()).toHaveLength(1);
    expect(await notifications.hasNotification(FIRST_UNLOCK_EVENT_ID)).toBe(true);

    database.close();
    database = new PhoneVerseDatabase(databaseName);
    chats = new ChatRepository(database);
    notifications = new NotificationRepository(database);

    const summary = await chats.getThreadSummary("thread-mom");
    const stored = await notifications.getNotification(FIRST_UNLOCK_EVENT_ID);
    const messages = await chats.getMessages("thread-mom");
    expect(summary?.thread.unreadCount).toBe(1);
    expect(stored).toMatchObject({ read: false, displayed: false });
    expect(messages.at(-1)?.content).toBe("晚饭记得按时吃，别忙忘了。");
  });
});
