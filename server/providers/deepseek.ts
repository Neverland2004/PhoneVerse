import { serverConfig } from "../config/env";
import { ProviderError, type AIChatRequest, type AIChatResult, type AIProvider } from "./types";

interface OpenAICompatibleResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export class DeepSeekProvider implements AIProvider {
  async generateReply(request: AIChatRequest): Promise<AIChatResult> {
    if (!serverConfig.apiKey.trim()) {
      throw new ProviderError("AI 服务未配置。", "AI_NOT_CONFIGURED");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), serverConfig.requestTimeoutMs);
    const onAbort = () => controller.abort();
    request.signal?.addEventListener("abort", onAbort);

    try {
      const response = await fetch(`${serverConfig.baseUrl.replace(/\/$/, "")}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serverConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: serverConfig.model,
          messages: request.messages,
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? 220,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new ProviderError(
          response.status === 429 ? "请求过于频繁，请稍后再试。" : "AI 回复暂时不可用。",
          response.status === 429 ? "RATE_LIMITED" : "PROVIDER_ERROR",
        );
      }

      const payload = (await response.json()) as OpenAICompatibleResponse;
      const content = payload.choices?.[0]?.message?.content?.trim() ?? "";
      if (!content) {
        throw new ProviderError("AI 返回了空内容。", "EMPTY_RESPONSE");
      }

      return {
        content,
        provider: serverConfig.provider,
        model: serverConfig.model,
        usage: {
          inputTokens: payload.usage?.prompt_tokens,
          outputTokens: payload.usage?.completion_tokens,
          totalTokens: payload.usage?.total_tokens,
        },
      };
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new ProviderError("AI 请求超时。", "REQUEST_TIMEOUT");
      }
      throw new ProviderError("AI 回复暂时不可用。", "PROVIDER_ERROR");
    } finally {
      clearTimeout(timeout);
      request.signal?.removeEventListener("abort", onAbort);
    }
  }
}

export const createProvider = (): AIProvider => new DeepSeekProvider();
