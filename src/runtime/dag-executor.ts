/**
 * 文件作用：DAG 执行器 — 主循环，并行调度所有就绪的可执行节点。
 * 每轮循环取所有 ready 节点并行执行，直到 DAG 无挂起工作为止。
 */
import type { DagExecutionGraph } from "./dag-graph.js";
import type { RunContext } from "../session/run-context.js";
import type { BaseNode } from "./nodes/base-node.js";
import {
  emitDagSchedulerIssue
} from "../agent/weave-emitter.js";

export class DagDeadlockError extends Error {
  constructor(public readonly pendingNodeIds: string[]) {
    super(`DAG 调度死锁：存在未完成节点但无可执行 ready 节点 [${pendingNodeIds.join(", ")}]`);
    this.name = "DagDeadlockError";
  }
}

export async function executeDag(dag: DagExecutionGraph, ctx: RunContext): Promise<string> {
  while (dag.hasPendingWork()) {
    const readyIds = dag.getReadyNodeIds().sort();

    if (readyIds.length === 0) {
      const pendingIds = dag.getInProgressNodeIds();
      emitDagSchedulerIssue(
        ctx.runId,
        "dag.scheduler.deadlock",
        { message: "DAG 调度死锁：存在未完成节点但无可执行 ready 节点", remainingNodeIds: pendingIds },
        (_runId, output) => ctx.bus.dispatchPluginOutput(output)
      );
      throw new DagDeadlockError(pendingIds);
    }

    // 并行执行所有就绪节点
    // JS 单线程安全：dag 状态变更均为同步操作，await 点之间不会有 race condition
    await Promise.all(
      readyIds.map(id => {
        const node = ctx.nodeRegistry.get(id) as BaseNode | undefined;
        if (!node) {
          throw new Error(`executeDag: 无法找到可执行节点 ${id}，节点未在 ctx.nodeRegistry 中注册`);
        }
        return node.execute(ctx);
      })
    );
  }

  return ctx.stateStore.getFinalText();
}
