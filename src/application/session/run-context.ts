/**
 * 文件作用：RunContext 接口 — 注入到每个 DAG 节点执行方法中的运行时上下文。
 * RunContext extends EngineContext，在引擎最小依赖集之上叠加智能体层依赖。
 * EngineContext：runId/dag/abortSignal/abortController/nodeRegistry/stateStore/snapshotStore/logger
 * RunContext 额外：LLM/工具/插件/记忆/Step Gate/流式输出等
 */
import type { ILlmClient } from "../ports/llm-client.js";
import type { IToolRegistry } from "../../core/ports/tool-registry.js";
import type { IMemoryStore } from "../../core/ports/memory-store.js";
import type { BaseNode } from "../../domain/nodes/base-node.js";
import type { WeaveEventBus } from "../../domain/event/event-bus.js";
import type OpenAI from "openai";
import type { ToolApprovalRequest, ToolApprovalDecision } from "../../core/engine/runner-types.js";
import type { INodeInterceptor } from "../weave/interceptor.js";
import type { PendingPromiseRegistry } from "../weave/pending-promise-registry.js";
import type { EngineContext } from "../../core/engine/engine-types.js";

export interface StepGateOptions {
  enabled: boolean;
  autoMode?: boolean;
  approveToolCall?: (request: ToolApprovalRequest) => Promise<ToolApprovalDecision>;
}

export interface RunContext extends EngineContext {
  // ── 覆盖 EngineContext.nodeRegistry 为更精确的类型 ──────────────────────────
  nodeRegistry: Map<string, BaseNode>;

  // ── 智能体层依赖 ─────────────────────────────────────────────────────────────
  sessionId: string;
  turnIndex: number;
  llmClient: ILlmClient;
  toolRegistry: IToolRegistry;
  memoryStore: IMemoryStore;
  workingMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  systemPrompt: string;
  stepGate: StepGateOptions;
  defaultToolRetries: number;
  defaultToolTimeoutMs: number;
  maxSteps: number;
  bus: WeaveEventBus;

  // ── Step Gate 人机交互层 ────────────────────────────────────────────────────
  /** 节点拦截器（独立双轨制：Plugin = 被动观察，Interceptor = 主动控制） */
  interceptor?: INodeInterceptor;
  /** 挂起字典（超时保护 + rejectAll 清空）— ⛔️ 不得下沉到 EngineContext */
  pendingRegistry?: PendingPromiseRegistry;
}
