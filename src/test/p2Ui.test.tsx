import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotesApp } from "../apps/notes/NotesApp";
import { PhotosApp } from "../apps/photos/PhotosApp";
import { SettingsApp } from "../apps/settings/SettingsApp";
import { db } from "../db/database";
import { chatRepository } from "../services/storage/chatRepository";
import { contentRepository } from "../services/storage/contentRepository";
import { usePhoneStore } from "../stores/usePhoneStore";

describe("P2 应用界面", () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await Promise.all([chatRepository.initialize(), contentRepository.initialize()]);
    usePhoneStore.setState({
      isUnlocked: true,
      page: "app",
      activeApp: null,
      activeThreadId: null,
      currentNotificationId: null,
    });
  });

  afterEach(async () => {
    cleanup();
    db.close();
    await db.delete();
  });

  it("浏览并关闭内置图片预览", async () => {
    render(<PhotosApp onBack={vi.fn()} />);

    await userEvent.click(await screen.findByRole("button", { name: /预览：暖色晨曦/ }));
    expect(screen.getByRole("dialog", { name: /暖色晨曦/ })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "关闭图片预览" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("通过界面创建、编辑和删除备忘录", async () => {
    render(<NotesApp onBack={vi.fn()} />);

    await userEvent.click(await screen.findByRole("button", { name: "新建" }));
    const title = await screen.findByRole("textbox", { name: "备忘录标题" });
    const body = await screen.findByRole("textbox", { name: "备忘录内容" });
    await userEvent.clear(title);
    await userEvent.type(title, "测试记录");
    await userEvent.type(body, "自动保存内容");

    await waitFor(async () => {
      expect((await contentRepository.getNotes()).find(({ title }) => title === "测试记录"))
        .toMatchObject({ content: "自动保存内容" });
    });

    await userEvent.click(screen.getByRole("button", { name: "返回备忘录列表" }));
    await userEvent.click(
      await screen.findByRole("button", { name: "删除备忘录：测试记录" }),
    );
    await waitFor(async () => {
      expect((await contentRepository.getNotes()).some(({ title }) => title === "测试记录"))
        .toBe(false);
    });
  });

  it("设置页重置演示数据并返回锁屏", async () => {
    await contentRepository.createNote();
    render(<SettingsApp onBack={vi.fn()} />);

    expect((await screen.findAllByText("v0.2")).length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole("button", { name: "重置演示数据" }));
    await userEvent.click(screen.getByRole("button", { name: "确认重置" }));

    await waitFor(() => {
      expect(usePhoneStore.getState()).toMatchObject({
        isUnlocked: false,
        page: "lockscreen",
        activeApp: null,
      });
    });
    expect(await contentRepository.getNotes()).toHaveLength(1);
    expect(await chatRepository.getThreadSummaries()).toHaveLength(5);
  });
});
