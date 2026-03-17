/**
 * 文件作用：Weave DAG 事件发射器，封装所有 DAG 可视化事件的构造与发射。
 * 供 AgentRuntime 调用，消除 run-agent.ts 中重复的事件构造逻辑。
 */
import {
  createDagEventEnvelope,
  type DagNodeDetailPayload,
  type DagNodeTransitionPayload,
  type DagSchedulerIssuePayload
} from "../runtime/dag-event-contract.js";
import { safeJsonStringify } from "../utils/text-utils.js";
import type { AgentPluginOutput } from "./plugins/agent-plugin.js";

// ─── 类型定义 ───

type EmitPluginOutputFn = (runId: string, output: AgentPluginOutput) => void;

export interface WeaveDagNodePayload {
  nodeId: string;
  parentId?: string;
  label: string;
  status: "running" | "waiting" | "success" | "fail";
}

export interface WeaveDagDetailPayload {
  nodeId: string;
  text: string;
}

// ─── 事件发射函数 ───

/**
 * 发射 DAG 节点状态转换事件（dag.node.transition）。
 */
export function emitDagNodeTransition(
  runId: string,
  payload: DagNodeTransitionPayload,
  emit: EmitPluginOutputFn
): void {
  const envelope = createDagEventEnvelope(runId, "dag.node.transition", payload);
  emit(runId, {
    pluginName: "weave",
    outputType: "weave.dag.event",
    outputText: safeJsonStringify(envelope)
  });
}

/**
 * 发射 Weave DAG 节点事件（weave.dag.node）。
 */
export function emitWeaveDagNode(
  runId: string,
  payload: WeaveDagNodePayload,
  emit: EmitPluginOutputFn
): void {
  emit(runId, {
    pluginName: "weave",
    outputType: "weave.dag.node",
    outputText: safeJsonStringify(payload)
  });
}

/**
 * 发射 Weave DAG 详情事件（weave.dag.detail）。
 */
export function emitWeaveDagDetail(
  runId: string,
  payload: WeaveDagDetailPayload,
  emit: EmitPluginOutputFn
): void {
  emit(runId, {
    pluginName: "weave",
    outputType: "weave.dag.detail",
    outputText: safeJsonStringify(payload)
  });
}

/**
 * 发射 DAG 节点详情事件（dag.node.detail）。
 */
export function emitDagNodeDetail(
  runId: string,
  payload: DagNodeDetailPayload,
  emit: EmitPluginOutputFn
): void {
  const envelope = createDagEventEnvelope(runId, "dag.node.detail", payload);
  emit(runId, {
    pluginName: "weave",
    outputType: "weave.dag.event",
    outputText: safeJsonStringify(envelope)
  });
}

/**
 * 发射 DAG 调度器问题事件（dag.scheduler.deadlock / dag.scheduler.integrity）。
 */
export function emitDagSchedulerIssue(
  runId: string,
  eventType: "dag.scheduler.deadlock" | "dag.scheduler.integrity",
  payload: DagSchedulerIssuePayload,
  emit: EmitPluginOutputFn
): void {
  const envelope = createDagEventEnvelope(runId, eventType, payload);
  emit(runId, {
    pluginName: "weave",
    outputType: "weave.dag.event",
    outputText: safeJsonStringify(envelope)
  });
}
