# Dagent 简化版 PRD（基于 OpenClaw 架构精髓）

## 1. 文档定位

本 PRD 定义一个简化版 Dagent：
- 保留 OpenClaw 的核心思想：文件+会话记忆、工具调用、Skill 注入、网关接入、任务分发、Agent 运行层。
- 强化解耦：明确层次边界、接口契约、可替换点。
- 面向后续演进：可平滑扩展到 WEAVE（DAG 观测与可控执行）与更多渠道/模型。

该版本强调“先跑通核心闭环，再逐步增强”，避免一次性复制生产级复杂度。

---

## 2. 背景与机会

### 2.1 背景
OpenClaw 已验证了以下能力组合在真实场景的有效性：
1. Gateway 统一接入多渠道请求。
2. Auto-reply 负责编排消息、策略与回复分发。
3. Agent Runtime 负责 LLM 循环、工具调用、上下文治理。
4. 文件化会话与可恢复状态，实现低门槛持久化。

### 2.2 机会
新项目 Dagent 目标不是“复刻 OpenClaw 全功能”，而是打造一个：
1. 结构更清晰、边界更干净的最小可用 Agent 平台。
2. 天然支持实时可观测（为 WEAVE 做准备）。
3. 便于快速实验与二次开发。

---

## 3. 产品目标

### 3.1 核心目标
1. 支持单轮与多轮 Agent 对话，包含工具调用。
2. 提供文件+会话双层记忆能力。
3. 提供 Skill 机制注入系统提示与策略。
4. 提供统一 Gateway 接口，支持至少 1 种前端接入（CLI 或 WebSocket）。
5. 提供任务分发与执行状态追踪。

### 3.2 非目标（MVP 阶段）
1. 不追求全渠道适配（如全量 IM 平台）。
2. 不追求复杂权限系统与多租户隔离。
3. 不实现完整插件生态，仅保留可扩展接口。
4. 不做复杂自动压缩与高阶重试策略（可留扩展点）。

---

## 4. 设计原则

1. 分层单向依赖：上层依赖下层接口，不反向耦合。
2. 事件优先：关键执行步骤必须事件化，可观测可回放。
3. 文件优先持久化：先用文件系统保证可读可调试，再考虑数据库。
4. 可替换性：模型提供方、工具注册、Skill 解析都可替换。
5. 最小可行闭环：先保证稳定运行，再叠加高级能力。

---

## 5. 总体架构

## 5.1 分层视图

1. 接入层（Gateway Layer）
- 负责协议接入、鉴权、请求规范化、响应回传。

2. 编排层（Orchestration Layer）
- 负责任务受理、队列调度、会话路由、策略决策。

3. Agent 运行层（Agent Runtime Layer）
- 负责 prompt 构建、LLM 调用、工具循环、结果整形。

4. 能力层（Capabilities Layer）
- 工具系统、Skill 系统、记忆系统、上下文构建器。

5. 基础设施层（Infra Layer）
- 文件存储、日志、事件总线、配置、可观测。

## 5.2 模块解耦规则

1. Gateway 不直接操作 LLM，只调用 Orchestrator。
2. Orchestrator 不直接操作 provider SDK，只调用 Runtime。
3. Runtime 不直接依赖渠道细节，只使用标准上下文结构。
4. Memory/Tool/Skill 通过接口注入 Runtime，不在 Runtime 内硬编码。

---

## 6. 核心能力设计

## 6.1 记忆系统（OpenClaw 精髓之一）

### 6.1.1 记忆模型
1. 短期记忆（Session Memory）
- 每个会话的消息序列、工具结果、临时状态。
- 生命周期：会话维度，可清理可分支可压缩。

2. 长期记忆（File Memory）
- 以md文件存储用户偏好、知识片段、历史总结。
- 生命周期：跨会话持久存在。

### 6.1.2 存储方案
1. sessions/
- 保存会话元数据与消息转录。
- 示例文件：session-{id}.jsonl。

2. memories/
- USER.md: 用户长期偏好与稳定事实。
- MEMORY.md: 长期记忆
- SOUL.md: Agent的风格和语气等
- repo/: 项目级知识（可选）。

### 6.1.3 读写策略
1. 读取阶段
- 会话开始时加载短期记忆。
- Prompt 构建时按策略注入长期记忆片段。

2. 写入阶段
- 每轮结束写入短期记忆。
- 满足规则时将摘要沉淀到长期记忆。

3. 记忆治理
- 大小上限、版本号、冲突合并规则。
- 提供可审计日志，避免“静默污染”。

---

## 6.2 工具调用系统（OpenClaw 精髓之一）

### 6.2.1 工具模型
每个工具定义包括：
1. name
2. description
3. inputSchema
4. execute(context, args)
5. safetyPolicy（可选）

### 6.2.2 调用流程
1. Runtime 收到模型 tool call。
2. Tool Registry 校验工具名与参数。
3. 执行前钩子 beforeToolCall（可审批/改参/阻断）。
4. 执行工具并产出结果。
5. 执行后钩子 afterToolCall（可脱敏/裁剪/补元数据）。
6. 将工具结果回填到消息流并继续下一步循环。

### 6.2.3 关键保障
1. 超时控制与取消。
2. 工具输出大小限制。
3. 错误结构标准化。
4. 并行/串行模式可配置。

---

## 6.3 Skill 系统（OpenClaw 精髓之一）

### 6.3.1 Skill 定义
Skill 是“可组合的行为片段”，包括：
1. 触发条件（关键词、会话标签、渠道、角色）。
2. 系统提示片段（system additions）。
3. 可用工具白名单（可选）。
4. 输出风格约束（可选）。

### 6.3.2 注入策略
1. 会话启动：注入全局基础 Skill。
2. 每轮开始：根据上下文筛选动态 Skill。
3. 冲突处理：优先级 + 合并规则 + 审计日志。

### 6.3.3 目标
- 让行为可配置而不是硬编码在 Runtime 内。

---

## 6.4 网关接入（OpenClaw 精髓之一）

### 6.4.1 接口目标
1. 标准请求结构：sessionKey、message、attachments、metadata。
2. 标准响应结构：runId、status、delta/final、error。

### 6.4.2 MVP 接入形式
1. WebSocket Gateway（推荐）
- 支持实时事件推送（message delta、tool event、lifecycle）。

2. HTTP API（可选）
- 用于同步请求或管理操作。

### 6.4.3 Gateway 职责边界
1. 负责鉴权与参数校验。
2. 不负责业务策略与模型执行。
3. 统一将请求转给 Orchestrator。

---

## 6.5 任务分发（OpenClaw 精髓之一）

### 6.5.1 Run 模型
每次用户请求产生一个 run：
1. runId
2. sessionKey
3. status（queued/running/succeeded/failed/aborted）
4. timestamps
5. metrics（tokens、latency、toolCount）

### 6.5.2 分发策略
1. 同会话串行（默认）
- 避免上下文竞争与状态冲突。

2. 跨会话并行
- 由全局队列和资源限制控制并发度。

3. 控制能力
- 支持 abort、retry、continue。

---

## 6.6 Agent 运行层（OpenClaw 精髓之一）

### 6.6.1 运行时职责
1. 组装系统提示（base + skill + memory + runtime context）。
2. 调用 LLM。
3. 处理模型增量输出。
4. 识别并执行工具调用。
5. 管理 loop 终止条件。

### 6.6.2 标准循环抽象
1. turn_start
2. llm_request
3. llm_stream/message_update
4. tool_execution_start/update/end（若有）
5. turn_end
6. agent_end

### 6.6.3 终止条件
1. 模型返回最终文本且无工具调用。
2. 达到最大步数。
3. 被外部取消。
4. 出现不可恢复错误。

---

## 7. 为 WEAVE 预留的架构位点

## 7.1 DAG 事件模型
必须统一事件结构：
1. eventId
2. runId
3. sessionKey
4. nodeType（turn/tool/llm/memory/skill/gateway）
5. phase（start/update/end）
6. payload（可脱敏）
7. timestamp

## 7.2 可控编辑点（安全边界）
1. turn 边界编辑（可改下一轮提示）。
2. tool 执行前编辑（可改参数或阻断）。
3. 不支持修改已完成历史节点，只支持分叉。

## 7.3 分叉机制
1. branchFrom(runId, nodeId)
2. 新分支继承上下文快照
3. 原分支保持可回放

---

## 8. 关键接口草案

## 8.1 Orchestrator 接口
1. submit(request): runId
2. abort(runId): result
3. continue(sessionKey, input): runId
4. subscribe(runId, listener): unsubscribe

## 8.2 Runtime 接口
1. runTurn(context): TurnResult
2. runLoop(context): RunResult

## 8.3 Memory 接口
1. loadSession(sessionKey)
2. appendSession(sessionKey, message)
3. loadLongTerm(query)
4. upsertLongTerm(record)

## 8.4 Tool Registry 接口
1. register(tool)
2. resolve(name)
3. execute(name, args, context)

## 8.5 Skill Engine 接口
1. resolveSkills(context)
2. composeSystemPrompt(base, skills)

---

## 9. 非功能需求

1. 稳定性
- 单次 run 不应因单个工具异常导致进程崩溃。

2. 可观测性
- 每个 run 至少包含生命周期事件、时延、错误码。

3. 可恢复性
- 进程重启后可从会话文件恢复。

4. 可扩展性
- 新增工具/Skill/渠道无需修改 Runtime 核心。

5. 性能
- 单会话常规交互延迟可接受，支持基本并发会话。

---

## 10. 里程碑规划

## M1: 最小闭环（2-3 周）
1. Gateway + Orchestrator + Runtime 跑通。
2. 支持 1 个模型 provider。
3. 支持 3-5 个基础工具。
4. 会话记忆文件读写。

## M2: 记忆与 Skill 完整化（2 周）
1. 长期记忆读写与注入。
2. Skill 解析与动态注入。
3. 基础可观测事件。

## M3: WEAVE Ready（2 周）
1. 节点事件标准化。
2. DAG 存储与回放。
3. 安全编辑点（turn/tool 前）。

---

## 11. 风险与应对

1. 风险：过早引入复杂控制逻辑导致系统失稳
- 应对：先观测后控制，分阶段上线。

2. 风险：记忆污染影响回复质量
- 应对：引入记忆写入门槛与人工回滚。

3. 风险：工具副作用不可逆
- 应对：默认只读工具优先，危险工具需审批。

4. 风险：分支和回放语义复杂
- 应对：统一事件协议与快照策略。

---

## 12. 成功标准（验收）

1. 功能验收
- 能完成多轮对话与工具调用。
- 能在文件中持久化会话与长期记忆。
- 能根据 Skill 动态调整行为。

2. 架构验收
- 各层职责清晰，依赖方向单向。
- 新增工具/Skill 不改 Runtime 核心。

3. WEAVE 验收准备度
- 每次 run 可导出完整事件序列。
- 可在 turn/tool 边界执行受控修改。

---

## 13. 与 OpenClaw 的映射关系（简化版）

1. Gateway
- OpenClaw: gateway/server-methods
- Dagent: gateway adapters + unified request schema

2. Dispatch/Orchestration
- OpenClaw: auto-reply dispatch + reply resolver
- Dagent: orchestrator + run queue

3. Runtime
- OpenClaw: embedded runner + attempt
- Dagent: runtime loop engine（简化）

4. Memory
- OpenClaw: session transcript + memories
- Dagent: session files + long-term memory files

5. Tools
- OpenClaw: openclaw coding tools + tool callbacks
- Dagent: tool registry + before/after hooks

6. Skills
- OpenClaw: skill prompt injection
- Dagent: skill engine + selector

7. 观测与控制
- OpenClaw: event callbacks + lifecycle
- Dagent: event bus + DAG store + controlled edit points

---

## 14. 最终结论

Dagent 应该是一套“继承 OpenClaw 精髓、但更解耦更可控”的简化架构：
1. 保留文件+会话记忆、工具、Skill、网关、任务分发、Agent 运行核心。
2. 用清晰分层与标准接口降低复杂度。
3. 从 Day 1 预留 WEAVE 事件模型与编辑边界。

这样既能快速落地 MVP，也能为后续高级能力（DAG 可视化、在线编辑、分叉调试、企业治理）提供稳定底座。
