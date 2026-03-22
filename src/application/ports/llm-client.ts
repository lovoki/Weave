import type OpenAI from "openai";

export interface ChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatTurnInput {
  systemPrompt?: string;
  userMessage: string;
  historyMessages?: ChatHistoryMessage[];
  abortSignal?: AbortSignal;
}

export interface ChatStreamOptions {
  onDelta?: (deltaText: string) => void;
}

export interface ChatLoopInput {
  systemPrompt: string;
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  tools: OpenAI.Chat.Completions.ChatCompletionTool[];
  abortSignal?: AbortSignal;
}

export interface ILlmClient {
  chat(input: ChatTurnInput): Promise<string>;
  chatStream(input: ChatTurnInput, options?: ChatStreamOptions): Promise<string>;
  chatWithTools(
    input: ChatLoopInput,
    options?: { onDelta?: (delta: string) => void }
  ): Promise<OpenAI.Chat.Completions.ChatCompletionMessage>;
}
