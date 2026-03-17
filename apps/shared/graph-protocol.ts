/**
 * 文件作用：二维图投影协议类型定义（前后端唯一权威来源）。
 * 所有消费方（graph-server、graph-web）统一从此文件导入。
 */

export const GRAPH_SCHEMA_VERSION = "weave.graph.v1" as const;

export type GraphEventType =
  | "run.start"
  | "node.upsert"
  | "edge.upsert"
  | "node.status"
  | "node.io"
  | "layout.hint"
  | "run.end";

export interface GraphEnvelope<TPayload = unknown> {
  schemaVersion: typeof GRAPH_SCHEMA_VERSION;
  seq: number;
  runId: string;
  dagId: string;
  eventType: GraphEventType;
  timestamp: string;
  payload: TPayload;
}

export interface GraphPort {
  name: string;
  type: string;
  summary: string;
  blobRef?: string;
}

export interface RunStartPayload {
  dagId: string;
  sessionId?: string;
  turnIndex?: number;
  userInputSummary: string;
}

export interface NodeUpsertPayload {
  nodeId: string;
  parentId?: string;
  kind: "llm" | "tool" | "gate" | "repair" | "final" | "system";
  title: string;
  tags?: string[];
}

export interface EdgeUpsertPayload {
  edgeId: string;
  source: string;
  target: string;
  label?: string;
}

export interface NodeStatusPayload {
  nodeId: string;
  status: "pending" | "running" | "retrying" | "success" | "fail" | "skipped";
  reason?: string;
}

export interface NodeIoPayload {
  nodeId: string;
  inputPorts?: GraphPort[];
  outputPorts?: GraphPort[];
}

export interface LayoutHintPayload {
  direction: "TB" | "LR";
  ranker?: "network-simplex" | "tight-tree" | "longest-path";
  batchWindowMs?: number;
}

export interface RunEndPayload {
  ok: boolean;
  finalSummary?: string;
}

/** 前端节点数据（ReactFlow 节点使用） */
export interface GraphNodeData {
  title: string;
  kind: string;
  status?: string;
  subtitle?: string;
  inputPorts?: GraphPort[];
  outputPorts?: GraphPort[];
}
