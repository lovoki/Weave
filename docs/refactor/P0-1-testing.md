# [P0-1] Vitest 单元测试骨架

## 目标（可测量）
core/domain 层覆盖率 ≥90%，整体 ≥80%；所有 .spec.ts it() 绿色

## 复述（AI 执行前必填）
> 核心逻辑：针对已纯化的 contracts 接口写 .spec.ts 骨架，先写空 it() 描述场景，再由 AI 填实现
> Edge Case 1：DAG 状态机测试需要模拟状态转换序列，不能依赖实际 LLM 调用
> Edge Case 2：WAL 测试需要内存 SQLite（:memory:），不能影响真实数据文件

## Given-When-Then 验收标准
Given Vitest 配置完成
When 运行 `pnpm test`
Then 所有 .spec.ts 通过，coverage 报告生成

Given 覆盖率 <80%
When 运行 `pnpm test --coverage`
Then CI 失败，阻断 PR 合并

## 执行步骤
- [x] 安装 vitest、@vitest/coverage-v8
- [x] 创建 `vitest.config.ts`
- [x] 创建各层 .spec.ts 骨架（空 it() 即是 AC）
- [ ] 逐步填充测试实现（AI 辅助）
- [ ] 确认覆盖率达标

## Definition of Done
- [ ] `pnpm test` → 全绿
- [ ] `pnpm test --coverage` → core/domain ≥90%，整体 ≥80%
- [ ] ANTI_PATTERNS.md 已更新（若发现新坑）
