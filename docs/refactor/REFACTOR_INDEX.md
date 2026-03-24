# Weave Engine 工业级重构总览

> 评估日期：2026-03-24 | 执行基线：Entry 076

## 目标

将 Dagent 从原型验证阶段推进至工业级可维护水准：
- 测试工程：18/100 → ≥80%（core/domain ≥90%）
- CI/CD：10/100 → 全自动化 PR Check
- 代码质量工具：20/100 → ESLint 0 error + 分层隔离

## 进度追踪

| ID | 名称 | 阶段 | 状态 | 分支 |
|----|------|------|------|------|
| P0-2 | ESLint + Prettier + no-restricted-imports | 阶段0 | ⏳ 待执行 | `refactor/P0-2-lint-format` |
| P0-3 | GitHub Actions CI | 阶段0 | ⏳ 待执行 | `refactor/P0-3-cicd` |
| P0-4 | husky + lint-staged | 阶段0 | ⏳ 待执行 | `refactor/P0-4-precommit` |
| P1-1 | src/contracts/ + 架构违规修复 + Zod | 阶段1 | ⏳ 待执行 | `refactor/P1-1-contracts` |
| P1-3 | Web Worker + React Flow 视口优化 | 阶段1 | ⏳ 待执行 | `refactor/P1-3-frontend-perf` |
| P0-1 | Vitest 单元测试骨架 | 阶段2 | ⏳ 待执行 | `refactor/P0-1-testing` |
| P2-1 | 结构化日志（JSON 模式） | 阶段3 | ⏳ 待执行 | `refactor/P2-1-logging` |
| P2-2 | 全链路 TraceId | 阶段3 | ⏳ 待执行 | `refactor/P2-2-tracing` |
| P2-3 | 安全加固 | 阶段3 | ⏳ 待执行 | `refactor/P2-3-security` |
| P2-4 | 性能优化 | 阶段3 | ⏳ 待执行 | `refactor/P2-4-performance` |
| P3 | npm publish + wss:// + 错误分类 | 阶段4 | ⏳ 待执行 | `refactor/P3-production` |

## 验证标准（全部阶段完成后）

1. `pnpm lint` → ESLint 0 error（含 no-restricted-imports 层隔离）
2. `pnpm test --coverage` → Vitest 覆盖率 ≥ 80%（core/domain ≥ 90%）
3. `pnpm build` → TypeScript 编译 0 error（`tsc --noEmit --strict`）
4. `pnpm verify:p0` → Step Gate + DAG Matrix 全通过
5. GitHub Actions PR Check → 全绿
6. 前端渲染 1000+ 节点 DAG → 主线程 <100ms

## 分支策略

每个子项 = 独立 Git 分支 `refactor/PX-Y-xxx`，PR 合并后再开下一个。
