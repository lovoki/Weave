/**
 * 文件作用：FinalNode — 表示本轮对话的最终回答节点。
 * outputPorts: responseText（text）
 */

import type { NodeKind, GraphPort } from "./node-types.js";
import { BaseNode } from "./base-node.js";

export class FinalNode extends BaseNode {
  readonly kind: NodeKind = "final";

  private responseText?: string;

  constructor(id: string, text?: string, parentId?: string) {
    super(id, parentId);
    this.responseText = text;
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
