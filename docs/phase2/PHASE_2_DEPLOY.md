# PhoneVerse Phase 2 部署说明

## 本地开发

1. 复制环境变量：

```bash
cp .env.example .env
```

2. 在 `.env` 中填写 `AI_API_KEY` 等服务端配置。不要提交真实密钥。

3. 启动前后端：

```bash
npm run dev:all
```

- 前端：`http://localhost:5173`
- BFF：`http://127.0.0.1:8787`
- Vite 会把 `/api` 代理到 BFF

也可分别启动：

```bash
npm run dev:server
npm run dev
```

未配置 `AI_API_KEY` 时：
- `GET /api/ai/status` 返回 `configured: false`
- Chat 只允许查看历史消息，禁用输入和发送
- 不会生成任何本地模拟回复

## 生产部署

1. 前端构建：`npm run build`
2. 启动 BFF：`npm run server`
3. 用同源反向代理把 `/api` 转发到 BFF
4. 设置生产环境变量，尤其是：
   - `AI_API_KEY`
   - `ANONYMOUS_SESSION_SECRET`
   - `CORS_ORIGIN`
5. 多实例部署时，把幂等存储换成共享实现（当前默认是内存）

## 安全注意

- API 密钥只能存在服务端环境变量
- 前端、LocalStorage、IndexedDB、构建产物不得包含密钥
- 自动化测试使用 Mock，不消耗真实模型额度
