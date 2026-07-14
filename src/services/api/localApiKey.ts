const STORAGE_KEY = "phoneverse-ai-api-key";

/** 只读用户主动保存过的 key；清除后返回空，不再回填默认值。 */
export function getLocalApiKey(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(STORAGE_KEY)?.trim() ?? "";
}

export function setLocalApiKey(apiKey: string): void {
  const next = apiKey.trim();
  if (!next) {
    clearLocalApiKey();
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, next);
}

export function clearLocalApiKey(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}
