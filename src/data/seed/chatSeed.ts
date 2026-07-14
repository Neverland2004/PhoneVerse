import type { Contact, Message, Thread } from "../../types/models";

const seedTime = new Date("2026-07-14T08:30:00").getTime();

export const seedContacts: Contact[] = [
  {
    id: "contact-brother",
    name: "哥哥",
    avatar: "哥",
    status: "在线",
    createdAt: seedTime,
  },
  {
    id: "contact-mom",
    name: "妈妈",
    avatar: "妈",
    status: "刚刚在线",
    createdAt: seedTime + 1,
  },
  {
    id: "contact-sister",
    name: "妹妹",
    avatar: "妹",
    status: "在线",
    createdAt: seedTime + 2,
  },
  {
    id: "contact-classmate",
    name: "同学",
    avatar: "同",
    status: "离线",
    createdAt: seedTime + 3,
  },
  {
    id: "contact-assistant",
    name: "AI 助手",
    avatar: "助",
    status: "本地演示",
    createdAt: seedTime + 4,
  },
];

export const seedThreads: Thread[] = [
  {
    id: "thread-brother",
    contactId: "contact-brother",
    lastMessageAt: seedTime,
    unreadCount: 1,
  },
  {
    id: "thread-mom",
    contactId: "contact-mom",
    lastMessageAt: seedTime - 60_000,
    unreadCount: 0,
  },
  {
    id: "thread-sister",
    contactId: "contact-sister",
    lastMessageAt: seedTime - 120_000,
    unreadCount: 0,
  },
  {
    id: "thread-classmate",
    contactId: "contact-classmate",
    lastMessageAt: seedTime - 180_000,
    unreadCount: 0,
  },
  {
    id: "thread-assistant",
    contactId: "contact-assistant",
    lastMessageAt: seedTime - 240_000,
    unreadCount: 0,
  },
];

export const seedMessages: Message[] = [
  {
    id: "message-welcome",
    threadId: "thread-brother",
    sender: "contact",
    type: "text",
    content: "到家后告诉我一声。",
    createdAt: seedTime,
    status: "delivered",
  },
  {
    id: "message-mom-welcome",
    threadId: "thread-mom",
    sender: "contact",
    type: "text",
    content: "今天记得按时吃饭。",
    createdAt: seedTime - 60_000,
    status: "read",
  },
  {
    id: "message-sister-welcome",
    threadId: "thread-sister",
    sender: "contact",
    type: "text",
    content: "周末一起出去玩吗？",
    createdAt: seedTime - 120_000,
    status: "read",
  },
  {
    id: "message-classmate-welcome",
    threadId: "thread-classmate",
    sender: "contact",
    type: "text",
    content: "作业我发到群里啦。",
    createdAt: seedTime - 180_000,
    status: "read",
  },
  {
    id: "message-assistant-welcome",
    threadId: "thread-assistant",
    sender: "system",
    type: "text",
    content: "你好，我是本地演示助手。",
    createdAt: seedTime - 240_000,
    status: "read",
  },
];
