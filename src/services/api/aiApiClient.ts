import type { AiStatus } from "../../types/models";

const SESSION_KEY = "phoneverse-anonymous-session";

const API_BASE = ((import.meta.env.VITE_API_BASE as string | undefined) ?? "").replace(/\/$/, "");

const apiUrl = (path: string) => `${API_BASE}${path}`;

export class AiApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "AiApiError";
  }
}

interface SessionResponse {
  token: string;
  expiresAt: number;
}

interface ChatSuccess {
  requestId: string;
  messageId: string;
  content: string;
  provider: string;
  model: string;
  threadId: string;
  contactId: string;
  userMessageId: string;
}

interface ErrorBody {
  error?: { code?: string; message?: string };
}

const networkError = () =>
  new AiApiError(
    "无法连接 AI 服务。请确认已运行 npm run dev:all，并用 http://127.0.0.1:5173 打开页面。",
    "NETWORK_ERROR",
  );

const readError = async (response: Response) => {
  const payload = (await response.json().catch(() => ({}))) as ErrorBody;
  return new AiApiError(
    payload.error?.message ?? "AI 服务暂时不可用。",
    payload.error?.code ?? "NETWORK_ERROR",
  );
};

export class AiApiClient {
  /** 不用 TS private 字段，避免 Vite HMR 后旧实例读字段直接崩。 */
  fetchImpl: typeof fetch;
  token: string | null = null;

  constructor(fetchImpl: typeof fetch = globalThis.fetch.bind(globalThis)) {
    this.fetchImpl = fetchImpl;
  }

  private request(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    try {
      if (typeof this.fetchImpl === "function") {
        return this.fetchImpl(input, init);
      }
    } catch {
      // ignore broken instance after HMR
    }
    return globalThis.fetch(input, init);
  }

  async getStatus(): Promise<AiStatus> {
    let response: Response;
    try {
      response = await this.request(apiUrl("/api/ai/status"));
    } catch {
      throw networkError();
    }
    if (!response.ok) throw await readError(response);
    return (await response.json()) as AiStatus;
  }

  async configureApiKey(apiKey: string): Promise<AiStatus> {
    let response: Response;
    try {
      response = await this.request(apiUrl("/api/ai/config"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
    } catch {
      throw networkError();
    }
    if (!response.ok) throw await readError(response);
    return (await response.json()) as AiStatus;
  }

  async clearApiKey(): Promise<AiStatus> {
    let response: Response;
    try {
      response = await this.request(apiUrl("/api/ai/config"), { method: "DELETE" });
    } catch {
      throw networkError();
    }
    if (!response.ok) throw await readError(response);
    return (await response.json()) as AiStatus;
  }

  async listPersonas(): Promise<
    Array<{
      contactId: string;
      name: string;
      avatar: string;
      status: string;
      persona: string;
      updatedAt: number;
    }>
  > {
    let response: Response;
    try {
      response = await this.request(apiUrl("/api/personas"));
    } catch {
      throw networkError();
    }
    if (!response.ok) throw await readError(response);
    const payload = (await response.json()) as {
      items?: Array<{
        contactId: string;
        name: string;
        avatar: string;
        status: string;
        persona: string;
        updatedAt: number;
      }>;
    };
    return payload.items ?? [];
  }

  async savePersona(input: {
    contactId: string;
    name: string;
    avatar: string;
    status: string;
    persona: string;
  }): Promise<void> {
    let response: Response;
    try {
      response = await this.request(apiUrl(`/api/personas/${encodeURIComponent(input.contactId)}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: input.name,
          avatar: input.avatar,
          status: input.status,
          persona: input.persona,
        }),
      });
    } catch {
      throw networkError();
    }
    if (!response.ok) throw await readError(response);
  }

  async ensureSession(): Promise<string> {
    if (this.token) return this.token;
    const cached = localStorage.getItem(SESSION_KEY);
    if (cached) {
      this.token = cached;
      return cached;
    }

    let response: Response;
    try {
      response = await this.request(apiUrl("/api/session/anonymous"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
    } catch {
      throw networkError();
    }
    if (!response.ok) throw await readError(response);
    const payload = (await response.json()) as SessionResponse;
    this.token = payload.token;
    localStorage.setItem(SESSION_KEY, payload.token);
    return payload.token;
  }

  async chat(input: {
    threadId: string;
    contactId: string;
    messageId: string;
    attempt: number;
    context: Array<{ role: "user" | "assistant"; content: string }>;
    message: { role: "user"; content: string };
    persona?: string;
  }): Promise<ChatSuccess> {
    const token = await this.ensureSession();
    let response: Response;
    try {
      response = await this.request(apiUrl("/api/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...input,
          anonymousSessionToken: token,
        }),
      });
    } catch {
      throw networkError();
    }

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem(SESSION_KEY);
        this.token = null;
      }
      throw await readError(response);
    }

    return (await response.json()) as ChatSuccess;
  }

  clearSession() {
    this.token = null;
    localStorage.removeItem(SESSION_KEY);
  }
}

export let aiApiClient = new AiApiClient();

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    aiApiClient = new AiApiClient();
  });
}
