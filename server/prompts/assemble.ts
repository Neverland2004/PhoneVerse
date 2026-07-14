import { PRODUCT_SAFETY_PROMPT, type ServerContactMeta } from "./profiles";
import type { AIChatMessage } from "../providers/types";

export interface ContextMessage {
  role: "user" | "assistant";
  content: string;
}

const normalize = (content: string) => content.trim();

export function filterContextMessages(
  context: unknown,
  maxMessages: number,
): ContextMessage[] {
  if (!Array.isArray(context)) return [];
  return context
    .filter(
      (item): item is ContextMessage =>
        Boolean(item) &&
        typeof item === "object" &&
        (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string" &&
        normalize(item.content).length > 0,
    )
    .map((item) => ({ role: item.role, content: normalize(item.content) }))
    .slice(-maxMessages);
}

export function clipByCharBudget(
  messages: ContextMessage[],
  maxChars: number,
): ContextMessage[] {
  const result: ContextMessage[] = [];
  let used = 0;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    const next = used + message.content.length;
    if (next > maxChars && result.length > 0) break;
    result.unshift(message);
    used = next;
  }
  return result;
}

export function sanitizePersona(persona: unknown, maxChars = 2000): string {
  if (typeof persona !== "string") return "";
  return persona.trim().slice(0, maxChars);
}

/** 人设提示词只使用前端传入的 persona，后端不再写死人设。 */
export function assembleMessages(
  contact: ServerContactMeta,
  context: ContextMessage[],
  userMessage: string,
  personaFromClient: string,
): AIChatMessage[] {
  const persona = sanitizePersona(personaFromClient);
  if (!persona) {
    throw new Error("MISSING_PERSONA");
  }

  const rolePrompt = `你现在扮演「${contact.displayName}」。严格按下列用户人设进行回复：\n${persona}`;

  return [
    { role: "system", content: PRODUCT_SAFETY_PROMPT },
    { role: "system", content: rolePrompt },
    ...context,
    { role: "user", content: normalize(userMessage) },
  ];
}
