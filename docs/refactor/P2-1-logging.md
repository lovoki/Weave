# [P2-1] 结构化日志（JSON 模式）

## 目标（可测量）
所有运行时日志输出结构化 JSON，包含 level/timestamp/traceId/message/data 字段

## 执行步骤
- [ ] 定义 `LogEntry` Zod Schema（contracts/logging.ts）
- [ ] 改造 `src/infrastructure/logging/app-logger.ts` 输出 JSON Lines
- [ ] 更新 ILogger 接口：`log(level, message, data?)` → 自动附加 timestamp + traceId

## Definition of Done
- [ ] 日志文件为有效 JSON Lines 格式
- [ ] 每条日志含 traceId（见 P2-2）
- [ ] `pnpm build` 0 error
