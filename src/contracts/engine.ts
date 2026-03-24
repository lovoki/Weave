/**
 * 契约层：引擎核心接口与类型
 * 规则：此文件只允许 Zod Schema、TypeScript interface/type、JSDoc 注释。零业务实现代码。
 */

import { z } from "zod";

// ─── DAG 节点状态机 ──────────────────────────────────────────────────────────

export const NodeStatusSchema = z.enum([
  "pending",
  "ready",
  "blocked",
  "running",
  "waiting",
  "retrying",
  "success",
  "fail",
  "skipped",
  "aborted",
]);
export type NodeStatus = z.infer<typeof NodeStatusSchema>;

export const NodeKindSchema = z.enum([
  "input",
  "llm",
  "tool",
  "attempt",
  "repair",
  "escalation",
  "gate",
  "final",
  "system",
  "condition",
]);
export type NodeKind = z.infer<typeof NodeKindSchema>;

// ─── 引擎事件总线接口 ────────────────────────────────────────────────────────

/**
 * 引擎事件总线 — Layer 1 纯接口，零外部依赖。
 * DagExecutionGraph 持有此接口引用，在节点/边/状态变更时自动广播。
 * 实现由 Layer 3（run-agent.ts）注入，遵循依赖反转原则。
 *
 * @example
 * class MyBus implements IEngineEventBus {
 *   onNodeCreated(nodeId, nodeType, frozen) { ... }
 * }
 */
export interface IEngineEventBus {
  onNodeCreated(nodeId: string, nodeType: string, frozen: Record<string, unknown>): void;
  onEdgeCreated(fromId: string, toId: string, kind: "dependency" | "data" | "retry"): void;
  onNodeTransition(
    nodeId: string,
    nodeType: string,
    fromStatus: string,
    toStatus: string,
    reason?: string,
    updatedPayload?: Record<string, unknown>
  ): void;
  onNodeIo(
    nodeId: string,
    inputPorts?: GraphPort[],
    outputPorts?: GraphPort[],
    error?: NodeError,
    metrics?: NodeMetrics
  ): void;
  onSchedulerIssue(type: "deadlock" | "integrity", message: string, nodeIds?: string[]): void;
  onNodeStreamDelta(nodeId: string, chunkText: string): void;
}

// ─── 图端口与错误类型 ────────────────────────────────────────────────────────

export const GraphPortSchema = z.object({
  name: z.string(),
  type: z.enum(["text", "json", "messages", "number"]),
  content: z.unknown(),
  blobRef: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type GraphPort = z.infer<typeof GraphPortSchema>;

export const NodeErrorSchema = z.object({
  name: z.string(),
  message: z.string(),
  stack: z.string().optional(),
});
export type NodeError = z.infer<typeof NodeErrorSchema>;

export const NodeMetricsSchema = z
  .object({
    durationMs: z.number().optional(),
    promptTokens: z.number().optional(),
    completionTokens: z.number().optional(),
  })
  .catchall(z.unknown());
export type NodeMetrics = z.infer<typeof NodeMetricsSchema>;

// ─── 暂停信号量接口 ──────────────────────────────────────────────────────────

/**
 * 暂停信号量 — 用于在调度 Tick 开始前挂起执行。
 * @example
 * const signal: IPauseSignal = createPauseSignal();
 * signal.pause(); // 挂起
 * await signal.wait(); // 等待恢复
 * signal.resume(); // 恢复
 */
export interface IPauseSignal {
  wait(): Promise<void>;
  pause(): void;
  resume(): void;
  isPaused(): boolean;
}

// ─── 快照类型 ────────────────────────────────────────────────────────────────

/**
 * 冻结快照 — 节点状态转换时的不可变副本，用于回溯和分叉重跑。
 * @example
 * { nodeId: 'llm-1', kind: 'llm', title: 'LLM推理', status: 'success', metrics: {durationMs: 1200} }
 */
export const FrozenSnapshotSchema = z
  .object({
    nodeId: z.string(),
    kind: z.string(),
    title: z.string(),
    parentId: z.string().optional(),
    dependencies: z.array(z.string()),
    status: NodeStatusSchema,
    tags: z.array(z.string()).optional(),
    startedAt: z.string().optional(),
    completedAt: z.string().optional(),
    error: NodeErrorSchema.optional(),
    metrics: z.record(z.unknown()),
  })
  .catchall(z.unknown());
export type FrozenSnapshot = z.infer<typeof FrozenSnapshotSchema>;

/**
 * 快照条目 — 带序列号和时间戳的完整快照记录。
 * @example
 * { seq: 42, timestamp: '2026-03-24T10:00:00Z', nodeId: 'llm-1', fromStatus: 'running', toStatus: 'success', frozen: {...} }
 */
export const SnapshotEntrySchema = z.object({
  seq: z.number().int().positive(),
  timestamp: z.string(),
  nodeId: z.string(),
  fromStatus: z.string(),
  toStatus: z.string(),
  frozen: FrozenSnapshotSchema,
  payload: z.record(z.unknown()).optional(),
});
export type SnapshotEntry = z.infer<typeof SnapshotEntrySchema>;
