# [P0-3] GitHub Actions CI

## 目标（可测量）
每次 PR 自动执行 build + lint + test，全绿才可合并

## 复述（AI 执行前必填）
> 核心逻辑：配置 GitHub Actions workflow，在 push/PR 事件触发时依次运行 pnpm install → build → lint → test
> Edge Case 1：pnpm 需要专用的 setup-pnpm action，node-version 需与本地一致
> Edge Case 2：Windows 开发环境 vs Linux CI 环境路径差异（scripts/*.ps1 不可在 Linux 运行）

## Given-When-Then 验收标准
Given PR 提交到 main 分支
When GitHub Actions 触发
Then build + lint + test 全部通过，PR 显示绿色 check

Given build 或 lint 失败
When GitHub Actions 触发
Then PR 被阻断，显示失败原因

## 执行步骤
- [x] 创建 `.github/workflows/ci.yml`
- [ ] 确认 Node.js 版本（检查 .nvmrc 或 engines 字段）
- [ ] 推送测试 PR，确认 Actions 触发

## Definition of Done
- [ ] Actions workflow 文件存在
- [ ] 模拟 PR 触发，CI 全绿
- [ ] ANTI_PATTERNS.md 已更新（若发现新坑）
