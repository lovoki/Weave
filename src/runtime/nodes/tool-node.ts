/**
 * 文件作用：ToolNode — 表示一次工具调用节点（可能包含多次 attempt 子节点）。
 * inputPorts: args（json）+ intent（text）
 * outputPorts: result（json/text）
 */

import type { NodeKind, GraphPort } from "./node-types.js";
import { BaseNode } from "./base-node.js";

export interface ToolNodeInit {
  toolName: string;
  toolCallId: string;
  args: unknown;
  intentSummary?: string;
  toolGoal?: string;
  maxRetries: number;
  currentAttempt?: number;
}

export class ToolNode extends BaseNode {
  readonly kind: NodeKind = "tool";

  public readonly toolName: string;
  public readonly toolCallId: string;
  public readonly maxRetries: number;
  public currentAttempt: number;

  private args: unknown;
  private readonly intentSummary?: string;
  private readonly toolGoal?: string;
  private resultContent?: unknown;
  private resultOk?: boolean;

  constructor(id: string, init: ToolNodeInit, parentId?: string) {
    super(id, parentId);
    this.toolName = init.toolName;
    this.toolCallId = init.toolCallId;
    this.args = init.args;
    this.intentSummary = init.intentSummary;
    this.toolGoal = init.toolGoal;
    this.maxRetries = init.maxRetries;
    this.currentAttempt = init.currentAttempt ?? 1;
  }

  get title(): string {
    return this.intentSummary || this.toolName;
  }

  /** 设置工具执行结果 */
  setResult(ok: boolean, content?: unknown): void {
    this.resultOk = ok;
    this.resultContent = content;
  }

  protected getSpecificFields(): Record<string, unknown> {
    return {
      toolName: this.toolName,
      intentSummary: this.intentSummary ?? "",
      toolGoal: this.toolGoal ?? "",
      maxRetries: this.maxRetries,
      currentAttempt: this.currentAttempt
    };
  }

  async getInputPorts(): Promise<GraphPort[]> {
    const ports: GraphPort[] = [
      await this.makePort("args", "json", this.args)
    ];

    if (this.intentSummary) {
      ports.push({ name: "intent", type: "text", content: this.intentSummary });
    }

    return ports;
  }

  async getOutputPorts(): Promise<GraphPort[]> {
    if (this.resultContent === undefined) return [];
    const type = typeof this.resultContent === "string" ? "text" : "json";
    return [await this.makePort("result", type, this.resultContent)];
  }
}
