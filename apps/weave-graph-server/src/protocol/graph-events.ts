/*
 * 文件作用：定义二维图投影协议（前后端共享），用于 WS 增量同步。
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

export interface GraphEnvelope<TPayload> {
  schemaVersion: typeof GRAPH_SCHEMA_VERSION;
  seq: number;
  runId: string;
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

export interface NodeUpsertPayload {
  nodeId: string;
  parentId?: string;
  kind: "llm" | "tool" | "repair" | "final" | "system";
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

export interface RunStartPayload {
  sessionId?: string;
  turnIndex?: number;
  userInputSummary: string;
}

export interface RunEndPayload {
  ok: boolean;
  finalSummary?: string;
}
