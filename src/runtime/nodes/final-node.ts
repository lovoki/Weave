/**
 * 文件作用：FinalNode — 表示本轮对话的最终回答节点，execute() 负责流式输出文本。
 * outputPorts: responseText（text）
 */

import type { NodeKind, GraphPort } from "./node-types.js";
import { BaseNode } from "./base-node.js";
import type { RunContext } from "../../session/run-context.js";

export class FinalNode extends BaseNode {
  readonly kind: NodeKind = "final";

  private responseText: string;

  constructor(id: string, text?: string, parentId?: string) {
    super(id, parentId);
    this.responseText = text ?? "";
    if (text !== undefined) {
      this.status = "success";
      this.completedAt = new Date().toISOString();
    }
  }

  get title(): string {
    return "本轮完成";
  }

  setResponse(text: string): void {
    this.responseText = text;
    this.status = "success";
    this.completedAt = new Date().toISOString();
  }

  async execute(ctx: RunContext): Promise<void> {
    this.markRunning();
    this.transitionInDag(ctx, "running", "scheduler-picked");

    // 从 stateStore 尝试解析最终文本（DAG 数据边传递）
    const dagInput = ctx.stateStore.resolveNodeInput(ctx.dag, this.id);
    const finalText = this.responseText ||
      (typeof dagInput.finalText === "string" ? dagInput.finalText : "");

    this.responseText = finalText;

    // 流式输出
    await ctx.emitTextAsStream(finalText);

    // 记录到状态存储（dag-executor 读取此值作为返回结果）
    ctx.stateStore.setRunValue("finalText", finalText);
    ctx.stateStore.setNodeOutput(this.id, { ok: true, content: finalText });

    this.markSuccess();
    this.transitionInDag(ctx, "success", "final-emitted");
  }

  protected getSpecificFields(): Record<string, unknown> {
    return this.responseText !== undefined ? { text: this.responseText.slice(0, 200) } : {};
  }

  async getInputPorts(): Promise<GraphPort[]> {
    return [];
  }

  async getOutputPorts(): Promise<GraphPort[]> {
    if (!this.responseText) return [];
    return [await this.makePort("responseText", "text", this.responseText)];
  }
}
