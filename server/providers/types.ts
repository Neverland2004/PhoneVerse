export interface AIChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIChatRequest {
  messages: AIChatMessage[];
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface AIChatResult {
  content: string;
  provider: string;
  model: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

export interface AIProvider {
  generateReply(request: AIChatRequest): Promise<AIChatResult>;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly code:
      | "PROVIDER_ERROR"
      | "EMPTY_RESPONSE"
      | "REQUEST_TIMEOUT"
      | "AI_NOT_CONFIGURED"
      | "RATE_LIMITED" = "PROVIDER_ERROR",
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
