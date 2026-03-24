# [P0-2] ESLint + Prettier + no-restricted-imports

## 目标（可测量）
`pnpm lint` 输出 0 error，分层架构违规在 lint 阶段熔断

## 复述（AI 执行前必填）
> 核心逻辑：配置 ESLint + Prettier，通过 no-restricted-imports 规则强制分层架构，使 domain/core 层无法 import infrastructure 实现。
> Edge Case 1：现有代码中可能已有跨层 import，需先 `--fix` 修复格式问题，架构违规需手动重构至 contracts 层
> Edge Case 2：monorepo 下 apps/ 子包有独立 tsconfig，需确认 ESLint 能覆盖子包

## Given-When-Then 验收标准
Given ESLint 配置完成
When 运行 `pnpm lint`
Then 输出 0 error，0 warning（使用 --max-warnings 0）

Given domain 层代码直接 import infrastructure 实现
When 运行 `pnpm lint`
Then 输出 no-restricted-imports error，阻断 CI

## .spec.ts 骨架
无需测试文件（lint 配置本身是验证）

## 执行步骤
- [x] 安装 eslint、@typescript-eslint/parser、@typescript-eslint/eslint-plugin、eslint-config-prettier、prettier
- [x] 创建 `.eslintrc.cjs`（含 no-restricted-imports 分层规则）
- [x] 创建 `.prettierrc.json`
- [x] 在 `package.json` 中添加 `lint` 和 `format` 脚本
- [ ] 运行 `pnpm lint` 确认 0 error
- [ ] 修复现有架构违规（见 P1-1）

## Definition of Done
- [ ] `pnpm lint` → 0 error
- [ ] `pnpm format --check` → 0 差异
- [ ] no-restricted-imports 规则生效（手动测试跨层 import 触发 error）
- [ ] ANTI_PATTERNS.md 已更新（若发现新坑）
