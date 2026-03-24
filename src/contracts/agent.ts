/**
 * 契约层：智能体应用层接口与类型
 * 规则：此文件只允许 Zod Schema、TypeScript interface/type、JSDoc 注释。零业务实现代码。
 */

import { z } from "zod";

// ─── LLM 客户端接口 ──────────────────────────────────────────────────────────

/**
 * 聊天历史消息
 * @example { role: 'user', content: '帮我写一个函数' }
 */
export const ChatHistoryMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});
export type ChatHistoryMessage = z.infer<typeof ChatHistoryMessageSchema>;

/**
 * 单轮对话输入
 * @example { userMessage: '你好', systemPrompt: '你是一个助手' }
 */
export const ChatTurnInputSchema = z.object({
  systemPrompt: z.string().optional(),
  userMessage: z.string(),
  historyMessages: z.array(ChatHistoryMessageSchema).optional(),
  abortSignal: z.instanceof(AbortSignal).optional(),
});
export type ChatTurnInput = z.infer<typeof ChatTurnInputSchema>;

/**
 * LLM 客户端接口 — 封装所有 LLM 调用模式。
 * @example
 * const client: ILlmClient = new QwenClient(config);
 * const response = await client.chat({ userMessage: 'hello' });
 */
export interface ILlmClient {
  chat(input: ChatTurnInput): Promise<string>;
  chatStream(
    input: ChatTurnInput,
    options?: { onDelta?: (deltaText: string) => void }
  ): Promise<string>;
  chatWithTools(
    input: {
      systemPrompt: string;
      messages: unknown[];
      tools: unknown[];
      abortSignal?: AbortSignal;
    },
    options?: { onDelta?: (delta: string) => void }
  ): Promise<unknown>;
}

// ─── 工具注册表接口 ──────────────────────────────────────────────────────────

/**
 * 工具执行上下文
 * @example { sessionId: 'sess-1', runId: 'run-1', workspaceRoot: '/workspace' }
 */
export const ToolExecutionContextSchema = z.object({
  sessionId: z.string(),
  runId: z.string(),
  workspaceRoot: z.string(),
});
export type ToolExecutionContext = z.infer<typeof ToolExecutionContextSchema>;

/**
 * 工具执行结果
 * @example { ok: true, content: '文件已创建', metadata: { path: '/tmp/test.txt' } }
 */
export const ToolExecuteResultSchema = z.object({
  ok: z.boolean(),
  content: z.string(),
  metadata: z.record(z.unknown()).optional(),
});
export type ToolExecuteResult = z.infer<typeof ToolExecuteResultSchema>;

/**
 * 工具注册表接口 — 管理工具注册、解析与执行。
 * @example
 * registry.register({ name: 'read_file', execute: async (ctx, args) => ... });
 * const result = await registry.execute('read_file', { path: '/tmp/a.txt' }, ctx);
 */
export interface IToolRegistry {
  register<TArgs>(tool: {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
    execute: (context: ToolExecutionContext, args: TArgs) => Promise<ToolExecuteResult>;
  }): void;
  resolve(name: string): unknown | undefined;
  listModelTools(): unknown[];
  execute(name: string, args: unknown, context: ToolExecutionContext): Promise<ToolExecuteResult>;
}

// ─── 智能体插件接口 ──────────────────────────────────────────────────────────

/**
 * 插件运行上下文基础字段
 * @example { runId: 'run-1', sessionId: 'sess-1', turnIndex: 0, userInput: '你好' }
 */
export const AgentPluginRunContextSchema = z.object({
  runId: z.string(),
  sessionId: z.string(),
  turnIndex: z.number().int().nonnegative(),
  userInput: z.string(),
});
export type AgentPluginRunContext = z.infer<typeof AgentPluginRunContextSchema>;

/**
 * 插件输出单条目
 * @example { type: 'text', content: '工具执行完成' }
 */
export const AgentPluginOutputSchema = z.object({
  type: z.string(),
  content: z.unknown(),
});
export type AgentPluginOutput = z.infer<typeof AgentPluginOutputSchema>;
export type AgentPluginOutputs = AgentPluginOutput[];

/**
 * 智能体循环插件接口 — 在关键执行点扩展能力（如 Weave 可观测性）。
 *
 * 规则：插件钩子抛异常不能中断主流程（见 ANTI_PATTERNS.md E-007）。
 *
 * @example
 * class LoggingPlugin implements AgentLoopPlugin {
 *   name = 'logging';
 *   async beforeLlmRequest(ctx) { console.log('LLM请求:', ctx.step); }
 * }
 */
export interface AgentLoopPlugin {
  name: string;
  onRunStart?: (context: AgentPluginRunContext) => Promise<AgentPluginOutputs> | AgentPluginOutputs;
  beforeLlmRequest?: (context: {
    runId: string;
    sessionId: string;
    turnIndex: number;
    userInput: string;
    step: number;
    systemPrompt: string;
    messages: unknown[];
  }) => Promise<{
    systemPrompt?: string;
    output?: AgentPluginOutput | AgentPluginOutput[];
  } | void> | void;
  afterLlmResponse?: (context: {
    runId: string;
    sessionId: string;
    turnIndex: number;
    userInput: string;
    step: number;
    assistantMessage: unknown;
  }) => Promise<AgentPluginOutputs> | AgentPluginOutputs;
  beforeToolExecution?: (context: {
    runId: string;
    sessionId: string;
    turnIndex: number;
    userInput: string;
    step: number;
    toolName: string;
    toolCallId: string;
    args: unknown;
    intentSummary?: string;
    attempt: number;
    maxRetries: number;
    previousError?: string;
    repairedFrom?: Record<string, unknown>;
  }) => Promise<AgentPluginOutputs> | AgentPluginOutputs;
  afterToolExecution?: (context: {
    runId: string;
    sessionId: string;
    turnIndex: number;
    userInput: string;
    step: number;
    toolName: string;
    toolCallId: string;
    args: unknown;
    result: ToolExecuteResult;
    intentSummary?: string;
    attempt: number;
    totalAttempts: number;
    wasRepaired: boolean;
    allFailed?: boolean;
  }) => Promise<AgentPluginOutputs> | AgentPluginOutputs;
  onRunCompleted?: (context: {
    runId: string;
    sessionId: string;
    turnIndex: number;
    userInput: string;
    finalText: string;
  }) => Promise<AgentPluginOutputs> | AgentPluginOutputs;
  onRunError?: (context: {
    runId: string;
    sessionId: string;
    turnIndex: number;
    userInput: string;
    errorMessage: string;
  }) => Promise<AgentPluginOutputs> | AgentPluginOutputs;
}
