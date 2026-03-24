# 重构开发日志

本文件记录 Weave Engine 工业级重构阶段的变更摘要。

---

<!-- 新条目追加在此处上方 -->

## 2026-03-24 · Entry 001 · 重构基础设施初始化

### 变更范围
- `docs/refactor/`（新建目录，含 REFACTOR_INDEX.md 和所有计划文档）
- `RULES.md`、`RULES_HOT.md`、`ANTI_PATTERNS.md`（项目根目录，AI Coding 方法论物理化）
- `src/contracts/`（新建契约层：engine.ts、agent.ts、storage.ts、protocol.ts）
- `src/core/__tests__/`、`src/domain/__tests__/` 等（BDD 测试骨架）
- `.eslintrc.cjs`、`.prettierrc.json`（代码质量工具配置）
- `.github/workflows/ci.yml`（GitHub Actions CI）
- `.husky/pre-commit`、`.lintstagedrc.json`（提交前钩子）

### 做了什么
- 建立重构计划文档体系（REFACTOR_INDEX.md + 各阶段计划文档）
- 物理化 AI Coding 方法论到项目文件（RULES.md / RULES_HOT.md / ANTI_PATTERNS.md）
- 建立 src/contracts/ 契约层（Zod Schema + TypeScript 接口，零业务逻辑）
- 初始化各层 BDD 测试骨架（空 it() 描述验收标准）
- 配置 ESLint（含 no-restricted-imports 物理层隔离）+ Prettier
- 配置 GitHub Actions CI（build + lint + test）
- 配置 husky + lint-staged（提交前自动 lint）

### 为什么这样做
项目已完成原型验证阶段，但测试工程、CI/CD、代码质量工具三大短板严重制约工业化进程。
本次初始化建立全套工程基础设施，后续重构在此基础上逐步推进。

### 关键决策
- 契约层采用 Zod-First：先定义 Schema，再用 z.infer 导出类型，确保运行时契约与类型定义永不漂移
- no-restricted-imports 作为架构护栏：AI 的架构违规在 lint 阶段即被熔断，无需 Code Review 捕获
- 测试骨架采用空 it() 而非 ACCEPTANCE_CRITERIA.md：零维护成本，直接可运行
