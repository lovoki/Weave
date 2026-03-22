/**
 * 文件作用：EscalationNode — 表示重试耗尽后升级到主循环的节点。
 */

import type { NodeKind, GraphPort } from "../../core/engine/node-types.js";
import { BaseNode } from "./base-node.js";
import type { EngineContext } from "../../core/engine/engine-types.js";

export class EscalationNode extends BaseNode<EngineContext> {
  readonly kind: NodeKind = "escalation";

  private readonly toolName: string;

  constructor(id: string, toolName: string, parentId?: string) {
    super(id, parentId);
    this.toolName = toolName;
    this.status = "fail";
    this.completedAt = new Date().toISOString();
  }

  get title(): string {
    return "重试耗尽，升级主循环";
  }

  protected getSpecificFields(): Record<string, unknown> {
    return { toolName: this.toolName };
  }

  async getInputPorts(_ctx: EngineContext): Promise<GraphPort[]> {
    return [];
  }

  async getOutputPorts(_ctx: EngineContext): Promise<GraphPort[]> {
    return [];
  }
}
