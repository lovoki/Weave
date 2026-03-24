# [P0-4] husky + lint-staged

## 目标（可测量）
`git commit` 时自动对暂存文件运行 ESLint + Prettier，有 error 则阻断提交

## 复述（AI 执行前必填）
> 核心逻辑：husky 注册 pre-commit hook，lint-staged 只对 git add 的文件运行 lint/format，避免全量扫描
> Edge Case 1：Windows 环境下 husky hook 脚本需要 bash 兼容，确认 git bash 路径
> Edge Case 2：monorepo 下子包文件需要子包的 tsconfig，lint-staged 的 cwd 设置很关键

## Given-When-Then 验收标准
Given 暂存了有 lint error 的文件
When 运行 `git commit`
Then pre-commit hook 阻断提交，输出 ESLint error

Given 暂存了格式不符合 Prettier 的文件
When 运行 `git commit`
Then Prettier 自动格式化文件并重新暂存

## 执行步骤
- [x] 安装 husky、lint-staged
- [x] 运行 `husky init` 创建 `.husky/pre-commit`
- [x] 创建 `.lintstagedrc.json`
- [ ] 测试：故意引入 lint error → 确认 commit 被阻断

## Definition of Done
- [ ] `.husky/pre-commit` 存在且可执行
- [ ] `.lintstagedrc.json` 配置正确
- [ ] 手动测试阻断提交场景通过
- [ ] ANTI_PATTERNS.md 已更新（若发现新坑）
