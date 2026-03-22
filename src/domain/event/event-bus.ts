/**
 * 文件作用：WeaveEventBus — 统一事件分发总线，自动注入 runId/sessionId/turnIndex 元数据。
 */
import { EventEmitter } from "node:events";
import type { AgentRunEventType, AgentRunEvent, AgentPluginOutput, AgentPluginOutputs } from "./event-types.js";

/** 拦截器接口定义 */
export interface EventInterceptor {
  intercept(event: AgentRunEvent): AgentRunEvent;
}

export interface EventBusMeta {
  runId: string;
  sessionId: string;
  turnIndex: number;
}

export class WeaveEventBus extends EventEmitter {
  readonly runId: string;
  readonly sessionId: string;
  readonly turnIndex: number;

  constructor(
    private readonly meta: EventBusMeta,
    private readonly forward: (e: AgentRunEvent) => void,
    private readonly interceptor?: EventInterceptor
  ) {
    super();
    this.runId = meta.runId;
    this.sessionId = meta.sessionId;
    this.turnIndex = meta.turnIndex;
  }

  dispatch(type: AgentRunEventType, payload?: AgentRunEvent["payload"]): void {
    let event = {
      type,
      runId: this.meta.runId,
      timestamp: new Date().toISOString(),
      schemaVersion: "dagent.agent.event.v1",
      eventId: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      payload: (payload ?? {}) as AgentRunEvent["payload"]
    } as AgentRunEvent;

    // 👑 顶级架构设计：Write-Ahead 拦截劫持
    // 拦截器（如 WalManager）负责持久化（Write-Ahead）并自行处理大文本脱水。
    // 绝对不能修改发往内存总线的原始事件，否则会导致 TUI 等观察者脏读。
    if (this.interceptor) {
      this.interceptor.intercept(event);
    }

    this.emit(type, event);
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
