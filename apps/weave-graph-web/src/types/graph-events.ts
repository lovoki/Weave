/*
 * 文件作用：前端图协议类型定义，需与后端协议保持一致。
 */

export type GraphEventType =
  | "run.start"
  | "node.upsert"
  | "edge.upsert"
  | "node.status"
  | "node.io"
  | "layout.hint"
  | "run.end";

export interface GraphEnvelope<TPayload = unknown> {
  schemaVersion: "weave.graph.v1";
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

export interface GraphNodeData {
  label?: string;
  title: string;
  kind: string;
  status?: string;
  inputPorts?: GraphPort[];
  outputPorts?: GraphPort[];
}
