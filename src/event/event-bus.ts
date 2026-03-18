/**
 * 文件作用：WeaveEventBus — 统一事件分发总线，自动注入 runId/sessionId/turnIndex 元数据。
 */
import type { AgentRunEventType, AgentRunEvent } from "./event-types.js";
import type { AgentPluginOutput, AgentPluginOutputs } from "../agent/plugins/agent-plugin.js";

export interface EventBusMeta {
  runId: string;
  sessionId: string;
  turnIndex: number;
}

export class WeaveEventBus {
  readonly runId: string;
  readonly sessionId: string;
  readonly turnIndex: number;

  constructor(
    private readonly meta: EventBusMeta,
    private readonly forward: (e: AgentRunEvent) => void
  ) {
    this.runId = meta.runId;
    this.sessionId = meta.sessionId;
    this.turnIndex = meta.turnIndex;
  }

  dispatch(type: AgentRunEventType, payload?: AgentRunEvent["payload"]): void {
    const event: AgentRunEvent = {
      type,
      runId: this.meta.runId,
      timestamp: new Date().toISOString(),
      schemaVersion: "dagent.agent.event.v1",
      eventId: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      eventType: type,
      payload
    };
    this.forward(event);
  }

  dispatchPluginOutput(output: AgentPluginOutput | AgentPluginOutputs): void {
    if (!output) return;
    const outputs = Array.isArray(output) ? output : [output as AgentPluginOutput];
    for (const item of outputs) {
      this.dispatch("plugin.output", {
        pluginName: item.pluginName,
        outputType: item.outputType,
        outputText: item.outputText
      });
    }
  }
}
