import type { AgentLoopPlugin, AgentPluginOutput, AgentPluginOutputs } from "../agent/plugins/agent-plugin.js";
import { summarizeText } from "../utils/text-utils.js";
import { formatToolIntent, type ToolIntentSemantic } from "./tool-formatters.js";

/**
 * 文件作用：以观察者模式监听 Agent 原生动作，实时输出动态 DAG 节点事件。
 */
interface WeaveRunState {
  currentLlmNodeId?: string;
  llmNodeCounter: number;
  toolChildCounterByLlmNode: Map<number, number>;
  toolNodeLabelByCallId: Map<string, string>;
}

type DagNodeStatus = "running" | "waiting" | "success" | "fail";

interface DagNodeEvent {
  nodeId: string;
  parentId?: string;
  label: string;
  status: DagNodeStatus;
}

interface DagDetailEvent {
  nodeId: string;
  text: string;
}

export class WeavePlugin implements AgentLoopPlugin {
  name = "weave";
  private readonly runStates = new Map<string, WeaveRunState>();

  onRunStart(context: { runId: string }): AgentPluginOutput | void {
    this.runStates.set(context.runId, {
      currentLlmNodeId: undefined,
      llmNodeCounter: 0,
      toolChildCounterByLlmNode: new Map<number, number>(),
      toolNodeLabelByCallId: new Map<string, string>()
    });
  }

  beforeLlmRequest(context: { runId: string }): { output: AgentPluginOutput | AgentPluginOutput[] } | void {
    const state = this.runStates.get(context.runId);
    if (!state) {
      return;
    }

    const outputs: AgentPluginOutput[] = [];
    if (state.currentLlmNodeId) {
      outputs.push(
        this.buildDagOutput({
          nodeId: state.currentLlmNodeId,
          label: "大模型决策完成，进入下一轮",
          status: "success"
        })
      );
    }

    state.llmNodeCounter += 1;
    const nodeLabel = `${state.llmNodeCounter}`;
    state.currentLlmNodeId = nodeLabel;
    outputs.push(
      this.buildDagOutput({
        nodeId: nodeLabel,
        label: "大模型决策中...",
        status: "running"
      })
    );

    return {
      output: outputs
    };
  }

  afterLlmResponse(context: {
    runId: string;
    assistantMessage: { tool_calls?: Array<unknown>; content?: unknown };
  }): AgentPluginOutputs {
    const state = this.runStates.get(context.runId);
    if (!state || !state.currentLlmNodeId) {
      return;
    }

    const hasTools = Boolean(context.assistantMessage.tool_calls?.length);
    if (hasTools) {
      return [
        this.buildDagOutput({
          nodeId: state.currentLlmNodeId,
          label: "决策为调用工具",
          status: "waiting"
        }),
        this.buildDagDetail({
          nodeId: state.currentLlmNodeId,
          text: `plan=tool_calls x${context.assistantMessage.tool_calls?.length ?? 0}`
        })
      ];
    }

    return this.buildDagOutput({
      nodeId: state.currentLlmNodeId,
      label: "大模型决策完成",
      status: "success"
    });
  }

  beforeToolExecution(context: {
    runId: string;
    toolName: string;
    toolCallId: string;
    args?: unknown;
  }): AgentPluginOutputs {
    const state = this.runStates.get(context.runId);
    if (!state || !state.currentLlmNodeId) {
      return;
    }

    const llmNodeNumber = Number(state.currentLlmNodeId);
    const currentChild = state.toolChildCounterByLlmNode.get(llmNodeNumber) ?? 0;
    const nextChild = currentChild + 1;
    state.toolChildCounterByLlmNode.set(llmNodeNumber, nextChild);

    const label = `${llmNodeNumber}.${nextChild}`;
    state.toolNodeLabelByCallId.set(context.toolCallId, label);
    const semantic = formatToolIntent(context.toolName, context.args);

    return [
      this.buildDagOutput({
        nodeId: label,
        parentId: state.currentLlmNodeId,
        label: semantic.title,
        status: "running"
      }),
      ...semantic.details.map((detail) =>
        this.buildDagDetail({
          nodeId: label,
          text: detail
        })
      )
    ];
  }

  afterToolExecution(context: {
    runId: string;
    toolName: string;
    toolCallId: string;
    result: { ok: boolean; content?: unknown };
  }): AgentPluginOutputs {
    const state = this.runStates.get(context.runId);
    if (!state) {
      return;
    }

    const label = state.toolNodeLabelByCallId.get(context.toolCallId);
    if (!label) {
      return;
    }

    const semantic = formatToolIntent(context.toolName);

    return [
      this.buildDagOutput({
        nodeId: label,
        parentId: state.currentLlmNodeId,
        label: semantic.title,
        status: context.result.ok ? "success" : "fail"
      }),
      this.buildDagDetail({
        nodeId: label,
        text: `${context.result.ok ? "ok" : "fail"}`
      })
    ];
  }

  onRunCompleted(context: { runId: string; finalText: string }): AgentPluginOutputs {
    const state = this.runStates.get(context.runId);
    if (!state) {
      return;
    }

    const currentNode = state.currentLlmNodeId;
    this.runStates.delete(context.runId);

    if (!currentNode) {
      return;
    }

    return [
      this.buildDagOutput({
        nodeId: currentNode,
        label: "本轮完成",
        status: "success"
      }),
      this.buildDagDetail({
        nodeId: currentNode,
        text: `${summarizeText(context.finalText)}`
      })
    ];
  }

  onRunError(context: { runId: string; errorMessage: string }): AgentPluginOutput | void {
    const state = this.runStates.get(context.runId);
    this.runStates.delete(context.runId);

    if (!state?.currentLlmNodeId) {
      return this.buildDagOutput({
        nodeId: "error",
        label: `运行失败: ${context.errorMessage}`,
        status: "fail"
      });
    }

    return this.buildDagOutput({
      nodeId: state.currentLlmNodeId,
      label: context.errorMessage,
      status: "fail"
    });
  }

  private buildDagOutput(event: DagNodeEvent): AgentPluginOutput {
    return {
      pluginName: this.name,
      outputType: "weave.dag.node",
      outputText: JSON.stringify(event)
    };
  }

  private buildDagDetail(event: DagDetailEvent): AgentPluginOutput {
    return {
      pluginName: this.name,
      outputType: "weave.dag.detail",
      outputText: JSON.stringify(event)
    };
  }

}
