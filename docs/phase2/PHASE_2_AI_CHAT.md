# PhoneVerse Phase 2：AI 聊天需求与开发说明

> 项目：PhoneVerse  
> 阶段：Phase 2  
> 文档版本：v1.0  
> 前置版本：v0.1 MVP  
> 目标：在现有模拟手机系统中接入安全、稳定、可扩展的 AI 聊天能力

---

## 1. 当前基础

v0.1 MVP 已实现：

- 锁屏、时间、日期、通知与解锁。
- 响应式手机桌面及 5 个应用入口。
- Chat 联系人会话、文字发送和消息持久化。
- Contacts 5 位联系人及独立会话。
- 本地通知、横幅、点击跳转和未读/已读同步。
- Photos 浏览与全屏预览。
- Notes 创建、编辑、删除和自动保存。
- Settings 产品信息、重置与恢复演示数据。
- 桌面端、移动端、键盘操作和减少动态效果支持。

当前未接入真实 AI、后端、账号、云同步和商业计费。

---

## 2. Phase 2 目标

在保留 v0.1 已有数据和非回复功能的前提下，实现：

1. 用户向联系人发送文字消息。
2. 后端安全调用大语言模型。
3. 不同联系人使用独立人设生成回复。
4. AI 回复正确写入对应会话。
5. 提供加载、失败、重试和服务不可用状态。
6. 保持消息、通知和未读状态一致。
7. 前端源码和构建产物中不暴露 API 密钥。

Phase 2 不实现账号、云同步、模板商城或剧情系统。

---

## 3. 核心原则

### 3.1 安全

- API 密钥仅保存在服务端环境变量中。
- 禁止在前端源码、LocalStorage、IndexedDB 或构建产物中保存密钥。
- 前端只能调用 PhoneVerse 自有 API。
- 服务端必须校验请求结构、消息长度和上下文长度。
- 日志不得记录密钥或完整敏感对话。

### 3.2 可替换

AI 能力通过统一 `AIProvider` 接口封装，业务代码不得直接绑定单一模型厂商。

### 3.3 稳定

- AI 请求失败不得导致页面崩溃。
- 同一用户消息只能产生一次有效 AI 回复。
- 快速发送、切换会话或刷新时不得重复回复或串线。
- 未连接或未配置 AI 服务时禁用消息输入和发送，不生成任何回复。
- 已有历史消息继续保留和展示，不因移除本地回复而清空。

### 3.4 最小实现

本阶段只实现文字 AI 聊天，不实现图片、语音、视频、联网搜索、长期记忆、群聊或主动后台推送。

---

## 4. 总体架构

```text
PhoneVerse Web
      │ HTTPS
      ▼
PhoneVerse BFF / API
      │ Server-side API Key
      ▼
LLM Provider
```

前端负责输入、展示、本地持久化、加载与失败状态、通知和未读同步。由于 v0.1 消息仅存在 IndexedDB，前端只提交当前消息及最近的有限文字上下文，不提交 system Prompt。

BFF/API 将前端上下文视为不可信输入，负责角色过滤、长度校验、再次裁剪、可信 Prompt 组装、模型调用、幂等、超时、错误处理、频率限制和密钥保护。服务端默认不持久化完整对话。

Provider 负责调用具体模型并转换为统一响应。

---

## 5. Provider 接口

```ts
interface AIChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface AIChatRequest {
  messages: AIChatMessage[];
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

interface AIChatResult {
  content: string;
  provider: string;
  model: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

interface AIProvider {
  generateReply(request: AIChatRequest): Promise<AIChatResult>;
}
```

要求：

- 首个 Provider 可使用 DeepSeek 或其他兼容模型。
- Provider 和模型名称通过服务端配置。
- Chat 业务代码不得直接调用厂商 SDK。
- 后续增加 Provider 时不修改核心聊天逻辑。

---

## 6. 阶段划分

| 里程碑 | 范围 | 目标 |
|---|---|---|
| P0 | BFF/API、Provider、单联系人 AI 回复 | 跑通最小 AI 闭环 |
| P1 | 多联系人独立人设、上下文和会话隔离 | 完成可用 AI 聊天 |
| P2 | 状态、错误、设置、测试和验收 | 完成 Phase 2 |

必须按 P0 → P1 → P2 顺序开发。

---

## 7. P0：最小 AI 闭环

### 7.1 API

新增：

```text
POST /api/session/anonymous
POST /api/chat
GET  /api/ai/status
```

请求示例：

```json
{
  "threadId": "thread-brother",
  "contactId": "contact-brother",
  "messageId": "message-001",
  "attempt": 0,
  "anonymousSessionToken": "signed-session-token",
  "context": [
    {
      "role": "user",
      "content": "今天工作很多。"
    },
    {
      "role": "assistant",
      "content": "先按重要程度慢慢处理。"
    }
  ],
  "message": {
    "role": "user",
    "content": "今天有点累。"
  }
}
```

`context` 只允许最近最多 20 条 `user` / `assistant` 文字消息。服务端必须忽略或拒绝其中的 `system` 角色。

成功响应：

```json
{
  "requestId": "request-001",
  "messageId": "assistant-message-001",
  "content": "那就先休息一会儿，不用什么都今天做完。",
  "provider": "deepseek",
  "model": "configured-model"
}
```

状态响应：

```json
{
  "configured": true,
  "provider": "deepseek",
  "model": "configured-model"
}
```

状态接口不得返回密钥、Base URL 或其他敏感配置。客户端只能根据服务状态启用或禁用 AI 对话，不提供本地聊天模式。

匿名会话接口由服务端签发短期令牌；前端可将令牌保存在内存或 LocalStorage，但令牌不得包含 Provider 密钥或敏感对话。

错误响应：

```json
{
  "error": {
    "code": "PROVIDER_ERROR",
    "message": "AI 回复暂时不可用。"
  }
}
```

### 7.2 服务端校验

至少校验：

- `threadId`、`contactId`、`messageId` 和匿名会话令牌非空，`attempt` 为非负整数。
- `message` 必须是非空的 `user` 文字消息。
- `context` 只能包含 `user` / `assistant`，且最多 20 条。
- `contactId` 必须存在于服务端人设白名单；不得信任前端传来的 Prompt。
- 单条消息非空且不超过配置上限。
- 总上下文不超过配置上限。
- 单次请求设置明确超时，推荐初始值 30 秒。

### 7.3 Chat 接入

首个 AI 联系人为“哥哥”。

流程：

1. 保存用户消息。
2. 创建 AI 请求状态。
3. 调用 `/api/chat`。
4. 成功后保存 AI 消息。
5. 更新 Thread 最后一条消息和时间。
6. 清除加载状态。
7. 失败时记录失败状态，不生成重复回复。

Phase 2 必须移除原有本地自动回复逻辑。只有 BFF 返回的有效 AI 响应可以生成联系人回复。

---

## 8. P1：多联系人、人设与上下文

### 8.1 联系人人设

```ts
interface ServerContactAIProfile {
  contactId: string;
  enabled: boolean;
  displayName: string;
  systemPrompt: string;
  temperature: number;
  maxOutputTokens: number;
}

interface ClientContactAIProfile {
  contactId: string;
  enabled: boolean;
  displayName: string;
}
```

要求：

- 5 位联系人分别拥有独立人设。
- `ServerContactAIProfile` 是权威配置，集中存放于服务端，不下发完整 `systemPrompt`。
- IndexedDB 只保存可公开的 `ClientContactAIProfile`，用于显示联系人 AI 可用状态。
- 两类配置均需可序列化，并通过同一 `contactId` 对应。
- 未启用 AI 的联系人只能查看历史消息，输入框和发送操作必须禁用。

### 8.2 Prompt 组装

服务端顺序：

1. 系统安全和产品规则。
2. 联系人人设 Prompt。
3. 必要的会话上下文。
4. 当前用户消息。

禁止信任前端传来的 system Prompt，禁止前端覆盖服务端规则。

### 8.3 上下文管理

本阶段只实现短期上下文：

- 前端从当前 Thread 读取最近最多 20 条有效 `user` / `assistant` 文字消息，不发送全部历史。
- 服务端重新过滤角色，并按字符或 Token 预算二次裁剪。
- 超限时优先保留最近消息。
- 失败消息不作为正常 assistant 内容。
- system Prompt 只由服务端加入，前端上下文不得覆盖安全规则或人设。

### 8.4 会话隔离

- 每个联系人使用独立 Thread。
- 每个 Thread 使用独立上下文。
- 联系人 A 的消息不得进入联系人 B 的 Prompt。
- 回复按请求发起时的 `threadId` 写入，不依赖当前打开页面。

---

## 9. P2：状态、错误与设置

### 9.1 消息状态

```ts
type AIMessageState =
  | "idle"
  | "pending"
  | "completed"
  | "failed"
  | "cancelled";
```

Message 可增加：

```ts
replyToMessageId?: string;
aiState?: AIMessageState;
aiRequestId?: string;
errorCode?: string;
```

规则：

- 用户消息保存后才能请求 AI。
- `aiState`、`aiRequestId` 和 `errorCode` 记录在触发请求的用户消息上。
- `replyToMessageId` 记录在 AI 回复消息上。
- 每次请求拥有唯一标识。
- 失败状态允许重试。
- 重试复用原用户消息。
- 成功后不得再次重试同一请求。
- 应用启动时将遗留 `pending` 标记为 `failed`，错误码为 `REQUEST_INTERRUPTED`；不得在刷新后自动重发。

### 9.2 加载与失败

- 会话中显示简洁的“正在输入”状态。
- 不创建永久空白消息。
- 同一 Thread 默认只允许一个进行中的 AI 请求。
- 网络、超时、服务端、Provider、空响应和频率限制都应转为统一错误。
- 失败时保留用户消息，提供“重试”。
- 不自动无限重试。

统一错误码至少包含：

- `NETWORK_ERROR`
- `REQUEST_TIMEOUT`
- `RATE_LIMITED`
- `PROVIDER_ERROR`
- `EMPTY_RESPONSE`
- `REQUEST_INTERRUPTED`
- `AI_NOT_CONFIGURED`

### 9.3 服务不可用

- Chat 默认处于只读状态；只有 `GET /api/ai/status` 成功且 `configured: true` 时才启用输入和发送。
- 打开 Chat 时检查服务状态；发生网络错误或 `AI_NOT_CONFIGURED` 后立即恢复只读状态，用户可手动重新检测。
- 未连接、状态接口失败或 AI 未配置时，Chat 只允许查看历史消息。
- 输入框与发送按钮必须禁用，并明确显示不可用原因。
- 不得生成本地模拟回复、预设回复、随机回复或任何降级回复。
- 请求过程中断时保留用户消息及失败状态；服务恢复后仅允许用户手动重试。
- 迟到响应必须按 requestId 和请求状态校验，无效响应不得写入会话。

### 9.4 Settings

增加 AI 设置区域：

- AI 服务状态。
- 当前 Provider。
- 当前模型。
- 清理失败请求状态。

不得展示或允许前端填写服务端 API 密钥。

上述服务信息来自 `GET /api/ai/status`。状态接口失败或返回未配置时，前端按未配置处理。

AI 未配置时：

- 显示“AI 服务未配置”。
- Chat 禁用输入与发送，只允许查看已有历史消息。
- 其他功能保持可用。

---

## 10. 数据模型

### 10.1 AIRequest

```ts
interface AIRequest {
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
```

### 10.2 IndexedDB

新增：

- `aiRequests`
- `contactAIProfiles`

要求：

- 使用数据库版本迁移。
- 不得清空 v0.1 已有数据。
- 原联系人、会话、消息、Notes 和 Photos 数据必须继续可用。
- 迁移失败时不得静默丢失数据。
- `aiRequests.userMessageId` 必须唯一，避免同一用户消息创建多个请求记录。
- `contactAIProfiles` 只保存不含 system Prompt 的客户端公开配置。

---

## 11. 幂等与并发

- 用户消息拥有唯一 `messageId`；BFF 为每次实际 Provider 调用生成 `requestId`。
- 同一用户消息只创建一个 AIRequest。
- BFF 使用“匿名会话标识 + messageId + attempt”作为幂等键，并短期缓存进行中及已完成结果。
- 相同幂等键不得重复调用 Provider；缓存 TTL 应覆盖客户端正常重试窗口。
- 网络中断或结果不确定时复用原 `attempt` 查询同一结果；只有收到明确失败且用户手动重试时才递增 `attempt`。
- 幂等能力通过 `IdempotencyStore` 接口隔离；开发环境可用内存实现，多实例生产部署必须使用共享存储。
- 页面刷新后不得重复发送已完成请求。
- 页面刷新后遗留的 pending 请求转为可手动重试的失败状态，不自动发送。
- 同一 Thread 同时最多一个 AI 请求。
- 不同 Thread 可以独立请求。
- 快速切换联系人不得串线。
- 响应必须保存到原始 `threadId`。
- 所有定时器、订阅和 AbortController 必须正确清理。

取消请求为可选功能；如未实现，应记录为技术债，不得伪造取消能力。幂等缓存只保存请求状态和统一结果，不保存超出必要范围的完整历史。

---

## 12. 通知与未读同步

AI 回复完成时：

- 用户正在目标会话：追加消息，不显示横幅，不增加未读。
- 用户不在目标会话：追加消息，增加未读并生成通知横幅。
- AI 请求失败：不生成联系人消息通知。

---

## 13. API 安全与限制

本阶段服务端固定采用 Node.js + TypeScript + Fastify，避免同时维护多套运行时。开发环境由 Vite 代理 `/api`，生产环境由同源反向代理转发到 BFF。

服务端环境变量至少包含：

```text
AI_PROVIDER
AI_API_KEY
AI_MODEL
AI_BASE_URL
AI_REQUEST_TIMEOUT_MS
AI_MAX_CONTEXT_CHARS
AI_RATE_LIMIT
ANONYMOUS_SESSION_SECRET
```

仓库只提交 `.env.example`，不得提交真实 `.env`。

服务端至少实现：

- 请求体大小限制。
- 单条消息和上下文长度限制。
- 基础频率限制。
- 超时控制。
- 错误信息脱敏。
- 生产环境 CORS 限制。
- 环境变量启动校验。

无账号阶段由服务端签发短期匿名会话令牌，并结合 IP 做频率限制。客户端自行生成的 ID 只能用于辅助识别，不能作为可信鉴权。

CORS 不是鉴权手段。生产环境除限制同源外，还必须设置全局请求额度和单 IP / 匿名会话额度，降低公开 BFF 被滥用的风险。

限制规则必须集中配置。

---

## 14. 隐私与日志

- 默认不在服务端数据库持久化完整对话。
- 服务端仅在请求期间处理必要上下文。
- 调试日志不得输出完整 Prompt 或完整聊天记录。
- 可记录 requestId、错误类型、Provider、模型和耗时。
- Settings 或 About 中说明消息可能发送给第三方模型服务处理。
- 商业发布前补充正式隐私政策。

---

## 15. 目录建议

```text
src/
├── apps/chat/
├── ai/
│   ├── profiles/
│   ├── prompts/
│   └── types/
├── db/
│   ├── migrations/
│   └── repositories/
├── services/
│   ├── ai/
│   └── api/
├── stores/
└── types/

server/
├── api/
├── providers/
├── prompts/
├── middleware/
├── config/
└── utils/
```

可根据现有项目结构调整，但必须保证 Provider、Prompt、数据访问、UI 和服务端边界清晰。

---

## 16. 开发顺序

### Phase 2 / P0

1. 检查 v0.1 架构和数据模型。
2. 创建 Provider 接口。
3. 创建 BFF/API。
4. 实现匿名会话、AI 状态接口和环境变量校验。
5. 实现请求校验、超时、限流和单进程幂等存储。
6. 配置“哥哥”的服务端权威人设。
7. 接入单联系人 AI 回复。
8. 删除本地自动回复，并在 AI 不可用时禁用输入和发送。
9. 完成 P0 验收。

### Phase 2 / P1

1. 扩展联系人 AI 配置。
2. 为 5 位联系人建立独立人设。
3. 实现 Prompt 组装。
4. 实现上下文裁剪。
5. 实现多会话隔离。
6. 实现 AIRequest 持久化。
7. 接入通知和未读同步。
8. 完成 P1 验收。

### Phase 2 / P2

1. 实现加载状态。
2. 实现失败和重试。
3. 实现服务不可用时的只读会话状态。
4. 增加 Settings AI 状态。
5. 实现 pending 请求启动恢复和迟到响应丢弃。
6. 验证数据库迁移。
7. 补充测试。
8. 完成安全、性能和回归检查。
9. 完成 Phase 2 总体验收。

---

## 17. 验收标准

### 17.1 P0

- BFF/API 正常启动。
- 密钥只存在于服务端环境变量。
- 配置真实服务端密钥时，“哥哥”可以生成真实 AI 回复。
- 未配置密钥时状态接口明确返回未配置，Chat 禁用输入和发送。
- 匿名会话、请求校验、超时、限流和幂等机制可用。
- AI 回复保存到正确会话。
- 不存在本地模拟、预设或降级回复路径。
- 请求失败时页面不崩溃。
- 除明确移除本地回复外，v0.1 其他功能无明显退化。
- TypeScript、Lint、Test、Build 通过。

### 17.2 P1

- 5 位联系人拥有独立人设。
- 不同联系人回复风格可区分。
- 会话上下文完全隔离。
- 上下文长度受到限制。
- 快速切换会话不会串线。
- AI 回复可正确触发通知和未读。
- 刷新不会重复已完成请求。
- 遗留 pending 请求刷新后进入可手动重试的失败状态。
- 数据库升级不会清空 v0.1 数据。

### 17.3 P2 / Phase 2

- 加载、成功、失败和重试状态完整。
- 同一用户消息不会生成重复回复。
- 同一 Thread 不会出现多个失控请求。
- 结果不确定时复用同一 attempt，明确失败后的手动重试才创建新 attempt。
- 失败后可在服务恢复时手动重试，不提供本地回复。
- AI 未配置或未连接时 Chat 只读，其他应用保持可用。
- Settings 显示 AI 状态但不暴露密钥。
- 前端源码和构建产物中不存在 API 密钥。
- 日志不输出完整敏感对话。
- 除明确移除本地回复外，v0.1 既有数据及其他功能正常。
- 桌面端和移动端正常。
- TypeScript、Lint、Test、Build 全部通过。
- 自动化测试全部使用 Mock / Stub；真实 Provider 只用于人工配置后的验收，不进入 CI。

---

## 18. 测试要求

### 单元测试

- Prompt 组装。
- 上下文裁剪。
- Provider 响应转换。
- AIRequest 状态变化。
- AI 不可用状态与输入禁用规则。
- 数据库迁移。
- 服务端请求校验与上下文角色过滤。
- 幂等键和 attempt 计算。

### 集成测试

- Chat 调用 BFF/API。
- 成功回复保存。
- 失败与重试。
- Thread 隔离。
- AI 回复通知和未读同步。
- 请求幂等。
- 匿名会话与 AI 状态接口。
- pending 启动恢复与迟到响应丢弃。

### 回归测试

- 锁屏与桌面。
- AI 未连接或未配置时的 Chat 只读状态。
- Contacts。
- Photos。
- Notes。
- Settings 重置。
- 键盘操作。
- 减少动态效果。

自动化测试必须使用 Mock 或 Stub，不得真实消耗模型额度。

CI 还必须扫描前端源码和 `dist`，确保不存在真实密钥或仅服务端使用的环境变量值。

---

## 19. Phase 2 明确不做

- 用户账号和登录。
- 云端聊天记录同步。
- 付费订阅或额度购买。
- 用户自行填写 API 密钥。
- 图片、语音和视频 AI。
- 联网搜索。
- 长期记忆或向量数据库。
- 群聊 AI。
- 主动后台消息。
- 原生系统推送。
- Phase 3 扩展应用。
- 剧情分支和多结局。
- 模板商城。
- Capacitor 封装。

未经更新本文件，不得加入上述功能。

---

## 20. Cursor 执行指令

1. 严格按 Phase 2 P0 → P1 → P2 开发。
2. 开始前完整阅读总 PRD、本文件、当前代码和已有任务文档。
3. 不得破坏 v0.1 已有数据和非回复功能；本地回复必须按本文件要求移除。
4. 每次只完成当前里程碑。
5. 采用满足验收标准的最小实现，不扩大范围。
6. API 密钥只能存在于服务端环境变量。
7. UI 不得直接调用 Provider 或操作 IndexedDB。
8. Provider、Prompt、数据访问、UI 和服务端必须分层。
9. 不得将 Prompt 散落在组件中。
10. 不得在前端调用带密钥的模型接口。
11. 自动化测试不得真实调用模型。
12. 仅在存在重大架构风险、数据丢失风险或无法合理判断时提问。
13. 控制输出长度，不输出冗长思考过程。
14. 每个里程碑完成后运行 TypeScript、Lint、Test 和 Build。
15. 当前里程碑未通过前不得开始下一里程碑。
16. Phase 2 完成后停止，不得自动开始 Phase 3。

---

## 21. 最终交付

Phase 2 完成后应交付：

- 可运行的 BFF/API。
- 至少一个可配置 AI Provider。
- 5 位联系人独立人设。
- 安全的密钥管理。
- 匿名会话、限流与可替换的幂等存储。
- 短期上下文管理。
- AI 请求状态与持久化。
- 加载、失败、重试和服务不可用状态。
- AI 回复通知与未读同步。
- Settings AI 状态。
- 数据库迁移。
- 单元测试与集成测试。
- `.env.example`。
- 简要部署说明，包含 Vite 代理、同源反向代理、环境变量和多实例幂等存储要求。
- 完整验收结果。
