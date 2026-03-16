# Weave DAG Runtime 技术架构设计文档

## 1. 文档目标

本文件用于沉淀 Weave 的完整技术方案，明确以下问题：

- Weave 在系统中的定位（观测器 vs 调度器）
- Agent-loop 向 DAG Runtime 演进的重构路线
- 三种运行模式（off / on / step）的统一语义与实现
- 在不破坏现有工具执行链路的前提下实现可控执行
- 面向规划-执行架构 Agent 的兼容策略
- 中期是否扩展为中间件或独立执行内核的判断依据

---

## 2. 产品与技术定位

### 2.1 Weave 的本质

Weave 不是单纯的 UI 功能，也不是替代工具系统的执行器。其核心定位是：

1. 执行调度层（Execution Control Plane）
2. 可观测层（Observability Plane）
3. 交互干预层（Human-in-the-loop Control）

### 2.2 目标能力

- 将黑盒 Agent 执行过程显式化为可追踪 DAG
- 支持节点级审批、编辑、跳过、终止
- 支持局部重跑、分支回放与版本化审计
- 保持对既有工具系统与模型调用兼容

---

## 3. 运行模式定义（最终版）

### 模式 0：weave=off（完全关闭）

行为：

- 走原始 Agent-loop 快速路径
- 不触发 Weave 相关钩子
- 不构建 DAG 节点状态
- 保持传统黑盒运行体验

设计目标：

- 100% 兼容当前行为
- 作为性能基线与故障回退路径

### 模式 1：weave=on（观测模式）

行为：

- 仍按 DAG 语义记录每个执行 step
- 不阻塞执行，不插手调度
- Weave 仅消费事件并渲染树形视图

设计目标：

- 提供完整过程可见性
- 保持与 off 模式接近的吞吐与延迟

### 模式 2：weave=step（步进拦截模式）

行为：

- 在关键节点（尤其 Tool 节点）进入运行态前触发拦截
- Weave 返回未 resolve 的 Promise，调度器暂停该节点推进
- 用户动作 resolve 后继续：approve / edit / skip / abort

设计目标：

- 将节点执行权显式交给用户
- 让运行过程可控、可修正、可审计

---

## 4. 核心架构分层

### 4.1 能力层（保持稳定）

职责：

- ToolRegistry
- 工具参数校验与执行
- 执行上下文传递

约束：

- 不因 DAG 重构而改变工具接口
- 保证旧工具零改造可运行

### 4.2 执行语义层（新增）

职责：

- 定义 Node/Edge/Graph 数据模型
- 定义节点状态机与可执行动作
- 提供事件溯源数据结构

### 4.3 调度层（渐进替换）

职责：

- 选择 ready 节点执行
- 管理阻塞、并行、汇合
- 接入 Step Gate 拦截

### 4.4 表现层（已存在，继续演进）

职责：

- 消费标准化事件流
- 渲染 TUI DAG
- 提供节点级操作交互

---

## 5. DAG 数据模型

### 5.1 节点类型

建议最小类型集：

- llm：模型推理节点
- tool：工具调用节点
- final：最终回答节点
- condition（后续）：条件分支节点
- join（后续）：并行汇合节点
- plan（后续）：计划生成节点

### 5.2 边类型

- control：控制流边（先后依赖）
- data：数据流边（参数或结果传递）
- decision（可选）：决策语义边（plan -> 子节点）

### 5.3 节点状态机

状态集合：

- pending
- ready
- blocked
- running
- success
- fail
- skipped
- aborted

关键状态转移：

- pending -> ready：依赖满足
- ready -> blocked：step 拦截中
- blocked -> running：审批放行
- blocked -> skipped：人工跳过
- running -> success/fail：执行结束
- 任意可执行态 -> aborted：人工终止

### 5.4 数据流模型（Data Flow）

为支持“修改节点间数据传递并局部重跑”，必须在控制流之外显式定义数据流。

建议引入全局 StateStore（或 ContextBus）并增加以下约束：

- 每个节点必须声明输入依赖（inputs）与输出产物（outputs）
- 每条数据边必须声明字段映射（mapping）与可选转换函数（transform）
- 节点仅允许读取已声明输入键，禁止隐式读取全局上下文
- 节点执行完成后将结果写回命名空间（如 run.step.nodeId.output）

建议最小数据结构：

- NodeInputSpec：sourceNodeId、sourceKey、targetKey、required
- NodeOutputSpec：key、schema、persistPolicy
- DataEdgeSpec：fromNode、toNode、mapping、transformId

关键收益：

- 可追踪：最终输入可追溯来源节点
- 可编辑：可在边级修改映射并重跑下游
- 可缓存：上游未变时复用中间结果

### 5.5 图安全校验（Cycle / Deadlock）

即使目标是 DAG，也必须在图构建和运行时做双重防护。

构建期校验：

- 新增节点/边时执行环路检测（Cycle Detection）
- 若检测到 A -> B -> A，直接拒绝图更新并发出 graph.validation.failed

运行期校验：

- 调度器周期检测死锁：无 running、无 ready，但仍有 pending/blocked
- 区分人工阻塞（step gate）与结构性死锁（依赖无法满足）

建议新增事件：

- graph.validation.failed
- graph.deadlock.detected

### 5.6 执行器错误域（Executor Error Boundary）

Executor 必须捕获所有异常并转换为可调度状态，不能让 Node.js 进程级崩溃。

建议错误分层：

- user_error：参数、权限、路径等可修复错误
- retryable_error：网络超时、限流、瞬时依赖失败
- fatal_error：协议损坏、执行器内部 bug

处理策略：

- user_error：节点 fail，提示编辑参数后重跑
- retryable_error：按策略自动重试（次数、退避、超时上限）
- fatal_error：节点 fail 并触发 run 降级或终止

建议新增字段：

- errorType、errorCode、retryCount、retryPolicyId

### 5.7 事件协议治理（Schema Versioning）

为支持 TUI、Web、回放器多端共用，事件协议必须稳定演进。

建议约束：

- 每条事件携带 schemaVersion
- 每条事件携带 eventId（幂等键）
- 新增字段向后兼容，禁止破坏性重命名
- 快照 + 增量事件可重建完整运行图

建议最小元信息：

- eventId、schemaVersion、runId、nodeId、timestamp、producer
- correlationId（用于串联审批与执行）

---

## 6. Step Gate 核心机制

### 6.1 拦截点

首期建议拦截 Tool 节点，后续扩展到 llm 节点。

### 6.2 Promise Gate 模式

流程：

1. 节点进入 ready
2. 调度器发出 pending_approval 事件
3. Weave UI 展示审批卡片并返回 Promise
4. Promise resolve 为 action
5. 调度器依据 action 推进状态

动作语义：

- approve：原参数执行
- edit：替换参数后执行
- skip：节点置为 skipped，并注入标准跳过结果
- abort：本轮 run 终止

---

## 7. Agent-loop 到 DAG Runtime 的迁移设计

### 7.1 当前 while 的本质

当前 while 循环可视作线性 DAG 的执行器：

- 每次循环是一个 step
- tool_calls 是 step 的子节点集合
- 缺少显式节点对象与依赖图

### 7.2 迁移原则

- 先事件标准化，再调度器替换
- 保留 legacy runner 作为兼容与回退
- 每阶段必须可验证行为一致

### 7.3 分阶段路线

阶段 A：事件标准化

- 在现有 loop 内发出标准节点事件
- 建立 runId / nodeId / edgeId 规范
- TUI 完全基于事件渲染

阶段 B：最小 DagRunner

- 引入 Scheduler + NodeExecutor 接口
- 只支持 llm/tool/final 节点
- 与现有 while 结果一致

阶段 C：分叉与回放

- 增加 checkpoint 与 branchId
- 支持从任意节点重跑

阶段 D：条件与并行

- 增加 condition/join 节点
- 支持并行工具调用与汇合策略

---

## 8. 兼容性与稳定性策略

### 8.1 off 模式无损保证

- 继续保留 Legacy Runner
- 新 DAG Runner 仅在 on/step 启用
- 配置开关可动态回退

### 8.2 工具层稳定契约

- 工具执行函数签名不变
- 参数结构不变
- 上下文传递机制不变

### 8.3 行为一致性回归

同一输入在 off 与 on（非拦截）模式下对比：

- 工具调用顺序
- 参数一致性
- 最终输出语义一致性

---

## 9. 面向规划-执行架构 Agent 的适配

### 9.1 计划节点一等化

- Plan 节点输出子图草案
- 调度器将草案扩展为可执行节点
- 执行图从静态变为动态扩图

### 9.2 用户下一步动作的确定方式

不依赖猜测，采用显式状态机：

- 每个 blocked 节点给出 allowed actions
- UI 展示可操作动作与建议动作
- 用户选择后写入事件流，调度器据此推进

### 9.3 策略层扩展

后续可增加：

- 自动批准策略（白名单工具）
- 风险升级策略（敏感命令强制人工）
- 预算策略（token/耗时阈值）

---

## 10. 中间件化 vs 独立 Agent 化

### 10.1 当前阶段建议

先做自有 runtime 跑通，再做外部适配。

原因：

- 先验证核心价值（可控执行）
- 降低对外部宿主耦合
- 减少早期适配成本

### 10.2 中期演进

通过 adapter 适配主流宿主（如 OpenClaw / ClaudeCode）：

- 定义宿主无关执行事件协议
- 单独实现事件映射与动作回写
- 运行内核保持一致

### 10.3 长期判断标准

若满足以下条件可考虑独立产品化：

- 节点级回放/分叉成为高频能力
- 宿主适配受限严重影响核心能力
- 企业侧对审计与策略控制需求显著

---

## 11. 建议的工程落地结构

建议新增目录：

- src/runtime/graph-types.ts
- src/runtime/event-types.ts
- src/runtime/scheduler.ts
- src/runtime/node-executors.ts
- src/runtime/step-gate.ts
- src/runtime/runner-legacy.ts
- src/runtime/runner-dag.ts

现有模块关系：

- src/agent/run-agent.ts：模式分发与会话入口
- src/tools/*：能力层保持稳定
- src/tui/*：消费标准化 runtime 事件
- src/weave/*：语义增强与可视化插件

---

## 12. 核心风险与缓解

风险 1：交互复杂度过高

- 缓解：默认 off/on，step 作为高级模式逐步引导

风险 2：性能退化

- 缓解：off 快速路径保留；事件采样与批处理渲染

风险 3：一致性问题

- 缓解：双 runner 对照回归 + 会话回放测试

风险 4：并行节点引发幂等问题

- 缓解：工具幂等标签、并发隔离、失败重试策略

---

## 13. 价值指标（用于阶段验收）

建议以以下指标衡量方案价值：

- 平均失败恢复时间（MTTR）
- 全量重跑比例
- 节点级重跑使用率
- 人工审批命中率
- 任务总体耗时与 token 成本
- 审计复盘完成时间

---

## 14. 当前状态与下一步

当前状态：

- Weave 已支持 off/on/step 三态体验与基础 DAG 渲染
- 已支持 Step Gate 审批动作（approve/edit/skip/abort）
- 已具备节点耗时、详情、选择与折叠交互

下一步优先级：

1. 事件协议标准化（先不替换调度器）
2. 抽象 runner 接口并落地 DagRunner 最小版本
3. 建立 off/on 行为一致性自动回归
4. 引入 checkpoint 与分支重跑机制

---

## 15. 文档维护规则

- 每次新增节点类型或状态转移，必须更新第 5 章与第 6 章
- 每次重构调度路径，必须更新第 7 章迁移说明
- 每次模式语义变化，必须更新第 3 章
- 每次目录结构变化，必须同步更新架构总览文档
