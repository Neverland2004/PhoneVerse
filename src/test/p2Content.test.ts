import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PhoneVerseDatabase } from "../db/database";
import { DemoDataService } from "../services/demoDataService";
import { LocalEventService } from "../services/events/localEventService";
import { ChatRepository } from "../services/storage/chatRepository";
import { ContentRepository } from "../services/storage/contentRepository";
import { NotificationRepository } from "../services/storage/notificationRepository";

describe("P2 内容与重置", () => {
  let database: PhoneVerseDatabase;
  let chats: ChatRepository;
  let content: ContentRepository;
  let notifications: NotificationRepository;

  beforeEach(async () => {
    database = new PhoneVerseDatabase(`phoneverse-p2-test-${crypto.randomUUID()}`);
    chats = new ChatRepository(database);
    content = new ContentRepository(database);
    notifications = new NotificationRepository(database);
    await Promise.all([chats.initialize(), content.initialize()]);
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  it("提供可浏览的内置图片与产品设置", async () => {
    const photos = await content.getPhotos();
    const settings = await content.getSettings();

    expect(photos).toHaveLength(4);
    expect(photos.every(({ src }) => src.startsWith("data:image/svg+xml"))).toBe(true);
    expect(settings).toEqual(
      expect.arrayContaining([
        { key: "productName", value: "PhoneVerse" },
        { key: "version", value: "v0.2" },
      ]),
    );
  });

  it("创建、编辑、删除并持久化纯文本备忘录", async () => {
    const note = await content.createNote();
    await content.updateNote(note.id, { title: "采购清单", content: "牛奶和面包" });

    let notes = await content.getNotes();
    expect(notes.find(({ id }) => id === note.id)).toMatchObject({
      title: "采购清单",
      content: "牛奶和面包",
    });

    await content.deleteNote(note.id);
    notes = await content.getNotes();
    expect(notes.some(({ id }) => id === note.id)).toBe(false);
  });

  it("重置全部业务数据、恢复种子并允许本地事件再次触发", async () => {
    const events = new LocalEventService(notifications);
    const demoData = new DemoDataService(database, events);
    const customNote = await content.createNote();
    await chats.addMessage("thread-brother", "user", "重置前消息");
    await events.triggerNow(null);

    await demoData.reset();

    expect((await chats.getThreadSummaries())).toHaveLength(5);
    expect((await chats.getMessages("thread-brother")).some(({ content }) => content === "重置前消息"))
      .toBe(false);
    expect((await content.getNotes()).some(({ id }) => id === customNote.id)).toBe(false);
    expect(await content.getPhotos()).toHaveLength(4);
    expect(await notifications.getNotifications()).toHaveLength(0);

    await events.triggerNow(null);
    expect(await notifications.getNotifications()).toHaveLength(1);
  });
});
