/**
 * 文件作用：定义大模型配置相关的共享类型，供配置加载层、LLM 适配层和 Agent 运行层复用。
 */
export type LlmProvider = "qwen";

export interface LlmConfig {
  provider: LlmProvider;
  model: string;
  baseUrl: string;
  apiKey?: string;
  apiKeyEnv?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}
