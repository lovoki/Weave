# [P1-3] Web Worker + React Flow 视口优化

## 目标（可测量）
前端渲染 1000+ 节点 DAG，主线程 CPU <100ms，FPS 稳定 ≥30

## 复述（AI 执行前必填）
> 核心逻辑：将 Dagre 布局计算卸载到 Web Worker，主线程只做 React Flow 渲染；启用视口虚拟化（只渲染可见节点）
> Edge Case 1：Worker 与主线程数据传输需要 structuredClone 兼容的格式，Dagre 输入对象需要序列化
> Edge Case 2：视口虚拟化会导致节点在滚动时重新挂载，需要确保 React Flow 的 nodeExtent/nodeOrigin 正确配置

## Given-When-Then 验收标准
Given 1000 个节点的 DAG 数据推送到前端
When 布局计算完成并渲染
Then Chrome DevTools 主线程任务 <100ms，Jank 0

Given 用户滚动/缩放视口
When React Flow 重渲染
Then 只有视口内节点真实 DOM 存在

## 执行步骤
- [ ] 抽取 Dagre 计算逻辑到 `apps/weave-graph-web/src/workers/layout.worker.ts`
- [ ] 主线程通过 `useWorker` hook 通信
- [ ] 配置 React Flow `nodeTypes` 的 `memo` 防止不必要重渲染
- [ ] 评估 `virtualized` prop（React Flow v11+）

## Definition of Done
- [ ] Chrome Performance 录制：主线程 <100ms
- [ ] `pnpm build` → 0 error
- [ ] Worker 文件 Vite 构建正确（import.meta.url 方式）
- [ ] ANTI_PATTERNS.md 已更新（若发现新坑）
