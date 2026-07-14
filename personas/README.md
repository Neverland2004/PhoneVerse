# 联系人人设与形象（前端编辑后自动写入）

每个联系人一个 JSON 文件，例如 `contact-brother.json`：

```json
{
  "contactId": "contact-brother",
  "name": "哥哥",
  "avatar": "哥",
  "status": "在线",
  "persona": "你的人设文案……",
  "updatedAt": 0
}
```

- 在 App 里点头像保存 → 会更新这里的文件  
- 清浏览器数据后重启 `npm run dev:all`，启动时会把这里的内容同步回前端  
