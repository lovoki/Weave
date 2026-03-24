# [P1-1] src/contracts/ + 架构违规修复 + Zod

## 目标（可测量）
建立 src/contracts/ 契约层，消除跨层 as any 和类型下渗，ESLint no-restricted-imports 0 error

## 复述（AI 执行前必填）
> 核心逻辑：将散落在各层的接口定义迁移/引用到 src/contracts/，用 Zod Schema 作为唯一真相，类型通过 z.infer 导出
> Edge Case 1：现有接口可能被多处 import，迁移时需要全局搜索引用并更新路径
> Edge Case 2：Zod 运行时 Schema 会引入运行时开销，只在边界（输入验证/API 解析）调用 .parse()，内部不重复校验

## Given-When-Then 验收标准
Given src/contracts/ 建立完成
When 运行 `pnpm lint`
Then no-restricted-imports 0 error（domain 不 import infrastructure 实现）

Given WalEventSchema 定义在 contracts/storage.ts
When 调用 WalEventSchema.parse(invalidData)
Then 抛出 ZodError，错误消息清晰描述违规字段

## .spec.ts 骨架
见 src/core/__tests__/ 和 src/domain/__tests__/

## 执行步骤
- [x] 创建 src/contracts/engine.ts（IEngineEventBus, EngineContext, FrozenSnapshot）
- [x] 创建 src/contracts/agent.ts（ILlmClient, IToolRegistry, AgentLoopPlugin）
- [x] 创建 src/contracts/storage.ts（IBlobStore, IWalDao, SnapshotStore, ToolExecuteResult）
- [x] 创建 src/contracts/protocol.ts（WeaveGraphEvent WebSocket 图协议）
- [ ] 扫描现有跨层 import，逐一修复至通过 contracts 层
- [ ] 移除所有 `as any`（记录到 ANTI_PATTERNS.md）

## Definition of Done
- [ ] `pnpm lint` → 0 error
- [ ] `pnpm build` → 0 error
- [ ] src/contracts/ 内零业务实现代码
- [ ] 所有 Zod Schema 有 JSDoc @example
- [ ] ANTI_PATTERNS.md 已更新
