import type OpenAI from "openai";

/**
 * 文件作用：定义工具系统的核心类型，解耦 Agent 运行层与具体工具实现。
 */
export interface ToolExecutionContext {
  sessionId: string;
  runId: string;
  workspaceRoot: string;
}

export interface ToolExecuteResult {
  ok: boolean;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface ToolDefinition<TArgs = unknown> {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (context: ToolExecutionContext, args: TArgs) => Promise<ToolExecuteResult>;
}

export type ModelToolDefinition = OpenAI.Chat.Completions.ChatCompletionTool;
