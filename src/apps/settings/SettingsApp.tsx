import { ArrowLeft, RotateCcw, Settings } from "lucide-react";
import { motion } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import { type FormEvent, useEffect, useState } from "react";
import { aiApiClient, AiApiError } from "../../services/api/aiApiClient";
import {
  clearLocalApiKey,
  getLocalApiKey,
  setLocalApiKey,
} from "../../services/api/localApiKey";
import { demoDataService } from "../../services/demoDataService";
import { aiRepository } from "../../services/storage/aiRepository";
import { contentRepository } from "../../services/storage/contentRepository";
import { usePhoneStore } from "../../stores/usePhoneStore";
import type { AiStatus } from "../../types/models";

interface SettingsAppProps {
  onBack: () => void;
}

export function SettingsApp({ onBack }: SettingsAppProps) {
  const settings = useLiveQuery(() => contentRepository.getSettings(), []);
  const resetToLockscreen = usePhoneStore((state) => state.resetToLockscreen);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [aiError, setAiError] = useState("");
  const [apiKeyDraft, setApiKeyDraft] = useState(() => getLocalApiKey());
  const [configBusy, setConfigBusy] = useState(false);
  const [configMessage, setConfigMessage] = useState("");
  const productName =
    settings?.find(({ key }) => key === "productName")?.value ?? "PhoneVerse";
  const version = settings?.find(({ key }) => key === "version")?.value ?? "v0.2";

  const refreshAiStatus = async () => {
    try {
      const status = await aiApiClient.getStatus();
      setAiStatus(status);
      setAiError("");
    } catch (err) {
      setAiStatus(null);
      setAiError(err instanceof AiApiError ? err.message : "无法连接 AI 服务。");
    }
  };

  useEffect(() => {
    setApiKeyDraft(getLocalApiKey());
    let cancelled = false;
    void aiApiClient
      .getStatus()
      .then((status) => {
        if (cancelled) return;
        setAiStatus(status);
        setAiError("");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setAiStatus(null);
        setAiError(err instanceof AiApiError ? err.message : "无法连接 AI 服务。");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaveApiKey = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const apiKey = apiKeyDraft.trim();
    if (!apiKey || configBusy) return;
    setConfigBusy(true);
    setConfigMessage("");
    try {
      setLocalApiKey(apiKey);
      const status = await aiApiClient.configureApiKey(apiKey);
      setAiStatus(status);
      setAiError("");
      setApiKeyDraft(apiKey);
      setConfigMessage("已保存到前端本地，并同步到本机服务端。");
    } catch (err) {
      setConfigMessage(
        err instanceof AiApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "保存失败，请稍后重试。",
      );
    } finally {
      setConfigBusy(false);
    }
  };

  const handleClearApiKey = async () => {
    if (configBusy) return;
    setConfigBusy(true);
    setConfigMessage("");
    try {
      clearLocalApiKey();
      const status = await aiApiClient.clearApiKey();
      setAiStatus(status);
      setAiError("");
      setApiKeyDraft("");
      setConfigMessage("已清除。刷新后也不会再出现（除非你重新保存）。");
    } catch (err) {
      setConfigMessage(err instanceof AiApiError ? err.message : "清除失败，请稍后重试。");
    } finally {
      setConfigBusy(false);
    }
  };

  const resetDemo = async () => {
    try {
      await demoDataService.reset();
      resetToLockscreen();
    } catch {
      setError("重置失败，请稍后重试。");
      setConfirming(false);
    }
  };

  return (
    <motion.section
      className="app-screen settings-screen"
      initial={{ x: "8%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "8%", opacity: 0 }}
      transition={{ duration: 0.22 }}
    >
      <header className="app-header">
        <button type="button" className="icon-button" onClick={onBack} aria-label="关闭 Settings">
          <ArrowLeft size={22} />
        </button>
        <div>
          <p>Settings</p>
          <span>系统设置</span>
        </div>
        <span className="header-mark header-mark--settings">
          <Settings size={19} aria-hidden="true" />
        </span>
      </header>

      <div className="settings-heading">
        <span className="settings-logo">PV</span>
        <h1>{productName}</h1>
        <p>{version}</p>
      </div>

      <section className="settings-card">
        <h2>关于</h2>
        <p>
          一款运行在浏览器中的沉浸式手机模拟器。聊天内容可能发送至第三方模型服务处理，请勿发送敏感信息。
        </p>
        <span>
          <small>当前版本</small>
          <strong>{version}</strong>
        </span>
      </section>

      <section className="settings-card">
        <h2>AI 服务</h2>
        <p>
          API Key 只存在浏览器 localStorage。保存后同步到本机服务端内存（不写文件）；清除后刷新也不会再自动回填。
        </p>
        <span>
          <small>状态</small>
          <strong>
            {aiError
              ? "未连接"
              : aiStatus?.configured
                ? "已配置"
                : aiStatus
                  ? "未配置"
                  : "检查中"}
          </strong>
        </span>
        <span>
          <small>Provider</small>
          <strong>{aiStatus?.provider ?? "—"}</strong>
        </span>
        <span>
          <small>模型</small>
          <strong>{aiStatus?.model ?? "—"}</strong>
        </span>
        {aiError && <p role="alert">{aiError}</p>}

        <form className="settings-key-form" onSubmit={handleSaveApiKey}>
          <label htmlFor="ai-api-key">DeepSeek API Key</label>
          <input
            id="ai-api-key"
            type="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="在此填写或修改 API Key"
            value={apiKeyDraft}
            onChange={(event) => setApiKeyDraft(event.target.value)}
            disabled={configBusy}
          />
          <div className="settings-key-actions">
            <button type="submit" className="add-note-button" disabled={configBusy || !apiKeyDraft.trim()}>
              保存并启用
            </button>
            <button
              type="button"
              className="reset-button"
              disabled={configBusy || (!aiStatus?.configured && !apiKeyDraft.trim())}
              onClick={() => void handleClearApiKey()}
            >
              清除密钥
            </button>
          </div>
        </form>
        {configMessage && <p role="status">{configMessage}</p>}

        <button type="button" className="add-note-button" onClick={() => void refreshAiStatus()}>
          重新检测
        </button>
        <button
          type="button"
          className="reset-button"
          onClick={() => void aiRepository.clearFailedRequests()}
        >
          清理失败请求状态
        </button>
      </section>

      <section className="settings-card settings-card--reset">
        <h2>演示数据</h2>
        <p>清空本地修改并恢复联系人、消息、照片和备忘录种子数据。</p>
        {confirming ? (
          <div className="reset-confirmation" role="group" aria-label="确认重置演示数据">
            <button type="button" onClick={() => setConfirming(false)}>
              取消
            </button>
            <button type="button" className="danger-button" onClick={resetDemo}>
              确认重置
            </button>
          </div>
        ) : (
          <button type="button" className="reset-button" onClick={() => setConfirming(true)}>
            <RotateCcw size={17} aria-hidden="true" />
            重置演示数据
          </button>
        )}
        {error && <p role="alert">{error}</p>}
      </section>
      <div className="home-indicator home-indicator--dark" aria-hidden="true" />
    </motion.section>
  );
}
