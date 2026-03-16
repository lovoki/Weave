import { EventEmitter } from "node:events";
import type { AgentRunEvent } from "../agent/run-agent.js";

/**
 * 文件作用：提供面向 TUI 的事件网关，将 Runtime 事件映射为 UI 语义事件。
 */
export type AgentUiStatus = "idle" | "thinking" | "using_tool" | "done" | "error";

export interface AgentStartEvent {
  runId: string;
  userInput: string;
}

export interface AgentThoughtEvent {
  runId: string;
  text: string;
}

export interface ToolStartEvent {
  runId: string;
  toolName: string;
  args: string;
}

export interface ToolEndEvent {
  runId: string;
  toolName: string;
  result: string;
  status: "success" | "fail";
}

export interface AgentFinishEvent {
  runId: string;
  finalText: string;
}

export interface AgentErrorEvent {
  runId: string;
  errorMessage: string;
}

export interface WeaveDagEvent {
  runId: string;
  nodeId: string;
  parentId?: string;
  label: string;
  status: "running" | "waiting" | "success" | "fail";
}

export interface WeaveDagDetailEvent {
  runId: string;
  nodeId: string;
  text: string;
}

export class AgentUiEventGateway extends EventEmitter {
  mapFromRuntime(event: AgentRunEvent): void {
    if (event.type === "run.start") {
      this.emit("agent:start", {
        runId: event.runId,
        userInput: event.payload?.userInput ?? ""
      } satisfies AgentStartEvent);
      return;
    }

    if (event.type === "llm.delta") {
      this.emit("agent:thought", {
        runId: event.runId,
        text: event.payload?.text ?? ""
      } satisfies AgentThoughtEvent);
      return;
    }

    if (event.type === "tool.execution.start") {
      this.emit("tool:start", {
        runId: event.runId,
        toolName: event.payload?.toolName ?? "unknown",
        args: event.payload?.toolArgsText ?? ""
      } satisfies ToolStartEvent);
      return;
    }

    if (event.type === "tool.execution.end") {
      this.emit("tool:end", {
        runId: event.runId,
        toolName: event.payload?.toolName ?? "unknown",
        result: event.payload?.toolResultText ?? "",
        status: event.payload?.toolStatus ?? (event.payload?.toolOk ? "success" : "fail")
      } satisfies ToolEndEvent);
      return;
    }

    if (event.type === "run.completed") {
      this.emit("agent:finish", {
        runId: event.runId,
        finalText: event.payload?.finalText ?? ""
      } satisfies AgentFinishEvent);
      return;
    }

    if (event.type === "run.error") {
      this.emit("agent:error", {
        runId: event.runId,
        errorMessage: event.payload?.errorMessage ?? "未知错误"
      } satisfies AgentErrorEvent);
      return;
    }

    if (
      event.type === "plugin.output" &&
      event.payload?.pluginName === "weave" &&
      event.payload?.outputType === "weave.dag.node"
    ) {
      const text = event.payload?.outputText ?? "";
      const parsed = this.parseWeaveDagNode(text);
      if (!parsed) {
        return;
      }

      this.emit("weave:dag", {
        runId: event.runId,
        ...parsed
      } satisfies WeaveDagEvent);
      return;
    }

    if (
      event.type === "plugin.output" &&
      event.payload?.pluginName === "weave" &&
      event.payload?.outputType === "weave.dag.detail"
    ) {
      const text = event.payload?.outputText ?? "";
      const parsed = this.parseWeaveDagDetail(text);
      if (!parsed) {
        return;
      }

      this.emit("weave:dag-detail", {
        runId: event.runId,
        ...parsed
      } satisfies WeaveDagDetailEvent);
    }
  }

  private parseWeaveDagNode(text: string): Omit<WeaveDagEvent, "runId"> | null {
    if (!text.trim()) {
      return null;
    }

    try {
      const data = JSON.parse(text) as {
        nodeId?: string;
        parentId?: string;
        label?: string;
        status?: "running" | "waiting" | "success" | "fail";
      };

      if (!data.nodeId || !data.label || !data.status) {
        return null;
      }

      return {
        nodeId: data.nodeId,
        parentId: data.parentId,
        label: data.label,
        status: data.status
      };
    } catch {
      return null;
    }
  }

  private parseWeaveDagDetail(text: string): Omit<WeaveDagDetailEvent, "runId"> | null {
    if (!text.trim()) {
      return null;
    }

    try {
      const data = JSON.parse(text) as {
        nodeId?: string;
        text?: string;
      };

      if (!data.nodeId || !data.text) {
        return null;
      }

      return {
        nodeId: data.nodeId,
        text: data.text
      };
    } catch {
      return null;
    }
  }
}
