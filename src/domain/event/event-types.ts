/**
 * 文件作用：所有 Agent 运行事件类型定义（辨析联合类型，实现世界级强类型安全）。
 */

import type { GraphPort, NodeError, NodeMetrics } from "../../core/engine/node-types.js";

export interface BaseEvent {
  runId: string;
  timestamp: string;
  schemaVersion: string;
  eventId: string;
}

export type AgentRunEvent =
  | (BaseEvent & { type: "run.start"; payload: { userInput: string; sessionId: string; turnIndex: number } })
  | (BaseEvent & { type: "llm.request"; payload: { userInput: string; sessionId: string; turnIndex: number } })
  | (BaseEvent & { type: "llm.delta"; payload: { text: string } })
  | (BaseEvent & { type: "llm.completed"; payload: { finalText: string; sessionId: string; turnIndex: number } })
  | (BaseEvent & {
      type: "node.pending_approval";
      payload: { sessionId: string; turnIndex: number; nodeId: string; toolName: string; toolCallId: string; toolArgsText: string; toolArgsJsonText: string };
    })
  | (BaseEvent & {
      type: "node.approval.resolved";
      payload: { sessionId: string; turnIndex: number; nodeId: string; toolName: string; toolCallId: string; approvalAction: "approve" | "edit" | "skip" | "abort"; toolArgsText: string; toolArgsJsonText: string };
    })
  | (BaseEvent & {
      type: "tool.execution.start";
      payload: { sessionId: string; turnIndex: number; nodeId: string; toolName: string; toolCallId: string; toolArgsText: string };
    })
  | (BaseEvent & {
      type: "tool.execution.end";
      payload: { sessionId: string; turnIndex: number; nodeId: string; toolName: string; toolCallId: string; toolStatus: "success" | "fail"; toolOk: boolean; toolResultText: string };
    })
  | (BaseEvent & {
      type: "plugin.output";
      payload: { pluginName: string; outputType: string; outputText: string };
    })
  | (BaseEvent & { type: "node.validation_error"; payload: { nodeId: string; errors: string[] } })
  | (BaseEvent & { type: "run.completed"; payload: { finalText: string; sessionId: string; turnIndex: number } })
  | (BaseEvent & { type: "run.error"; payload: { errorMessage: string; sessionId: string; turnIndex: number } })
  | (BaseEvent & {
      type: "engine.node.created";
      payload: { sessionId: string; nodeId: string; nodeType: string; payload: Record<string, unknown> };
    })
  | (BaseEvent & {
      type: "engine.edge.created";
      payload: { sessionId: string; fromId: string; toId: string; kind: "dependency" | "data" | "retry" };
    })
  | (BaseEvent & {
      type: "engine.data.edge.created";
      payload: { sessionId: string; fromNodeId: string; toNodeId: string; toKey: string; fromKey?: string };
    })
  | (BaseEvent & {
      type: "engine.node.transition";
      payload: { sessionId: string; nodeId: string; nodeType: string; fromStatus: string; toStatus: string; reason?: string; updatedPayload?: Record<string, unknown> };
    })
  | (BaseEvent & {
      type: "engine.node.io";
      payload: { sessionId: string; nodeId: string; inputPorts?: GraphPort[]; outputPorts?: GraphPort[]; error?: NodeError; metrics?: NodeMetrics };
    })
  | (BaseEvent & {
      type: "engine.scheduler.issue";
      payload: { sessionId: string; issueType: string; message: string; nodeIds?: string[] };
    })
  | (BaseEvent & {
      type: "engine.node.stream.delta";
      payload: { sessionId: string; nodeId: string; chunkText: string };
    });

export type AgentRunEventType = AgentRunEvent["type"];

export interface AgentPluginOutput {
  pluginName: string;
  outputType: string;
  outputText: string;
}

export type AgentPluginOutputs = AgentPluginOutput | AgentPluginOutput[] | void;
