# [P2-3] 安全加固

## 目标（可测量）
command_exec 工具执行白名单校验，API Key 不出现在日志中

## 执行步骤
- [ ] `command_exec` 工具：执行前校验命令在白名单（可配置），拒绝 shell 注入字符（`;`, `|`, `&&` 等）
- [ ] LLM 请求/响应日志中 mask apiKey
- [ ] 环境变量校验：启动时确认 QWEN_API_KEY 已设置，否则友好报错

## Definition of Done
- [ ] `command_exec` 注入测试：`; rm -rf /` → 被拒绝
- [ ] 日志文件中无 API Key 明文
- [ ] `pnpm build` 0 error
