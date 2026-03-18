/**
 * 文件作用：RunContext 接口 — 注入到每个 DAG 节点执行方法中的运行时上下文。
 * Phase 2/3 扩展：AbortController、INodeInterceptor、PendingPromiseRegistry、SnapshotStore。
 */
import type { QwenClient } from "../llm/qwen-client.js";
import type { ToolRegistry } from "../tools/tool-registry.js";
import type { MemoryStore } from "../memory/memory-store.js";
import type { DagExecutionGraph } from "../runtime/dag-graph.js";
import type { DagStateStore } from "../runtime/state-store.js";
import type { BaseNode } from "../runtime/nodes/base-node.js";
import type { WeaveEventBus } from "../event/event-bus.js";
import type { AgentLoopPlugin, AgentPluginRunContext } from "../agent/plugins/agent-plugin.js";
import type { AppLogger } from "../logging/app-logger.js";
import type OpenAI from "openai";
import type { ToolApprovalRequest, ToolApprovalDecision } from "../runtime/runner-types.js";
import type { INodeInterceptor } from "../weave/interceptor.js";
import type { PendingPromiseRegistry } from "../weave/pending-promise-registry.js";
import type { SnapshotStore } from "../runtime/snapshot-store.js";

export interface StepGateOptions {
  enabled: boolean;
  autoMode?: boolean;
  approveToolCall?: (request: ToolApprovalRequest) => Promise<ToolApprovalDecision>;
}

export interface RunContext {
  runId: string;
  sessionId: string;
  turnIndex: number;
  bus: WeaveEventBus;
  llmClient: QwenClient;
  toolRegistry: ToolRegistry;
  memoryStore: MemoryStore;
  dag: DagExecutionGraph;
  stateStore: DagStateStore;
  /** 可执行节点注册表：外部调度器通过此表查找并调用节点 execute() */
  nodeRegistry: Map<string, BaseNode>;
  workingMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  systemPrompt: string;
  plugins: AgentLoopPlugin[];
  basePluginContext: AgentPluginRunContext;
  stepGate: StepGateOptions;
  defaultToolRetries: number;
  defaultToolTimeoutMs: number;
  logger: AppLogger;
  maxSteps: number;
  /** 流式文本输出（分片 emit llm.delta 事件） */
  emitTextAsStream: (text: string) => Promise<void>;

  // ── Phase 2：全局 AbortController ──────────────────────────────────────────
  /** 全局中止控制器（首个节点失败时广播 abort 信号） */
  abortController: AbortController;
  /** 全局中止信号（节点内部 / 底层网络请求传递此信号） */
  abortSignal: AbortSignal;

  // ── Phase 3：拦截器基础设施 ────────────────────────────────────────────────
  /** 节点拦截器（独立双轨制：Plugin = 被动观察，Interceptor = 主动控制） */
  interceptor?: INodeInterceptor;
  /** 挂起字典（超时保护 + rejectAll 清空） */
  pendingRegistry?: PendingPromiseRegistry;

  // ── Phase 4：快照存储层 ────────────────────────────────────────────────────
  /** 快照存储（同步冻结 + 异步装配，回溯基础） */
  snapshotStore?: SnapshotStore;
}
