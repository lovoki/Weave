/**
 * 文件作用：所有 Agent 运行事件类型定义（纯类型，零依赖）。
 */

export type AgentRunEventType =
  | "run.start"
  | "llm.request"
  | "llm.delta"
  | "llm.completed"
  | "node.pending_approval"
  | "node.approval.resolved"
  | "tool.execution.start"
  | "tool.retry.start"
  | "tool.retry.end"
  | "tool.execution.end"
  | "plugin.output"
  | "node.validation_error"
  | "run.completed"
  | "run.error";

export interface AgentRunEvent {
  type: AgentRunEventType;
  schemaVersion?: string;
  eventId?: string;
  eventType?: string;
  runId: string;
  timestamp: string;
  payload?: {
    text?: string;
    userInput?: string;
    errorMessage?: string;
    finalText?: string;
    sessionId?: string;
    turnIndex?: number;
    toolName?: string;
    toolOk?: boolean;
    toolCallId?: string;
    toolArgsText?: string;
    toolArgsJsonText?: string;
    toolResultText?: string;
    toolStatus?: "success" | "fail";
    retryAttempt?: number;
    retryMax?: number;
    retryReason?: string;
    retryPrepared?: boolean;
    approvalAction?: "approve" | "edit" | "skip" | "abort";
    pluginName?: string;
    outputType?: string;
    outputText?: string;
    nodeId?: string;
    errors?: string[];
  };
}
