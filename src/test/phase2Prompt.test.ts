import { describe, expect, it } from "vitest";
import {
  assembleMessages,
  clipByCharBudget,
  filterContextMessages,
} from "../../server/prompts/assemble";
import { getServerContact } from "../../server/prompts/profiles";

describe("Phase 2 Prompt 组装", () => {
  it("过滤非法角色并按预算裁剪上下文", () => {
    const filtered = filterContextMessages(
      [
        { role: "system", content: "hack" },
        { role: "user", content: "第一句" },
        { role: "assistant", content: "回复一" },
        { role: "user", content: "第二句" },
      ],
      20,
    );
    expect(filtered).toEqual([
      { role: "user", content: "第一句" },
      { role: "assistant", content: "回复一" },
      { role: "user", content: "第二句" },
    ]);

    const clipped = clipByCharBudget(
      [
        { role: "user", content: "很长很长的内容AAAAAAAA" },
        { role: "assistant", content: "短" },
      ],
      4,
    );
    expect(clipped).toEqual([{ role: "assistant", content: "短" }]);
  });

  it("只使用前端传入的人设组装提示词", () => {
    const contact = getServerContact("contact-brother");
    expect(contact).toBeTruthy();
    const messages = assembleMessages(
      contact!,
      [{ role: "user", content: "你好" }],
      "今天有点累",
      "你是严厉的教练，说话简短有力。",
    );
    expect(messages[0]?.role).toBe("system");
    expect(messages[1]?.content).toContain("严厉的教练");
    expect(messages[1]?.content).not.toContain("稳重体贴");
    expect(messages.at(-1)).toEqual({ role: "user", content: "今天有点累" });
  });

  it("缺少前端人设时抛错", () => {
    const contact = getServerContact("contact-brother");
    expect(() => assembleMessages(contact!, [], "在吗", "   ")).toThrow("MISSING_PERSONA");
  });
});
