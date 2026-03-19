/**
 * 文件作用：本地节点协议类型定义，与 apps/shared/graph-protocol.ts 结构对齐（结构化类型兼容）。
 * 独立定义是因为 src/ tsconfig rootDir 限制无法直接导入 apps/shared/。
 */

export type NodeKind =
  | "input"
  | "llm"
  | "tool"
  | "attempt"
  | "repair"
  | "escalation"
  | "gate"
  | "final"
  | "system"
  | "condition";

export type NodeStatus =
  | "pending"
  | "ready"
  | "blocked"
  | "running"
  | "waiting"
  | "retrying"
  | "success"
  | "fail"
  | "skipped"
  | "aborted";

export interface NodeMetrics {
  durationMs?: number;
  promptTokens?: number;
  completionTokens?: number;
  [key: string]: unknown;
}

export interface NodeError {
  name: string;
  message: string;
  stack?: string;
}

export interface GraphPort {
  name: string;
  type: "text" | "json" | "messages" | "number";
  /** 原生内容，直接传递（非 JSON 字符串）。超过 50KB 时为 null，由 blobRef 替代 */
  content: unknown;
  blobRef?: string;
}

export interface BaseNodePayload {
  nodeId: string;
  kind: NodeKind;
  title: string;
  parentId?: string;
  dependencies?: string[];
  status: NodeStatus;
  tags?: string[];
  startedAt?: string;
  completedAt?: string;
  error?: NodeError;
  metrics?: NodeMetrics;
  inputPorts?: GraphPort[];
  outputPorts?: GraphPort[];
  [key: string]: unknown;
}
