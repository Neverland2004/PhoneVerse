# PhoneVerse Phase 2 阶段汇报

## 已完成内容

- BFF（Fastify + TypeScript）：
  - `POST /api/session/anonymous`：匿名会话
  - `POST /api/chat`：校验、限流、幂等、人设组装、Provider 调用
  - `GET /api/ai/status`：是否配置 / Provider / 模型
- Provider：DeepSeek OpenAI 兼容封装，密钥仅服务端环境变量
- 人设：5 位联系人独立 System Prompt（权威在服务端）
- 前端：
  - 移除本地模拟回复；Chat 经 BFF 请求 AI
  - AI 未配置/未连接时禁用输入与发送
  - 失败可手动重试；刷新后 pending → `REQUEST_INTERRUPTED`
  - Settings 展示 AI 状态，不暴露密钥
- 数据：Dexie v4 新增 `aiRequests`、`contactAIProfiles`
- 版本展示：Settings / 种子数据 → `v0.2`

## 主要文件

- 服务端：`server/**`、`.env.example`、`docs/phase2/PHASE_2_DEPLOY.md`
- 前端 API / 存储：`src/services/api/aiApiClient.ts`、`src/services/storage/aiRepository.ts`、`src/services/chatService.ts`
- UI：`ConversationView.tsx`、`SettingsApp.tsx`
- 测试：`src/test/phase2Ai.test.ts`、`src/test/phase2Prompt.test.ts`（Mock，不打真实模型）

## 检查和构建结果

- `npm run lint`：通过
- `npm run test`：通过，7 个文件 / 20 项
- `npm run build`：通过

## 验收

- [x] 无本地/预设/降级回复路径
- [x] 密钥不进前端与构建产物
- [x] 上下文裁剪与 Prompt 组装有单测
- [x] 失败、中断、幂等、只读降级有覆盖
- [x] v0.1 功能（除本地回复）保留
- [ ] 配置真实 `AI_API_KEY` 后人工联调（需本地 `.env`）

## 本地启动

```bash
copy .env.example .env
# 填写 AI_API_KEY
npm run dev:all
```

前端 `http://localhost:5173/`，BFF `http://127.0.0.1:8787`。

## 已知说明

- 未配置密钥时 Chat 只读是预期行为。
- 首次解锁后妈妈的本地事件消息仍保留（非 AI 回复）。
- Phase 2 不含账号、云同步、模板商城、剧情。
