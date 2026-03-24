/**
 * 契约层：WebSocket 图协议类型（前后端唯一权威来源）
 * 规则：此文件只允许 Zod Schema、TypeScript interface/type、JSDoc 注释。零业务实现代码。
 *
 * 消费方：apps/weave-graph-server（发送）、apps/weave-graph-web（接收）
 */

import { z } from "zod";

// ─── 协议版本 ────────────────────────────────────────────────────────────────

export const GRAPH_SCHEMA_VERSION = "weave.graph.v1" as const;

// ─── 事件类型 ────────────────────────────────────────────────────────────────

export const GraphEventTypeSchema = z.enum([
  "run.start",
  "node.upsert",
  "edge.upsert",
  "node.status",
  "node.io",
  "layout.hint",
  "run.end",
  "node.pending_approval",
  "node.approval.resolved",
]);
export type GraphEventType = z.infer<typeof GraphEventTypeSchema>;

// ─── 图信封（所有事件的统一外层结构）────────────────────────────────────────

/**
 * 图协议信封 — 所有 WebSocket 事件的统一外层结构。
 * @example
 * {
 *   schemaVersion: 'weave.graph.v1',
 *   eventId: 'evt-uuid',
 *   seq: 42,
 *   runId: 'run-uuid',
 *   dagId: 'dag-uuid',
 *   eventType: 'node.status',
 *   timestamp: '2026-03-24T10:00:00Z',
 *   payload: { nodeId: 'llm-1', status: 'success' }
 * }
 */
export const GraphEnvelopeSchema = z.object({
  schemaVersion: z.literal(GRAPH_SCHEMA_VERSION),
  eventId: z.string(),
  seq: z.number().int().nonnegative(),
  runId: z.string(),
  dagId: z.string(),
  eventType: GraphEventTypeSchema,
  timestamp: z.string(),
  payload: z.unknown(),
});
export type GraphEnvelope<TPayload = unknown> = Omit<
  z.infer<typeof GraphEnvelopeSchema>,
  "payload"
> & { payload: TPayload };

// ─── 客户端消息（浏览器 → 服务器）─────────────────────────────────────────

/**
 * 客户端 RPC 请求信封
 * @example { type: 'rpc', reqId: 'req-1', method: 'approve', params: { nodeId: 'gate-1' } }
 */
export const ClientMessageEnvelopeSchema = z.object({
  type: z.literal("rpc"),
  reqId: z.string(),
  method: z.string(),
  params: z.record(z.unknown()).optional(),
});
export type ClientMessageEnvelope = z.infer<typeof ClientMessageEnvelopeSchema>;

/**
 * 服务器 RPC 响应信封
 * @example { type: 'rpc.response', reqId: 'req-1', ok: true, data: { approved: true } }
 */
export const ServerResponseMessageEnvelopeSchema = z.object({
  type: z.literal("rpc.response"),
  reqId: z.string(),
  ok: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
});
export type ServerResponseMessageEnvelope = z.infer<typeof ServerResponseMessageEnvelopeSchema>;

// ─── 节点负载类型（各事件的 payload 结构）──────────────────────────────────

/**
 * 节点 upsert 负载
 * @example { nodeId: 'llm-1', kind: 'llm', title: 'LLM推理', status: 'pending', dependencies: ['input-1'] }
 */
export const NodeUpsertPayloadSchema = z.object({
  nodeId: z.string(),
  kind: z.string(),
  title: z.string(),
  parentId: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
  status: z.string(),
  tags: z.array(z.string()).optional(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  error: z
    .object({
      name: z.string(),
      message: z.string(),
      stack: z.string().optional(),
    })
    .optional(),
  metrics: z.record(z.unknown()).optional(),
});
export type NodeUpsertPayload = z.infer<typeof NodeUpsertPayloadSchema>;

/**
 * 节点状态变更负载
 * @example { nodeId: 'llm-1', status: 'success', reason: '推理完成' }
 */
export const NodeStatusPayloadSchema = z.object({
  nodeId: z.string(),
  status: z.string(),
  reason: z.string().optional(),
  updatedPayload: z.record(z.unknown()).optional(),
});
export type NodeStatusPayload = z.infer<typeof NodeStatusPayloadSchema>;

/**
 * 节点 IO 负载（端口数据）
 * @example { nodeId: 'llm-1', inputPorts: [...], outputPorts: [...] }
 */
export const NodeIoPayloadSchema = z.object({
  nodeId: z.string(),
  inputPorts: z
    .array(
      z.object({
        name: z.string(),
        type: z.enum(["text", "json", "messages", "number"]),
        content: z.unknown(),
        blobRef: z.string().optional(),
        metadata: z.record(z.unknown()).optional(),
      })
    )
    .optional(),
  outputPorts: z
    .array(
      z.object({
        name: z.string(),
        type: z.enum(["text", "json", "messages", "number"]),
        content: z.unknown(),
        blobRef: z.string().optional(),
        metadata: z.record(z.unknown()).optional(),
      })
    )
    .optional(),
  error: z
    .object({
      name: z.string(),
      message: z.string(),
      stack: z.string().optional(),
    })
    .optional(),
  metrics: z.record(z.unknown()).optional(),
});
export type NodeIoPayload = z.infer<typeof NodeIoPayloadSchema>;

/**
 * 边 upsert 负载
 * @example { fromId: 'input-1', toId: 'llm-1', kind: 'dependency' }
 */
export const EdgeUpsertPayloadSchema = z.object({
  fromId: z.string(),
  toId: z.string(),
  kind: z.enum(["dependency", "data", "retry"]),
});
export type EdgeUpsertPayload = z.infer<typeof EdgeUpsertPayloadSchema>;

/**
 * 审批等待负载
 * @example { nodeId: 'gate-1', title: '工具执行审批', toolName: 'command_exec', args: { cmd: 'ls' } }
 */
export const NodePendingApprovalPayloadSchema = z.object({
  nodeId: z.string(),
  title: z.string().optional(),
  toolName: z.string().optional(),
  args: z.record(z.unknown()).optional(),
});
export type NodePendingApprovalPayload = z.infer<typeof NodePendingApprovalPayloadSchema>;
