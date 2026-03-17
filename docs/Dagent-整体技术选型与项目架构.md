# Dagent 整体技术选型与项目架构（TS + React）

## 一、整体技术选型

### 1. 语言与运行时
1. TypeScript（前后端统一）
2. Node.js 22 LTS（服务端）
3. React 19（前端）

### 2. 工程与包管理
1. Monorepo：pnpm workspace + Turborepo
2. 代码规范：ESLint + Prettier + TypeScript strict
3. 测试：Vitest（单测）+ Playwright（端到端）

### 3. 后端基础框架（Dagent Core）
1. 网关与 API：Fastify
2. WebSocket：Fastify WebSocket（用于 run 事件流）
3. 参数校验：Zod（请求、工具参数、事件 payload）
4. 日志：Pino（结构化日志）
5. 观测：OpenTelemetry（trace + metric，M2 起）

### 4. Agent Runtime 与模型接入
1. 自研轻量 Runtime Loop（按 PRD 分层，不重框架）
2. 模型适配层：统一 Provider 接口（OpenAI / Azure OpenAI 可插拔）
3. 流式输出：标准 delta 事件协议（gateway 到前端）
4. 工具协议：工具注册 + before/after hooks + 超时/取消

### 5. 记忆与存储（MVP）
1. Session：jsonl 文件（每会话转录 + 工具结果）
2. Long-term：Markdown 文件（USER、MEMORY、SOUL）
3. 文件访问：原子写 + 文件锁（避免并发污染）
4. 后续演进：可替换 SQLite/PostgreSQL，不影响上层接口

### 6. 前端（React 控制台）
1. 构建：Vite
2. 路由：React Router
3. 数据流：TanStack Query（请求缓存）+ Zustand（会话 UI 状态）
4. 实时事件：WebSocket 客户端订阅 run 生命周期与 tool 事件
5. 可视化：先做时间轴，M3 增加 DAG 视图（React Flow）

---

## 二、推荐项目架构（分层 + 可替换）

建议用 Monorepo，按“应用层 + 领域包”拆分：

### 1. apps
1. gateway：HTTP + WebSocket 接入层
2. web：React 控制台（聊天、run 状态、事件时间轴、记忆查看）
3. cli（可选）：本地调试入口

### 2. packages（核心领域）
1. orchestrator：任务受理、run 队列、会话串行控制、abort/retry/continue
2. runtime-engine：runLoop、turnLoop、tool-call 循环、终止条件
3. memory-core：Session/Long-term 接口与策略
4. memory-fs：文件实现（jsonl + md）
5. skill-engine：skill 解析、匹配、优先级合并
6. tool-registry：工具注册、schema 校验、hook 执行
7. context-builder：base prompt + skill + memory + runtime context 组装
8. model-adapters：provider 抽象与多模型适配
9. event-bus：统一事件协议、发布订阅、回放接口
10. shared-types：请求、响应、事件、run、错误码等公共类型

### 3. infra
1. config：环境配置与配置校验
2. observability：日志、trace、metrics
3. security：鉴权、限流、危险工具审批接口

---

## 三、与 PRD 各层一一映射

### 1. 接入层 Gateway Layer
1. apps/gateway
2. 责任：鉴权、请求规范化、回传流式响应
3. 禁止：不直接调用模型 SDK

### 2. 编排层 Orchestration Layer
1. packages/orchestrator
2. 责任：submit、abort、continue、subscribe，run 状态机、排队策略

### 3. Agent 运行层 Runtime Layer
1. packages/runtime-engine
2. 责任：prompt 构建、LLM 调用、工具循环、终止条件管理

### 4. 能力层 Capabilities
1. memory-core + memory-fs
2. tool-registry
3. skill-engine
4. context-builder

### 5. 基础设施层 Infra
1. event-bus
2. observability
3. config
4. security

---

## 四、核心接口建议（TS 形态）

### 1. Orchestrator
1. submit(request): runId
2. abort(runId): result
3. continue(sessionKey, input): runId
4. subscribe(runId, listener): unsubscribe

### 2. Runtime
1. runTurn(context): TurnResult
2. runLoop(context): RunResult

### 3. Memory
1. loadSession(sessionKey)
2. appendSession(sessionKey, message)
3. loadLongTerm(query)
4. upsertLongTerm(record)

### 4. Tool Registry
1. register(tool)
2. resolve(name)
3. execute(name, args, context)

### 5. Skill Engine
1. resolveSkills(context)
2. composeSystemPrompt(base, skills)

---

## 五、前端 React 信息架构（建议）

### 1. Chat 工作区
1. 消息流（delta/final）
2. 工具调用卡片（参数、结果、耗时、状态）

### 2. Run 观测面板
1. 生命周期时间轴（queued/running/succeeded/failed/aborted）
2. 指标区（latency、token、toolCount）

### 3. 记忆管理面板
1. Session transcript 查看与检索
2. Long-term 记忆审阅、回滚、冲突提示

### 4. WEAVE 准备面板（M3）
1. DAG 节点浏览
2. turn/tool 前编辑入口
3. branchFrom 分叉入口

---

## 六、分阶段实施建议（与 PRD 对齐）

### 1. M1（2-3 周）
1. 打通 gateway + orchestrator + runtime
2. 接入 1 个模型 provider
3. 上线 3-5 个基础工具（只读优先）
4. 完成 session 文件持久化

### 2. M2（2 周）
1. long-term 记忆注入与沉淀策略
2. skill 动态注入与冲突审计
3. 标准事件流 + 基础监控

### 3. M3（2 周）
1. 统一 DAG 事件模型
2. 回放与分叉
3. turn/tool 边界受控编辑
