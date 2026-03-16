import type OpenAI from "openai";
import type { ToolExecuteResult } from "../../tools/tool-types.js";

/**
 * 文件作用：定义 Agent-loop 插件接口与钩子上下文，支持在关键执行点扩展能力（如 Weave）。
 */
export interface AgentPluginOutput {
  pluginName: string;
  outputType: string;
  outputText: string;
}

export type AgentPluginOutputs = AgentPluginOutput | AgentPluginOutput[] | void;

export interface AgentPluginRunContext {
  runId: string;
  sessionId: string;
  turnIndex: number;
  userInput: string;
}

export interface BeforeLlmRequestContext extends AgentPluginRunContext {
  step: number;
  systemPrompt: string;
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
}

export interface AfterLlmResponseContext extends AgentPluginRunContext {
  step: number;
  assistantMessage: OpenAI.Chat.Completions.ChatCompletionMessage;
}

export interface BeforeToolExecutionContext extends AgentPluginRunContext {
  step: number;
  toolName: string;
  toolCallId: string;
  args: unknown;
}

export interface AfterToolExecutionContext extends AgentPluginRunContext {
  step: number;
  toolName: string;
  toolCallId: string;
  args: unknown;
  result: ToolExecuteResult;
}

export interface RunCompletedContext extends AgentPluginRunContext {
  finalText: string;
}

export interface RunErrorContext extends AgentPluginRunContext {
  errorMessage: string;
}

export interface AgentLoopPlugin {
  name: string;
  onRunStart?: (context: AgentPluginRunContext) => Promise<AgentPluginOutputs> | AgentPluginOutputs;
  beforeLlmRequest?: (
    context: BeforeLlmRequestContext
  ) =>
    | Promise<{ systemPrompt?: string; output?: AgentPluginOutput | AgentPluginOutput[] } | void>
    | { systemPrompt?: string; output?: AgentPluginOutput | AgentPluginOutput[] }
    | void;
  afterLlmResponse?: (context: AfterLlmResponseContext) => Promise<AgentPluginOutputs> | AgentPluginOutputs;
  beforeToolExecution?: (
    context: BeforeToolExecutionContext
  ) => Promise<AgentPluginOutputs> | AgentPluginOutputs;
  afterToolExecution?: (
    context: AfterToolExecutionContext
  ) => Promise<AgentPluginOutputs> | AgentPluginOutputs;
  onRunCompleted?: (context: RunCompletedContext) => Promise<AgentPluginOutputs> | AgentPluginOutputs;
  onRunError?: (context: RunErrorContext) => Promise<AgentPluginOutputs> | AgentPluginOutputs;
}
