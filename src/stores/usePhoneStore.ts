import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PhoneApp = "chat" | "contacts" | "photos" | "notes" | "settings";
export type SystemPage = "lockscreen" | "home" | "app";

interface PhoneState {
  isUnlocked: boolean;
  page: SystemPage;
  activeApp: PhoneApp | null;
  activeThreadId: string | null;
  currentNotificationId: string | null;
  unlock: () => void;
  openApp: (app: PhoneApp) => void;
  closeApp: () => void;
  openThread: (threadId: string) => void;
  openThreadFromNotification: (threadId: string) => void;
  closeThread: () => void;
  setCurrentNotification: (notificationId: string | null) => void;
  resetToLockscreen: () => void;
}

export const usePhoneStore = create<PhoneState>()(
  persist(
    (set) => ({
      isUnlocked: false,
      page: "lockscreen",
      activeApp: null,
      activeThreadId: null,
      currentNotificationId: null,
      unlock: () => set({ isUnlocked: true, page: "home" }),
      openApp: (app) => set({ page: "app", activeApp: app, activeThreadId: null }),
      closeApp: () => set({ page: "home", activeApp: null, activeThreadId: null }),
      openThread: (threadId) => set({ activeThreadId: threadId }),
      openThreadFromNotification: (threadId) =>
        set({ page: "app", activeApp: "chat", activeThreadId: threadId }),
      closeThread: () => set({ activeThreadId: null }),
      setCurrentNotification: (currentNotificationId) => set({ currentNotificationId }),
      resetToLockscreen: () =>
        set({
          isUnlocked: false,
          page: "lockscreen",
          activeApp: null,
          activeThreadId: null,
          currentNotificationId: null,
        }),
    }),
    {
      name: "phoneverse-ui",
      partialize: ({ isUnlocked }) => ({ isUnlocked }),
      merge: (persisted, current) => {
        const restored = persisted as Partial<PhoneState>;
        return {
          ...current,
          isUnlocked: Boolean(restored.isUnlocked),
          page: restored.isUnlocked ? "home" : "lockscreen",
        };
      },
    },
  ),
);
