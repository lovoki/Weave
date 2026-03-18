import type OpenAI from "openai";
import type {
  AgentLoopPlugin,
  AgentPluginOutput,
  AgentPluginOutputs,
  AgentPluginRunContext,
  BeforeLlmRequestContext,
  AfterLlmResponseContext,
  BeforeToolExecutionContext,
  AfterToolExecutionContext,
  RunCompletedContext,
  RunErrorContext
} from "../agent/plugins/agent-plugin.js";
import { formatToolIntent } from "./tool-formatters.js";
import { LlmNode } from "../runtime/nodes/llm-node.js";
import { ToolNode } from "../runtime/nodes/tool-node.js";
import { AttemptNode } from "../runtime/nodes/attempt-node.js";
import { RepairNode } from "../runtime/nodes/repair-node.js";
import { FinalNode } from "../runtime/nodes/final-node.js";
import { InputNode } from "../runtime/nodes/input-node.js";
import { EscalationNode } from "../runtime/nodes/escalation-node.js";
import type { BaseNode } from "../runtime/nodes/base-node.js";
import type { BaseNodePayload } from "../runtime/nodes/node-types.js";
import { safeClone } from "../runtime/nodes/safe-serialize.js";

/**
 * 文件作用：以观察者模式监听 Agent 原生动作，实时输出动态 DAG 节点事件。
 * 使用 BaseNode 类体系管理节点状态，通过 toFullPayload() 生成统一 DTO，
 * 发射 weave.dag.base_node 事件供 GraphProjector 直接解构。
 */

// ─── 辅助函数 ───────────────────────────────────────────────────────────────

function buildBaseNodeOutput(payload: BaseNodePayload): AgentPluginOutput {
  return {
    pluginName: "weave",
    outputType: "weave.dag.base_node",
    outputText: JSON.stringify(safeClone(payload))
  };
}

function buildDagEdge(event: {
  sourceId: string;
  targetId: string;
  fromPort?: string;
  toPort?: string;
  edgeKind?: "dependency" | "data" | "retry";
  label?: string;
}): AgentPluginOutput {
  return {
    pluginName: "weave",
    outputType: "weave.dag.edge",
    outputText: JSON.stringify(event)
  };
}

// ─── TurnDAGBuilder ──────────────────────────────────────────────────────────

class TurnDAGBuilder {
  private llmIndex = 0;
  private toolIndex = 0;
  currentLlmId = "";
  private toolIdByCallId = new Map<string, string>();
  private completedToolIds: string[] = [];
  private readonly nodeRegistry = new Map<string, BaseNode>();

  private register<T extends BaseNode>(node: T): T {
    this.nodeRegistry.set(node.id, node);
    return node;
  }

  getNode(nodeId: string): BaseNode | undefined {
    return this.nodeRegistry.get(nodeId);
  }

  // ── InputNode ──────────────────────────────────────────────────────────────

  async buildInputNode(userInput?: string): Promise<AgentPluginOutput[]> {
    const node = this.register(new InputNode("input", userInput));
    return [buildBaseNodeOutput(await node.toFullPayload())];
  }

  // ── LlmNode ───────────────────────────────────────────────────────────────

  async buildBeforeLlm(
    step: number,
    systemPrompt: string,
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
  ): Promise<AgentPluginOutput[]> {
    const outputs: AgentPluginOutput[] = [];

    this.llmIndex++;
    const llmId = `llm-${this.llmIndex}`;
    const llmNode = this.register(new LlmNode(llmId, { step, systemPrompt, messages }));
    llmNode.markRunning();

    // 从 InputNode 或上一轮工具结果连接到新 LLM
    if (this.llmIndex === 1) {
      outputs.push(buildDagEdge({
        sourceId: "input",
        targetId: llmId,
        fromPort: "userQuery",
        toPort: "context",
        edgeKind: "data"
      }));
    } else if (this.completedToolIds.length > 0) {
      for (const toolId of this.completedToolIds) {
        outputs.push(buildDagEdge({
          sourceId: toolId,
          targetId: llmId,
          fromPort: "result",
          toPort: "tool_result",
          edgeKind: "data"
        }));
      }
    } else if (this.currentLlmId) {
      outputs.push(buildDagEdge({
        sourceId: this.currentLlmId,
        targetId: llmId,
        edgeKind: "dependency"
      }));
    }

    this.completedToolIds = [];
    this.currentLlmId = llmId;

    outputs.push(buildBaseNodeOutput(await llmNode.toFullPayload()));
    return outputs;
  }

  async buildAfterLlm(
    assistantMessage: OpenAI.Chat.Completions.ChatCompletionMessage
  ): Promise<AgentPluginOutput[]> {
    if (!this.currentLlmId) return [];

    const node = this.nodeRegistry.get(this.currentLlmId) as LlmNode | undefined;
    if (!node) return [];

    const hasTools = Boolean(assistantMessage.tool_calls?.length);
    node.setResponse(assistantMessage.content, assistantMessage.tool_calls ?? undefined);

    if (hasTools) {
      node.status = "waiting";
    } else {
      node.markSuccess();
    }

    return [buildBaseNodeOutput(await node.toFullPayload())];
  }

  // ── ToolNode / AttemptNode / RepairNode ────────────────────────────────────

  async buildBeforeTool(
    toolCallId: string,
    toolName: string,
    args: unknown,
    intentSummary: string | undefined,
    attempt: number,
    maxRetries: number,
    previousError: string | undefined,
    repairedFrom: Record<string, unknown> | undefined
  ): Promise<AgentPluginOutput[]> {
    const outputs: AgentPluginOutput[] = [];
    const semantic = formatToolIntent(toolName, args);
    const title = intentSummary || semantic.title;

    if (attempt === 1) {
      // 首次执行：创建 ToolNode
      this.toolIndex++;
      const toolId = `tool-${this.toolIndex}`;
      this.toolIdByCallId.set(toolCallId, toolId);

      const toolNode = this.register(new ToolNode(
        toolId,
        {
          toolName,
          toolCallId,
          args: (args && typeof args === "object" ? args : {}) as Record<string, unknown>,
          intent: title,
          maxRetries,
          step: this.toolIndex
        },
        this.currentLlmId || undefined
      ));
      toolNode.markRunning();

      // LLM → Tool 数据流边
      if (this.currentLlmId) {
        outputs.push(buildDagEdge({
          sourceId: this.currentLlmId,
          targetId: toolId,
          fromPort: "toolCalls",
          toPort: "trigger",
          edgeKind: "data"
        }));
      }

      outputs.push(buildBaseNodeOutput(await toolNode.toFullPayload()));
    } else {
      // 重试：创建 RepairNode + AttemptNode
      const toolId = this.toolIdByCallId.get(toolCallId);
      if (!toolId) return outputs;

      const retrySourceId = attempt === 2 ? toolId : `${toolId}:attempt-${attempt - 1}`;
      const repairId = `${toolId}:repair-${attempt - 1}`;
      const attemptId = `${toolId}:attempt-${attempt}`;

      // RepairNode
      const repairNode = this.register(new RepairNode(
        repairId,
        { lastError: previousError, originalArgs: repairedFrom },
        toolId
      ));
      repairNode.status = "success";
      repairNode.completedAt = new Date().toISOString();

      outputs.push(buildDagEdge({ sourceId: retrySourceId, targetId: repairId, edgeKind: "retry" }));
      outputs.push(buildBaseNodeOutput(await repairNode.toFullPayload()));

      // AttemptNode
      const attemptNode = this.register(new AttemptNode(
        attemptId,
        { attemptIndex: attempt, args },
        toolId
      ));
      attemptNode.markRunning();

      outputs.push(buildDagEdge({ sourceId: repairId, targetId: attemptId, edgeKind: "retry" }));
      outputs.push(buildBaseNodeOutput(await attemptNode.toFullPayload()));
    }

    return outputs;
  }

  async buildAfterTool(
    toolCallId: string,
    toolName: string,
    result: { ok: boolean; content?: unknown },
    attempt: number,
    maxRetries: number,
    allFailed: boolean | undefined
  ): Promise<AgentPluginOutput[]> {
    const outputs: AgentPluginOutput[] = [];
    const toolId = this.toolIdByCallId.get(toolCallId);
    if (!toolId) return outputs;

    const toolNode = this.nodeRegistry.get(toolId) as ToolNode | undefined;
    const errMsg = typeof result.content === "string"
      ? result.content
      : (result.content ? JSON.stringify(result.content).slice(0, 200) : "执行失败");

    if (result.ok) {
      if (attempt === 1) {
        if (toolNode) {
          toolNode.setResult(true, result.content);
          toolNode.markSuccess();
          outputs.push(buildBaseNodeOutput(await toolNode.toFullPayload()));
        }
      } else {
        const attemptId = `${toolId}:attempt-${attempt}`;
        const attemptNode = this.nodeRegistry.get(attemptId) as AttemptNode | undefined;
        if (attemptNode) {
          attemptNode.setSuccess(result.content);
          outputs.push(buildBaseNodeOutput(await attemptNode.toFullPayload()));
        }
        if (toolNode) {
          toolNode.setResult(true, result.content);
          toolNode.markSuccess();
          outputs.push(buildBaseNodeOutput(await toolNode.toFullPayload()));
        }
      }
      this.completedToolIds.push(toolId);
    } else if (allFailed) {
      if (attempt === 1) {
        if (toolNode) {
          toolNode.setResult(false, result.content);
          toolNode.markFailed({ name: "ToolError", message: errMsg });
          outputs.push(buildBaseNodeOutput(await toolNode.toFullPayload()));
        }
      } else {
        const attemptId = `${toolId}:attempt-${attempt}`;
        const attemptNode = this.nodeRegistry.get(attemptId) as AttemptNode | undefined;
        if (attemptNode) {
          attemptNode.setFailed(errMsg);
          outputs.push(buildBaseNodeOutput(await attemptNode.toFullPayload()));
        }
        if (toolNode) {
          toolNode.setResult(false, result.content);
          toolNode.markFailed({ name: "ToolError", message: errMsg });
          outputs.push(buildBaseNodeOutput(await toolNode.toFullPayload()));
        }
      }

      // EscalationNode
      if (maxRetries > 0) {
        const escalationId = `${toolId}:escalation`;
        const escalationSourceId = attempt === 1 ? toolId : `${toolId}:attempt-${attempt}`;
        const escNode = this.register(new EscalationNode(escalationId, toolName, toolId));
        escNode.error = { name: "EscalationError", message: `${toolName} 重试耗尽` };
        outputs.push(buildDagEdge({ sourceId: escalationSourceId, targetId: escalationId, edgeKind: "dependency" }));
        outputs.push(buildBaseNodeOutput(await escNode.toFullPayload()));
      }

      this.completedToolIds.push(toolId);
    } else {
      // 本次失败但还会重试
      if (attempt > 1) {
        const attemptId = `${toolId}:attempt-${attempt}`;
        const attemptNode = this.nodeRegistry.get(attemptId) as AttemptNode | undefined;
        if (attemptNode) {
          attemptNode.setFailed(errMsg);
          outputs.push(buildBaseNodeOutput(await attemptNode.toFullPayload()));
        }
      }
    }

    return outputs;
  }

  // ── FinalNode ──────────────────────────────────────────────────────────────

  async buildFinalNode(finalText: string): Promise<AgentPluginOutput[]> {
    const outputs: AgentPluginOutput[] = [];
    const node = this.register(new FinalNode("final", finalText));

    outputs.push(buildBaseNodeOutput(await node.toFullPayload()));

    if (this.currentLlmId) {
      outputs.push(buildDagEdge({
        sourceId: this.currentLlmId,
        targetId: "final",
        fromPort: "responseText",
        toPort: "response",
        edgeKind: "data"
      }));
    }

    return outputs;
  }
}

// ─── WeaveRunState ───────────────────────────────────────────────────────────

interface WeaveRunState {
  builder: TurnDAGBuilder;
}

// ─── WeavePlugin ─────────────────────────────────────────────────────────────

export class WeavePlugin implements AgentLoopPlugin {
  name = "weave";
  private readonly runStates = new Map<string, WeaveRunState>();

  async onRunStart(context: AgentPluginRunContext): Promise<AgentPluginOutputs> {
    const builder = new TurnDAGBuilder();
    this.runStates.set(context.runId, { builder });
    return builder.buildInputNode(context.userInput);
  }

  async beforeLlmRequest(
    context: BeforeLlmRequestContext
  ): Promise<{ systemPrompt?: string; output?: AgentPluginOutput | AgentPluginOutput[] } | void> {
    const state = this.runStates.get(context.runId);
    if (!state) return;

    const outputs: AgentPluginOutput[] = [];

    // 若有前一个 LLM 节点（status=waiting），标记为完成
    if (state.builder.currentLlmId) {
      const prevNode = state.builder.getNode(state.builder.currentLlmId) as LlmNode | undefined;
      if (prevNode && prevNode.status === "waiting") {
        prevNode.status = "success";
        prevNode.completedAt = new Date().toISOString();
        outputs.push(buildBaseNodeOutput(await prevNode.toFullPayload()));
      }
    }

    // 构建新 LLM 节点及前驱边
    outputs.push(...await state.builder.buildBeforeLlm(
      context.step,
      context.systemPrompt,
      context.messages
    ));

    return { output: outputs };
  }

  async afterLlmResponse(context: AfterLlmResponseContext): Promise<AgentPluginOutputs> {
    const state = this.runStates.get(context.runId);
    if (!state) return;

    return state.builder.buildAfterLlm(context.assistantMessage);
  }

  async beforeToolExecution(context: BeforeToolExecutionContext): Promise<AgentPluginOutputs> {
    const state = this.runStates.get(context.runId);
    if (!state) return;

    return state.builder.buildBeforeTool(
      context.toolCallId,
      context.toolName,
      context.args,
      context.intentSummary,
      context.attempt,
      context.maxRetries,
      context.previousError,
      context.repairedFrom
    );
  }

  async afterToolExecution(context: AfterToolExecutionContext): Promise<AgentPluginOutputs> {
    const state = this.runStates.get(context.runId);
    if (!state) return;

    return state.builder.buildAfterTool(
      context.toolCallId,
      context.toolName,
      context.result,
      context.attempt,
      context.totalAttempts - 1,
      context.allFailed
    );
  }

  async onRunCompleted(context: RunCompletedContext): Promise<AgentPluginOutputs> {
    const state = this.runStates.get(context.runId);
    if (!state) return;

    const outputs: AgentPluginOutput[] = [];
    const currentLlmId = state.builder.currentLlmId;
    this.runStates.delete(context.runId);

    // 最后一轮 LLM 标记为完成
    if (currentLlmId) {
      const llmNode = state.builder.getNode(currentLlmId) as LlmNode | undefined;
      if (llmNode && llmNode.status !== "success") {
        llmNode.status = "success";
        llmNode.completedAt = new Date().toISOString();
        outputs.push(buildBaseNodeOutput(await llmNode.toFullPayload()));
      }
    }

    // FinalNode + 连接边
    outputs.push(...await state.builder.buildFinalNode(context.finalText));

    return outputs;
  }

  async onRunError(context: RunErrorContext): Promise<AgentPluginOutputs> {
    const state = this.runStates.get(context.runId);
    this.runStates.delete(context.runId);

    const currentLlmId = state?.builder.currentLlmId;

    if (currentLlmId) {
      const llmNode = state?.builder.getNode(currentLlmId) as LlmNode | undefined;
      if (llmNode) {
        llmNode.markFailed({ name: "RunError", message: context.errorMessage });
        const payload = await llmNode.toFullPayload();
        return [buildBaseNodeOutput(payload)];
      }
    }

    // 无 LLM 节点时：返回一个系统错误节点
    const errPayload: BaseNodePayload = {
      nodeId: "error",
      kind: "system",
      title: `运行失败: ${context.errorMessage}`,
      status: "fail",
      error: { name: "RunError", message: context.errorMessage }
    };
    return [buildBaseNodeOutput(errPayload)];
  }
}
