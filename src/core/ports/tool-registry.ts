import type OpenAI from "openai";

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

export interface IToolRegistry {
  register<TArgs>(tool: ToolDefinition<TArgs>): void;
  resolve(name: string): ToolDefinition | undefined;
  listModelTools(): ModelToolDefinition[];
  execute(name: string, args: unknown, context: ToolExecutionContext): Promise<ToolExecuteResult>;
}
