# 📜 Weave 引擎 AI 编码规范与架构宪法 (WEAVE_ARCH)

## 0. 核心定位 (Core Identity)
Weave 不是一个普通的聊天玩具，而是一个对标 Vercel、Linear 的**工业级、确定性智能体调度引擎 (The Deterministic Agent Engine)**。
我们的核心能力是：**Observe (洞察) . Intercept (拦截) . Rewind (回溯)**。

## 1. 视觉与交互铁律 (UI/UX Directives - "Quiet Luxury")
- **极简与隐奢：** 绝对禁止使用高饱和度的彩色（红绿蓝）和浮夸的渐变。UI 核心色调为曜石黑（Obsidian Black）、冷银灰和极度克制的紫/蓝色微光（#8B5CF6）。
- **字体与排版：** 标题强制使用 `Space Grotesk` 或 `Inter`。Slogan 与核心标识必须具备宽字距（`letter-spacing: 0.15em` 及以上），维持呼吸感。
- **材质与光影：** 组件悬浮必须使用毛玻璃质感（`backdrop-filter: blur(16px)` + `background: rgba(255,255,255,0.03)`），并配合内部顶部高光（`inset 0 1px 0 rgba(255,255,255,0.1)`）。子元素**绝对不可**使用实色遮挡外层毛玻璃。
- **动画性能 (60FPS)：** 所有的形变与位移强制使用 CSS `transform` 和 `opacity`。严禁在动画中使用 `width/height/top/left` 引发 Layout Thrashing。复杂的 SVG 绘制必须使用 `stroke-dasharray` 和 `stroke-dashoffset`。

## 2. 状态与时空穿梭法则 (State & Time-Travel Rules)
- **绝对不可变历史 (Immutable History)：** 永远不修改已发生的 DAG 执行历史。任何人类拦截、参数覆盖、节点重跑，**必须 Fork 出一条全新的 DAG 执行时间线 (Execution Branch)**。
- **中央黑板模式 (Blackboard Pattern)：** 节点本身绝对无状态。大文本（Prompt、LLM 输出、工具结果）必须剥离并存入 `blackboard_message`。节点间流转和日志记录仅传递 `messageId` 指针。
- **重放截断 (Topological Replay)：** 在反序列化（Hydration）恢复图状态时，拉取历史 WAL 日志**必须按“拓扑血缘”截断**，严禁把并行无关节点的脏日志卷入新分支。

## 3. 数据库与持久化铁律 (Database & WAL Directives)
- **并发锁死防守：** 初始化 SQLite 时，**必须强制开启 `PRAGMA journal_mode = WAL;`**，确保多节点高并发下的读写安全。
- **微批处理 (Micro-batching)：** WAL 日志写入必须通过 `WeaveWalManager` 的队列进行缓冲，使用 `setInterval` 配合事务 (`db.transaction`) 批量刷盘，绝对禁止单条 Event 直接触发 INSERT。
- **关系型外键：** 一对多关系（Session -> DAGs）必须使用外键（`session_id`）反向查找。**绝对禁止**在 `session` 表中存储 DAG ID 数组。
- **分页规范：** 所有拉取历史列表的 API，强制使用基于 Cursor（游标）的分页，禁止返回无上限的全量数组。

## 4. 防御性编程规范 (Defensive Programming)
- **深拷贝防污染 (Deep Clone)：** 在总线拦截器提取 Payload（如 `extractToBlackboard`）时，**必须使用浅/深拷贝**。绝对禁止直接 `delete event.payload.xxx` 修改原内存引用。
- **优雅停机 (Graceful Shutdown)：** 所有包含定时器（如 WAL 刷盘的 `setInterval`）的管理器，必须实现进程级信号监听（`SIGINT`/`SIGTERM`），确保进程被杀前 `clearInterval` 并执行最后一次同步 `flush()`。
- **深度熔断 (Deep Cancellation)：** 凡是涉及 `run.abort` 的取消逻辑，不仅要修改状态机，还必须触发底层的 `AbortController`，将 Signal 一路透传到 Fetch 请求和 LLM 流式调用中，物理掐断网络。