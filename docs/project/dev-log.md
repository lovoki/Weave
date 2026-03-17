# Dagent 开发日志

本文件记录每次任务完成后的变更摘要，目标是：阅读本日志即可了解**做了什么、为什么这样做**。

---

## 2026-03-17 · Entry 002 · BaseNode 统一节点协议重构

### 变更范围
- `apps/shared/graph-protocol.ts`（重写）
- `src/runtime/nodes/`（新建目录 + 8 个文件）
- `src/runtime/blob-store.ts`（新建）
- `src/weave/weave-plugin.ts`（重写）
- `apps/weave-graph-server/src/projection/graph-projector.ts`（重写）
- `apps/weave-graph-server/src/gateway/ws-gateway.ts`（新增 `/api/blob/:id` 路由）
- `apps/weave-graph-server/src/protocol/graph-events.ts`（更新导出）
- `apps/weave-graph-web/src/types/graph-events.ts`（更新导出）
- `apps/weave-graph-web/src/store/graph-store.ts`（重写）
- `apps/weave-graph-web/src/App.tsx`（Inspector 升级）
- `apps/weave-graph-web/src/nodes/semantic-node.tsx`（读 metrics）

### 做了什么
- 新增 `NodeKind`（10 种）、`NodeStatus`（10 种）统一枚举，替代散落各处的 4 套互不兼容状态值
- 新增 `NodeMetrics`、`NodeError`、`BaseNodePayload`、子类型 Payload 等类型（`apps/shared/graph-protocol.ts`）
- 更新 `GraphPort`：`summary: string` → `content: unknown`，支持原生 Object/Array 传输（零双重序列化）
- 建立 `src/runtime/nodes/` 节点类体系：`BaseNode` 抽象类 + `LlmNode / ToolNode / AttemptNode / RepairNode / FinalNode / InputNode / EscalationNode`
- 新建 `safe-serialize.ts`：`safeClone()` 三合一（深拷贝 + 循环引用防爆 + 不可序列化类型过滤），替代原生 structuredClone
- 新建 `blob-store.ts`：50KB 阈值大内容写临时文件 + blobRef 引用，全异步接口
- 重写 `WeavePlugin`：用节点类替代 `TurnDAGBuilder`，通过 `toFullPayload()` 发射 `weave.dag.base_node` 事件（包含完整 I/O 端口）
- 重写 `GraphProjector`：优先处理 `weave.dag.base_node`（直接解构 `BaseNodePayload`），保留旧事件向后兼容
- 新增 `/api/blob/:id` HTTP 端点（`ws-gateway.ts`），支持前端 Inspector 大内容懒加载
- 升级前端 Inspector：错误区（红色高亮）、Metrics 区（耗时/Token）、端口区（原生 JSON/text 渲染、blobRef 懒加载按钮）

### 为什么这样做
原有节点定义碎片化：5 个层级中 `id` vs `nodeId`、`type` vs `kind`、4 套互不兼容状态枚举、端口只有截断文本摘要，无法支持白盒调试。本次重构建立统一 DTO 层，使 Inspector 能展示 LLM 的完整 messages 数组、工具调用的完整 JSON 参数、错误 stack trace 等完整信息。

### 关键决策
- `src/` tsconfig rootDir 限制了直接导入 `apps/shared/`，故在 `src/runtime/nodes/node-types.ts` 中定义结构对齐的本地类型（TypeScript 结构化类型系统保证运行时兼容）
- `toFullPayload()` 为 async 以支持 BlobStore 大内容处理，雪崩传播到 WeavePlugin 各钩子（AgentLoopPlugin 接口已支持 Promise 返回）
- 旧版 `weave.dag.node` / `weave.dag.detail` 事件路径在 GraphProjector 中保留向后兼容，新版 `weave.dag.base_node` 为主路径

---

## 2026-03-17 · Entry 001 · 汉化 CLAUDE.md 并建立工作流规范

### 变更范围
`CLAUDE.md`

### 做了什么
将项目指导文件 `CLAUDE.md` 从英文全文翻译为中文，并新增两项工作流规范章节。

**具体改动：**
- 全文翻译为中文（保留代码块、命令、技术术语原文）
- 新增「任务完成后提交规范」章节：
  - 明确提交流程：暂存 → 中文消息 → 本地提交
  - 提供提交类型对照表（feat/fix/refactor/docs/style/test/chore）
  - 提供完整提交消息示例（含 `Co-Authored-By` 尾注）
- 新增「开发日志规范」章节（本条目即为首次执行）：
  - 每次任务完成后，将变更摘要追加到 `docs/project/dev-log.md`
  - 记录格式：做了什么 + 为什么 + 关键决策

### 为什么这样做
- 项目语言规范要求所有文档使用中文，CLAUDE.md 作为核心指导文件应保持一致
- 缺乏统一提交规范导致历史记录混乱（参见 commit `0d47cf6 使用claude重构并修复`），引入 Conventional Commits 格式提升可追溯性
- 过去无开发日志积累，难以快速回顾「为什么做某个决定」，本规范解决此问题

### 关键决策
- 开发日志独立于 `development-progress.md`（后者侧重架构级进度），`dev-log.md` 侧重每次任务的变更原因
- 不强制要求 `git push`，仅要求本地提交，降低协作风险

---

<!-- 新条目追加在此处上方，保持时间倒序 -->
