import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PhoneVerseDatabase } from "../db/database";
import { ChatRepository } from "../services/storage/chatRepository";

describe("Phase 2 本地数据回归", () => {
  let database: PhoneVerseDatabase;
  let repository: ChatRepository;

  beforeEach(() => {
    database = new PhoneVerseDatabase(`phoneverse-phase2-seed-${crypto.randomUUID()}`);
    repository = new ChatRepository(database);
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  it("初始化哥哥会话与欢迎消息", async () => {
    await repository.initialize();
    const summaries = await repository.getThreadSummaries();
    expect(summaries).toHaveLength(5);
    const brother = summaries.find(({ contact }) => contact.name === "哥哥");
    expect(brother?.lastMessage?.content).toBe("到家后告诉我一声。");
  });

  it("持久化用户消息且不自动生成本地回复", async () => {
    await repository.initialize();
    await repository.addMessage("thread-brother", "user", "我到家了");
    const messages = await repository.getMessages("thread-brother");
    expect(messages.at(-1)).toMatchObject({ sender: "user", content: "我到家了" });
    expect(messages.filter(({ sender }) => sender === "contact").at(-1)?.content).toBe(
      "到家后告诉我一声。",
    );
  });
});
