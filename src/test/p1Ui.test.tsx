import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ContactsList } from "../apps/contacts/ContactsList";
import { NotificationBanner } from "../components/notification/NotificationBanner";
import { db } from "../db/database";
import { chatRepository } from "../services/storage/chatRepository";
import { notificationRepository } from "../services/storage/notificationRepository";
import { usePhoneStore } from "../stores/usePhoneStore";

describe("P1 联系人与通知界面", () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await chatRepository.initialize();
    usePhoneStore.setState({
      isUnlocked: true,
      page: "home",
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

  it("点击联系人进入其独立会话", async () => {
    const onOpenThread = vi.fn();
    render(<ContactsList onBack={vi.fn()} onOpenThread={onOpenThread} />);

    await userEvent.click(await screen.findByRole("button", { name: /妈妈/ }));

    expect(onOpenThread).toHaveBeenCalledWith("thread-mom");
  });

  it("点击通知横幅跳转会话并清除未读", async () => {
    await notificationRepository.deliverIncomingMessage({
      threadId: "thread-mom",
      body: "记得吃饭。",
      isThreadActive: false,
      notificationId: "notification-ui-test",
    });
    render(<NotificationBanner />);

    await userEvent.click(
      await screen.findByRole("button", { name: /打开来自妈妈的消息/ }),
    );

    await waitFor(() => {
      expect(usePhoneStore.getState()).toMatchObject({
        page: "app",
        activeApp: "chat",
        activeThreadId: "thread-mom",
      });
    });
    expect((await chatRepository.getThreadSummary("thread-mom"))?.thread.unreadCount).toBe(0);
    expect(await notificationRepository.getNotification("notification-ui-test")).toMatchObject({
      read: true,
      displayed: true,
    });
  });
});
