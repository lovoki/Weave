/**
 * 文件作用：RunContext 接口 — 注入到每个 DAG 节点执行方法中的运行时上下文。
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
}
