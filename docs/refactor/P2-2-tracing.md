# [P2-2] 全链路 TraceId

## 目标（可测量）
从用户输入到 LLM 响应到工具执行，每条日志都携带相同 traceId，可按 traceId 过滤完整链路

## 执行步骤
- [ ] 在 EngineContext 添加 `traceId: string`（UUID v4，每次 run 生成）
- [ ] ILogger 接口绑定 traceId（构造时注入或通过 AsyncLocalStorage）
- [ ] 所有工具执行、LLM 调用日志携带 traceId

## Definition of Done
- [ ] `grep traceId logs/*.log` → 每条日志均包含
- [ ] 同一 runId 的所有日志 traceId 相同
