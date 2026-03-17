/*
 * 文件作用：将 Runtime 原始事件归一化为图协议事件（node/edge/status/io）。
 */

import type {
  EdgeUpsertPayload,
  GraphEnvelope,
  NodeIoPayload,
  NodeStatusPayload,
  NodeUpsertPayload,
  RunEndPayload,
  RunStartPayload
} from "../protocol/graph-events.js";
import { GRAPH_SCHEMA_VERSION } from "../protocol/graph-events.js";

export type RuntimeRawEvent = {
  runId: string;
  type: string;
  timestamp: string;
  payload?: Record<string, unknown>;
};

export class GraphProjector {
  private seqByRun = new Map<string, number>();
  private dagIdByRun = new Map<string, string>();

  project(event: RuntimeRawEvent): Array<GraphEnvelope<unknown>> {
    const out: Array<GraphEnvelope<unknown>> = [];

    if (event.type === "run.start") {
      const userInput = this.stringValue(event.payload?.userInput) || "";
      const sessionId = this.stringValue(event.payload?.sessionId);
      const turnIndex = this.numberValue(event.payload?.turnIndex);
      const dagId = this.buildDagId(event.runId, sessionId, turnIndex);
      this.dagIdByRun.set(event.runId, dagId);
      const inputNodeId = `${event.runId}:input`;
      out.push(this.wrap<RunStartPayload>(event.runId, "run.start", event.timestamp, {
        dagId,
        sessionId,
        turnIndex,
        userInputSummary: userInput
      }));

      out.push(this.wrap<NodeUpsertPayload>(event.runId, "node.upsert", event.timestamp, {
        nodeId: inputNodeId,
        kind: "system",
        title: this.looksLikeCommand(userInput) ? "终端输入命令" : "终端输入"
      }));

      out.push(this.wrap<NodeStatusPayload>(event.runId, "node.status", event.timestamp, {
        nodeId: inputNodeId,
        status: "success"
      }));

      out.push(this.wrap<NodeIoPayload>(event.runId, "node.io", event.timestamp, {
        nodeId: inputNodeId,
        inputPorts: [
          {
            name: "stdin",
            type: "text",
            summary: userInput
          }
        ],
        outputPorts: [
          {
            name: "input.text",
            type: "text",
            summary: userInput
          }
        ]
      }));
    }

    if (event.type === "run.completed" || event.type === "run.error") {
      out.push(this.wrap<RunEndPayload>(event.runId, "run.end", event.timestamp, {
        ok: event.type === "run.completed",
        finalSummary: this.stringValue(event.payload?.finalText) || this.stringValue(event.payload?.errorMessage)
      }));
      // 运行结束后清理内部映射，防止内存泄漏。
      this.seqByRun.delete(event.runId);
      this.dagIdByRun.delete(event.runId);
    }

    if (event.type === "plugin.output" && this.stringValue(event.payload?.outputType) === "weave.dag.node") {
      const parsed = this.safeJson(this.stringValue(event.payload?.outputText));
      if (parsed?.nodeId) {
        out.push(this.wrap<NodeUpsertPayload>(event.runId, "node.upsert", event.timestamp, {
          nodeId: String(parsed.nodeId),
          parentId: parsed.parentId ? String(parsed.parentId) : undefined,
          kind: this.inferKind(String(parsed.nodeId), String(parsed.label || "")),
          title: String(parsed.label || "")
        }));

        out.push(this.wrap<NodeStatusPayload>(event.runId, "node.status", event.timestamp, {
          nodeId: String(parsed.nodeId),
          status: this.toNodeStatus(String(parsed.status || "running"))
        }));

        if (parsed.parentId) {
          const edgeId = `${String(parsed.parentId)}->${String(parsed.nodeId)}`;
          out.push(this.wrap<EdgeUpsertPayload>(event.runId, "edge.upsert", event.timestamp, {
            edgeId,
            source: String(parsed.parentId),
            target: String(parsed.nodeId)
          }));
        }
      }
    }

    if (event.type === "plugin.output" && this.stringValue(event.payload?.outputType) === "weave.dag.detail") {
      const parsed = this.safeJson(this.stringValue(event.payload?.outputText));
      if (parsed?.nodeId) {
        out.push(this.wrap<NodeIoPayload>(event.runId, "node.io", event.timestamp, {
          nodeId: String(parsed.nodeId),
          outputPorts: [
            {
              name: "detail",
              type: "text",
              summary: this.stringValue(parsed.text) || ""
            }
          ]
        }));
      }
    }

    return out;
  }

  private wrap<T>(runId: string, eventType: GraphEnvelope<T>["eventType"], timestamp: string, payload: T): GraphEnvelope<T> {
    const current = this.seqByRun.get(runId) ?? 0;
    const next = current + 1;
    this.seqByRun.set(runId, next);

    return {
      schemaVersion: GRAPH_SCHEMA_VERSION,
      seq: next,
      runId,
      dagId: this.dagIdByRun.get(runId) ?? runId,
      eventType,
      timestamp,
      payload
    };
  }

  private buildDagId(runId: string, sessionId?: string, turnIndex?: number): string {
    if (sessionId && typeof turnIndex === "number") {
      return `${sessionId}:turn-${turnIndex}`;
    }
    return runId;
  }

  private inferKind(nodeId: string, label: string): NodeUpsertPayload["kind"] {
    if (/step\s*gate|人工拦截|暂停|挂起/i.test(label)) {
      return "gate";
    }
    if (label.includes("LLM") || label.includes("决策")) {
      return "llm";
    }
    if (label.includes("修复")) {
      return "repair";
    }
    if (nodeId.includes("final") || label.includes("本轮完成")) {
      return "final";
    }
    return "tool";
  }

  private toNodeStatus(input: string): NodeStatusPayload["status"] {
    if (input === "success" || input === "fail" || input === "running" || input === "retrying" || input === "skipped") {
      return input;
    }
    return "pending";
  }

  private stringValue(value: unknown): string {
    return typeof value === "string" ? value : "";
  }

  private numberValue(value: unknown): number | undefined {
    return typeof value === "number" ? value : undefined;
  }

  private safeJson(text: string): Record<string, unknown> | null {
    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private looksLikeCommand(text: string): boolean {
    const trimmed = text.trim();
    if (!trimmed) {
      return false;
    }

    return /[|><]/.test(trimmed) || /\b(ls|dir|cat|grep|findstr|awk|sed|pnpm|npm|git|node|python)\b/i.test(trimmed);
  }
}
