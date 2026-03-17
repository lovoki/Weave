# Dagent 全面优化方案

## 审计概览

**审计范围**: 28 个 TypeScript/TSX 文件，约 5,775 行代码
**综合评分**: 6.2/10
**核心问题**: 单体文件过大、代码重复严重、类型安全不足、错误处理缺失、测试覆盖为零

---

## 优化任务清单

### 阶段一：基础设施与工具层（无业务影响）

#### OPT-01: 提取通用工具函数库 `src/utils/`
- [x] 完成
- **问题**: `summarizeText()` 在 `weave-plugin.ts` 和 `run-agent.ts` 中重复实现；`estimateDisplayWidth()` / `stringDisplayWidth()` 等字符宽度函数散落在 `App.tsx`；`tryParseJson()` 在 `run-agent.ts` 中返回 `{}` 掩盖错误
- **方案**:
  - 新建 `src/utils/text-utils.ts`: 提取 `summarizeText()`, `truncateText()`, `tryParseJson()`
  - 新建 `src/utils/display-width.ts`: 提取 `estimateDisplayWidth()`, `stringDisplayWidth()`, `charDisplayWidth()`
  - 新建 `src/utils/id-gen.ts`: 提取 `createSessionId()` 并改用 `crypto.randomUUID()`
  - 所有原引用点改为导入新模块
- **涉及文件**: `src/utils/text-utils.ts`(新), `src/utils/display-width.ts`(新), `src/utils/id-gen.ts`(新), `src/agent/run-agent.ts`, `src/weave/weave-plugin.ts`, `src/tui/App.tsx`, `src/index.ts`

#### OPT-02: 集中管理硬编码常量 `src/config/defaults.ts`
- [x] 完成
- **问题**: `maxSteps=6`, `streamChunkSize`, `retryMax=3`, `MAX_LOG_ITEMS=40`, `details上限=8`, `THEME颜色`, `NODE_WIDTH/HEIGHT=280/92` 等分散在多个文件
- **方案**:
  - 新建 `src/config/defaults.ts`，集中定义所有业务常量
  - 支持环境变量覆盖
  - 各文件改为导入常量
- **涉及文件**: `src/config/defaults.ts`(新), `src/agent/run-agent.ts`, `src/tui/App.tsx`, `src/tui/use-agent-state.ts`

#### OPT-03: 统一前后端协议类型定义
- [ ] 完成
- **问题**: `apps/weave-graph-server/src/protocol/graph-events.ts` 与 `apps/weave-graph-web/src/types/graph-events.ts` 各维护一份几乎相同的类型定义，修改时极易不同步
- **方案**:
  - 新建 `packages/graph-protocol/` 共享包，存放协议类型
  - 后端和前端均从共享包导入
  - 在 `pnpm-workspace.yaml` 注册
- **涉及文件**: `packages/graph-protocol/`(新), `pnpm-workspace.yaml`, 前后端的 `graph-events.ts`

---

### 阶段二：核心运行时重构（run-agent.ts 拆分）

#### OPT-04: 提取插件钩子执行器 `src/agent/plugin-executor.ts`
- [x] 完成
- **问题**: `run-agent.ts` 中插件钩子调用逻辑在 `runOnceStreamLegacy` 和 `runOnceStreamDag` 中各重复 4 处（beforeLlmRequest/afterLlmResponse/beforeToolExecution/afterToolExecution）
- **方案**:
  - 新建 `src/agent/plugin-executor.ts`
  - 提取 `executePluginHook(plugins, hookName, ...args)` 统一方法
  - 提取 `collectPluginOutputs(plugins, hookName, ...args)` 收集输出
  - `run-agent.ts` 中所有插件调用改为调用此模块
- **涉及文件**: `src/agent/plugin-executor.ts`(新), `src/agent/run-agent.ts`

#### OPT-05: 提取工具执行器 `src/agent/tool-executor.ts`
- [ ] 完成
- **问题**: 工具执行逻辑（参数解析、Step Gate 审批、执行、结果处理、重试修复）在 `runAgentDagLoop` 和 `runAgentLoop` 中大量重复，各含 150+ 行近乎相同的代码
- **方案**:
  - 新建 `src/agent/tool-executor.ts`
  - 提取 `executeToolWithApproval()`: 包含审批 → 执行 → 结果处理完整链路
  - 提取 `repairAndRetryTool()`: 包含失败 → LLM修复 → 重试链路
  - 提取 `stripRuntimeToolMeta()`: 运行时元数据剥离
  - Legacy 和 DAG 两条路径统一调用
- **涉及文件**: `src/agent/tool-executor.ts`(新), `src/agent/run-agent.ts`

#### OPT-06: 提取 LLM 编排器 `src/agent/llm-orchestrator.ts`
- [ ] 完成
- **问题**: `invokeLlmWithTools()` 和 `invokeLlmText()` 虽已提取为方法，但仍在 `AgentRuntime` 类内部，与调度逻辑紧耦合；缺少速率限制和超时控制
- **方案**:
  - 新建 `src/agent/llm-orchestrator.ts`
  - 提取 `LlmOrchestrator` 类，封装所有 LLM 交互
  - 添加请求超时控制
  - `AgentRuntime` 通过组合方式使用
- **涉及文件**: `src/agent/llm-orchestrator.ts`(新), `src/agent/run-agent.ts`

#### OPT-07: 提取 Weave 事件发射器 `src/agent/weave-emitter.ts`
- [ ] 完成
- **问题**: `run-agent.ts` 中直接构造 `weave.dag.node` / `weave.dag.detail` 事件并发射，与业务逻辑高度混杂（重试子节点、修复子节点等 30+ 处直接发射）
- **方案**:
  - 新建 `src/agent/weave-emitter.ts`
  - 提取所有 Weave DAG 事件发射为独立的语义方法
  - `emitToolAttemptNode()`, `emitRepairNode()`, `emitNodeStatus()` 等
  - `run-agent.ts` 中改为调用语义方法
- **涉及文件**: `src/agent/weave-emitter.ts`(新), `src/agent/run-agent.ts`

---

### 阶段三：TUI 层重构（App.tsx 拆分）

#### OPT-08: 提取输入框组件 `src/tui/components/InputBox.tsx`
- [ ] 完成
- **问题**: `App.tsx` 中输入处理占 300+ 行，包含光标定位、文本截断、中文宽度计算、placeholder 渲染等，全部混在主组件中
- **方案**:
  - 新建 `src/tui/components/InputBox.tsx`
  - 封装输入渲染逻辑：`renderInputWithCursor()`, `buildInputDisplayText()`, `fitInputPreview()`
  - 通过 props 接收 value/onChange/placeholder/prefix
- **涉及文件**: `src/tui/components/InputBox.tsx`(新), `src/tui/App.tsx`

#### OPT-09: 提取 DAG 树组件 `src/tui/components/WeaveDagTree.tsx`
- [ ] 完成
- **问题**: `buildWeaveTreeLines()` 函数 130+ 行，包含递归遍历、信号过滤、展开/折叠逻辑、图标渲染，全部在 `App.tsx` 内
- **方案**:
  - 新建 `src/tui/components/WeaveDagTree.tsx`
  - 提取 `buildWeaveTreeLines()` 和关联的辅助函数
  - 提取 `statusIcon()`, `isLowSignalDecisionLabel()`, `semanticToolTitle()`
  - 通过 props 接收节点数据和交互回调
- **涉及文件**: `src/tui/components/WeaveDagTree.tsx`(新), `src/tui/App.tsx`

#### OPT-10: 拆分状态管理 Hook
- [ ] 完成
- **问题**: `use-agent-state.ts` 单个 Hook 管理 7 个状态集合（status, thoughtText, toolHistory, currentTool, chatLogs, weaveDagNodes, latestError），382 行；`reverse().findIndex()` 性能为 O(n²)
- **方案**:
  - 拆分 `useWeaveDagNodes()` 为独立 Hook
  - 拆分 `useToolHistory()` 为独立 Hook
  - 修复 `reverse().findIndex()` 为 `findLastIndex()` 或从后遍历
  - 硬编码上限提取到 `defaults.ts`
- **涉及文件**: `src/tui/use-agent-state.ts`, `src/tui/hooks/use-weave-dag.ts`(新), `src/tui/hooks/use-tool-history.ts`(新)

---

### 阶段四：错误处理与类型安全

#### OPT-11: 添加运行时类型验证
- [ ] 完成
- **问题**: `run-agent.ts` 中 `toolCall.function.arguments` 直接使用无验证；`node.payload as ToolNodePayload` 强制转换无守卫；`ws-gateway.ts` 中 `req.body as RuntimeRawEvent` 无验证
- **方案**:
  - 为工具参数添加 Zod schema 验证
  - 为 DAG 节点 payload 添加类型守卫函数
  - 为 WS 网关 ingest 接口添加请求体验证
  - 消除不安全的 `as` 类型断言
- **涉及文件**: `src/agent/run-agent.ts`, `src/tools/tool-registry.ts`, `apps/weave-graph-server/src/gateway/ws-gateway.ts`

#### OPT-12: 统一错误处理模式
- [ ] 完成
- **问题**: 错误处理方式不统一——有些 throw，有些返回 null，有些静默忽略；`tryParseJson()` 返回 `{}` 掩盖错误；工具执行超时仅返回简单消息
- **方案**:
  - 新建 `src/utils/result.ts`，定义 `Result<T, E>` 类型
  - 工具执行链路改用 Result 模式
  - 为关键路径添加结构化错误上下文
  - `tryParseJson` 改为返回 Result
- **涉及文件**: `src/utils/result.ts`(新), `src/agent/run-agent.ts`, `src/agent/tool-executor.ts`

---

### 阶段五：图服务层优化

#### OPT-13: 修复图服务内存泄漏与连接管理
- [ ] 完成
- **问题**: `GraphProjector` 中 `seqByRun`/`dagIdByRun` Map 无限增长；WS 网关缺少 `ws.on('error')` 监听；缺少连接数限制
- **方案**:
  - `GraphProjector` 的 Map 改为 LRU 缓存，最多保留 100 个 run
  - WS 网关添加错误事件监听和连接数限制
  - 添加 run 结束时的清理逻辑
- **涉及文件**: `apps/weave-graph-server/src/projection/graph-projector.ts`, `apps/weave-graph-server/src/gateway/ws-gateway.ts`

#### OPT-14: 前端状态管理重构
- [ ] 完成
- **问题**: `graph-store.ts` 的 `applyEnvelope()` 方法 100+ 行，包含 6 种事件类型的处理逻辑；`payload as {...}` 类型断言重复 5 次；状态拷贝策略混乱
- **方案**:
  - 按事件类型拆分处理函数
  - 添加类型守卫替代 `as` 断言
  - 使用 immer 简化不可变更新
- **涉及文件**: `apps/weave-graph-web/src/store/graph-store.ts`

#### OPT-15: 前端组件拆分与性能优化
- [ ] 完成
- **问题**: `App.tsx` 中 `InspectorTextBlock` 内联定义；`styledEdges` 每次都重算；WS 连接管理在 useEffect 中可能重复创建；缺少 ErrorBoundary
- **方案**:
  - 提取 `InspectorTextBlock` 为独立组件
  - 为 `styledEdges`/`semanticNodes` 添加 `useMemo`
  - 提取 WS 连接管理为 `useWebSocket` Hook
  - 添加顶层 `ErrorBoundary`
- **涉及文件**: `apps/weave-graph-web/src/App.tsx`, `apps/weave-graph-web/src/hooks/useWebSocket.ts`(新), `apps/weave-graph-web/src/components/InspectorTextBlock.tsx`(新)

---

### 阶段六：Weave 插件与工具层优化

#### OPT-16: Weave 插件工具语义化解耦
- [ ] 完成
- **问题**: `weave-plugin.ts` 中 `semanticToolTitle()` 硬编码了 `command_exec`/`read_file`/`write_file` 的特殊处理逻辑；新增工具必须修改此文件
- **方案**:
  - 在工具定义中添加 `metadata` 字段（displayName, icon, category）
  - `weave-plugin.ts` 从工具注册表读取元数据，而非硬编码
  - `tool-registry.ts` 的 `register()` 支持元数据注册
- **涉及文件**: `src/tools/tool-types.ts`, `src/tools/tool-registry.ts`, `src/tools/builtins/*.ts`, `src/weave/weave-plugin.ts`

#### OPT-17: 命令执行工具安全加固
- [ ] 完成
- **问题**: `command-exec-tool.ts` 中 Windows 编码切换命令 `chcp 65001>nul & ${args.command}` 存在命令注入风险；`looksLikeMojibake()` 检测过于简单
- **方案**:
  - 使用 `shell: true` + 参数分离，避免直接字符串拼接
  - 加固编码检测逻辑
  - 添加命令长度限制
- **涉及文件**: `src/tools/builtins/command-exec-tool.ts`

---

### 阶段七：可观测性与日志

#### OPT-18: 日志系统升级
- [ ] 完成
- **问题**: `app-logger.ts` 使用 `appendFileSync` 同步写入阻塞主线程；无日志大小限制；无结构化日志格式
- **方案**:
  - 改为异步写入（`appendFile` 或写入流）
  - 添加日志文件大小限制与轮转
  - 支持 JSON 结构化日志格式
- **涉及文件**: `src/logging/app-logger.ts`

---

## 实施顺序与依赖

```
OPT-01 (工具函数) ──┐
OPT-02 (常量集中) ──┼── 阶段一（无依赖，可并行）
OPT-03 (协议共享) ──┘
         │
         ▼
OPT-04 (插件执行器) ──┐
OPT-05 (工具执行器) ──┼── 阶段二（依赖 OPT-01/02）
OPT-06 (LLM编排器) ──┤
OPT-07 (Weave发射器)──┘
         │
         ▼
OPT-08 (输入框组件) ──┐
OPT-09 (DAG树组件) ──┼── 阶段三（依赖 OPT-01/02）
OPT-10 (状态Hook) ───┘
         │
         ▼
OPT-11 (类型验证) ──┐
OPT-12 (错误处理) ──┘── 阶段四（依赖阶段二）
         │
         ▼
OPT-13 (图服务修复) ──┐
OPT-14 (前端Store) ───┼── 阶段五（依赖 OPT-03）
OPT-15 (前端组件) ────┘
         │
         ▼
OPT-16 (工具语义) ──┐
OPT-17 (安全加固) ──┘── 阶段六（依赖阶段二）
         │
         ▼
OPT-18 (日志升级) ──── 阶段七（独立）
```

## 验证方案

每个优化完成后执行：
1. `pnpm build` — 编译检查
2. `node scripts/verify-step-gate.mjs` — Step Gate 回归
3. `node scripts/verify-dag-matrix.mjs` — DAG 语义回归
4. 手动验证：`pnpm dev` 启动，多轮交互，`/weave step`，`/q` 退出
