export interface Contact {
  id: string;
  name: string;
  avatar: string;
  status: string;
  createdAt: number;
}

export interface Thread {
  id: string;
  contactId: string;
  lastMessageAt: number;
  unreadCount: number;
}

export type AIMessageState =
  | "idle"
  | "pending"
  | "completed"
  | "failed"
  | "cancelled";

export interface Message {
  id: string;
  threadId: string;
  sender: "user" | "contact" | "system";
  type: "text";
  content: string;
  createdAt: number;
  status: "sent" | "delivered" | "read";
  replyToMessageId?: string;
  aiState?: AIMessageState;
  aiRequestId?: string;
  errorCode?: string;
}

export interface AppNotification {
  id: string;
  sourceApp: "chat";
  threadId: string;
  title: string;
  body: string;
  createdAt: number;
  read: boolean;
  displayed: boolean;
}

export interface ThreadSummary {
  thread: Thread;
  contact: Contact;
  lastMessage?: Message;
}

export interface ContactWithThread {
  contact: Contact;
  thread: Thread;
}

export interface Photo {
  id: string;
  src: string;
  alt: string;
  createdAt: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface AppSetting {
  key: string;
  value: string;
}

export interface ClientContactAIProfile {
  contactId: string;
  enabled: boolean;
  displayName: string;
  /** 用户可编辑的角色人设，发送聊天时提交给服务端使用 */
  persona: string;
}

export interface AIRequest {
  id: string;
  idempotencyKey: string;
  threadId: string;
  contactId: string;
  userMessageId: string;
  assistantMessageId?: string;
  state: "pending" | "completed" | "failed" | "cancelled";
  retryCount: number;
  createdAt: number;
  updatedAt: number;
  errorCode?: string;
}

export interface AiStatus {
  configured: boolean;
  provider: string;
  model: string;
}
