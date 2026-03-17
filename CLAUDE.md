# CLAUDE.md

本文件为 Claude Code（claude.ai/code）在此仓库中工作时提供指导。

## 项目概述

Dagent 是一个带有实时 DAG 可视化的 TypeScript CLI 智能体。支持多轮对话、工具编排、插件系统，以及基于 DAG 的执行可观测性和人工审批（Step Gate）的 Weave 模式。

**语言规范：** 所有文档、注释、UI 文字和提交消息均使用中文。

## 常用命令

```bash
# 安装依赖
pnpm install

# 开发模式（仅 CLI）
pnpm dev

# 构建
pnpm build

# 生产运行
pnpm start

# 全栈启动（CLI + 图服务器 + 图前端 + 自动打开浏览器）
pnpm dev:graph:all
pnpm dev:graph:stop    # 干净关闭
pnpm dev:graph:logs    # 流式查看后端日志

# 验证
pnpm build                              # 编译检查
node scripts/verify-step-gate.mjs       # Step Gate 冒烟测试（批准/编辑/跳过）
node scripts/verify-dag-matrix.mjs      # DAG 语义矩阵（环检测、死锁、重试）
pnpm verify:p0                          # 完整 P0 套件（构建 + 所有验证）
```

## 架构

### Monorepo 结构（pnpm workspaces）

- **`src/`** — 核心 CLI 智能体运行时（入口：`src/index.ts`）
- **`apps/weave-graph-server/`** — Express + WebSocket 网关，接收运行时事件并向 Web 客户端广播图协议
- **`apps/weave-graph-web/`** — Vite + React Flow + Zustand 前端，用于 DAG 可视化

### 核心运行时层（`src/`）

| 层级 | 关键文件 | 职责 |
|------|----------|------|
| 入口 | `index.ts` | CLI 启动、TTY/非 TTY 检测、会话生命周期、图事件转发 |
| 智能体 | `agent/run-agent.ts` | 多轮循环、插件钩子、Step Gate 审批、事件发射 |
| LLM | `llm/qwen-client.ts` | OpenAI 兼容封装（流式、工具调用） |
| 工具 | `tools/tool-registry.ts` | 注册表模式；内置工具：`command_exec`、`read_file`、`write_file` |
| 运行时 | `runtime/dag-graph.ts`、`runner-selector.ts` | 带状态机的 DAG 数据模型，运行策略选择（legacy vs DAG） |
| Weave | `weave/weave-plugin.ts` | 观察者插件，将智能体事件转换为层级 DAG 节点事件 |
| TUI | `tui/App.tsx` | Ink/React 终端 UI，包含 DAG 树渲染和 Step Gate 键盘操作 |
| 记忆 | `memory/memory-store.ts` | 文件型：`SOUL.md`（性格）、`USER.md`（偏好）、`MEMORY.md`（长期记忆） |
| 会话 | `session/session-recorder.ts` | 每会话 JSONL 录制 |
| 日志 | `logging/app-logger.ts` | 运行时日志 + 对话链路日志（Markdown） |

### 数据流

```
用户输入 → src/index.ts → AgentRuntime (run-agent.ts)
  → QwenClient (LLM) → ToolRegistry (工具执行)
  → WeavePlugin (DAG 事件) → TUI 渲染
  → [可选] HTTP POST → graph-server → WebSocket → graph-web
```

### 关键模式

- **事件驱动：** 智能体发射有类型的事件（`run.start`、`llm.delta`、`tool.execution.*`、`plugin.output`、`run.completed`）；插件和 TUI 订阅这些事件
- **插件系统：** `AgentLoopPlugin` 接口，钩子包括：`beforeLlmRequest`、`afterLlmResponse`、`beforeToolExecution`、`afterToolExecution`
- **DAG 状态机：** 节点经历 `pending → ready → running → {success/fail/skipped/aborted}` 状态转换，含环检测
- **图协议：** 版本化信封（`weave.graph.v1`），事件类型：`node.upsert`、`edge.upsert`、`node.status`、`node.io`、`layout.hint`
- **文件优先持久化：** 会话为 JSONL，记忆为 Markdown，日志为按天文件——无数据库

### 图可视化技术栈

- **服务端**（`apps/weave-graph-server/`）：`GraphProjector` 规范化运行时事件 → `GraphGateway` 通过 WebSocket 广播（Token 鉴权、仅限本地、心跳）
- **Web 端**（`apps/weave-graph-web/`）：Zustand store 管理每个 DAG 的状态，Dagre 计算布局，React Flow 渲染自定义 `SemanticNode` 组件

## 配置

- **LLM 配置：** `config/llm.config.json`（provider、model、baseUrl、apiKey/apiKeyEnv、temperature、maxTokens）
- **模板：** `config/llm.config.template.json`
- **环境变量：** `QWEN_API_KEY`、`WEAVE_GRAPH_INGEST_URL`、`WEAVE_GRAPH_TOKEN`、`WEAVE_GRAPH_MANAGED=1`

## 贡献检查清单

每次修改后执行：
1. `pnpm build`
2. `node scripts/verify-step-gate.mjs`
3. 手动交互测试：多轮输入 → `/weave step` → `/q` 退出

若架构发生变化，同步更新以下文档：
- `docs/project/development-progress.md`
- `docs/project/architecture-and-files.md`

## 任务完成后提交规范

**每次任务完成后，必须将本次修改提交到本地 Git 仓库。**

### 提交流程

1. 确认所有相关文件已修改完毕
2. 使用 `git add` 将变更文件加入暂存区（优先按文件名添加，避免 `git add -A`）
3. 使用中文撰写提交消息，格式如下：

```
<类型>(<范围>): <简短描述>

<详细说明（可选）>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

### 提交类型（type）

| 类型 | 适用场景 |
|------|----------|
| `feat` | 新增功能 |
| `fix` | 修复 Bug |
| `refactor` | 重构（不新增功能、不修复 Bug） |
| `docs` | 仅文档变更 |
| `style` | 代码格式调整（不影响逻辑） |
| `test` | 新增或修改测试 |
| `chore` | 构建流程、依赖管理等杂项 |

### 示例

```bash
git add src/agent/run-agent.ts src/tui/App.tsx
git commit -m "$(cat <<'EOF'
feat(agent): 新增 Step Gate 超时自动跳过机制

- 超过 30 秒无操作时自动跳过当前步骤
- 在 TUI 中显示倒计时提示

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

> **注意：** 仅在用户明确要求时才执行 `git push`，本地提交无需确认。
