/**
 * 文件作用：LlmNode — 表示一次 LLM 推理决策节点。
 * inputPorts: systemPrompt（text）+ messages（messages）
 * outputPorts: responseText（text）+ toolCalls（json，有工具调用时）
 */

import type OpenAI from "openai";
import type { NodeKind, GraphPort } from "./node-types.js";
import { BaseNode } from "./base-node.js";

export interface LlmNodeInit {
  step: number;
  systemPrompt?: string;
  messages?: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
}

export class LlmNode extends BaseNode {
  readonly kind: NodeKind = "llm";

  public readonly step: number;
  private systemPrompt?: string;
  private messages?: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  private responseText?: string;
  private toolCalls?: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[];

  constructor(id: string, init: LlmNodeInit, parentId?: string) {
    super(id, parentId);
    this.step = init.step;
    this.systemPrompt = init.systemPrompt;
    this.messages = init.messages;
  }

  get title(): string {
    return `LLM 决策 #${this.step}`;
  }

  /** 设置 LLM 响应结果（afterLlmResponse 时调用） */
  setResponse(
    text: string | null | undefined,
    toolCalls?: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[]
  ): void {
    this.responseText = text ?? undefined;
    this.toolCalls = toolCalls?.length ? toolCalls : undefined;
  }

  protected getSpecificFields(): Record<string, unknown> {
    return { step: this.step };
  }

  async getInputPorts(): Promise<GraphPort[]> {
    const ports: GraphPort[] = [];

    if (this.systemPrompt) {
      ports.push(await this.makePort("systemPrompt", "text", this.systemPrompt));
    }

    if (this.messages?.length) {
      ports.push(await this.makePort("messages", "messages", this.messages));
    }

    return ports;
  }

  async getOutputPorts(): Promise<GraphPort[]> {
    const ports: GraphPort[] = [];

    if (this.responseText !== undefined) {
      ports.push(await this.makePort("responseText", "text", this.responseText));
    }

    if (this.toolCalls?.length) {
      ports.push(await this.makePort("toolCalls", "json", this.toolCalls));
    }

    return ports;
  }
}
