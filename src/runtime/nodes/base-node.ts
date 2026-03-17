/**
 * 文件作用：BaseNode 抽象基类 — 所有 DAG 可视化节点的统一父类。
 * 持有唯一状态源（status/startedAt/completedAt/error/metrics），
 * 子类仅提供 kind/title/getSpecificFields/getInputPorts/getOutputPorts。
 *
 * toFullPayload() 末尾使用 safeClone 生成不可变快照（深拷贝 + 循环引用防爆）。
 */

import type {
  NodeKind,
  NodeStatus,
  NodeMetrics,
  NodeError,
  GraphPort,
  BaseNodePayload
} from "./node-types.js";
import { safeClone } from "./safe-serialize.js";
import { globalBlobStore } from "../blob-store.js";

export abstract class BaseNode {
  abstract readonly kind: NodeKind;
  abstract readonly title: string;

  // ── 唯一真相源 ──────────────────────────────────────────────────────────────
  public status: NodeStatus = "pending";
  public startedAt?: string;
  public completedAt?: string;
  public error?: NodeError;
  public metrics: NodeMetrics = {};
  public dependencies: string[] = [];
  public tags?: string[];

  constructor(
    public readonly id: string,
    public readonly parentId?: string
  ) {}

  // ── 子类扩展点 ───────────────────────────────────────────────────────────────

  /** 子类特有字段（不包含基类字段） */
  protected abstract getSpecificFields(): Record<string, unknown>;

  /** 返回输入端口列表（async 以支持 BlobStore 大内容处理） */
  abstract getInputPorts(): Promise<GraphPort[]>;

  /** 返回输出端口列表 */
  abstract getOutputPorts(): Promise<GraphPort[]>;

  // ── 工具方法 ─────────────────────────────────────────────────────────────────

  /** 标记节点开始执行 */
  markRunning(): void {
    this.status = "running";
    this.startedAt = new Date().toISOString();
  }

  /** 标记节点成功完成 */
  markSuccess(durationMs?: number): void {
    this.status = "success";
    this.completedAt = new Date().toISOString();
    if (durationMs !== undefined) {
      this.metrics.durationMs = durationMs;
    }
  }

  /** 标记节点失败 */
  markFailed(err: Error | { name: string; message: string; stack?: string }): void {
    this.status = "fail";
    this.completedAt = new Date().toISOString();
    this.error = {
      name: err.name,
      message: err.message,
      stack: "stack" in err ? err.stack : undefined
    };
  }

  // ── 序列化 ───────────────────────────────────────────────────────────────────

  /**
   * 生成完整 BaseNodePayload 快照。
   * - 收集 inputPorts/outputPorts（经 BlobStore 处理大内容）
   * - 末尾调用 safeClone 生成不可变深拷贝
   */
  async toFullPayload(): Promise<BaseNodePayload> {
    const inputPorts = await this.getInputPorts();
    const outputPorts = await this.getOutputPorts();

    const raw: BaseNodePayload = {
      nodeId: this.id,
      kind: this.kind,
      title: this.title,
      parentId: this.parentId,
      dependencies: this.dependencies.length > 0 ? [...this.dependencies] : undefined,
      status: this.status,
      tags: this.tags,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      error: this.error,
      metrics: Object.keys(this.metrics).length > 0 ? { ...this.metrics } : undefined,
      inputPorts: inputPorts.length > 0 ? inputPorts : undefined,
      outputPorts: outputPorts.length > 0 ? outputPorts : undefined,
      ...this.getSpecificFields()
    };

    return safeClone(raw);
  }

  // ── 受保护辅助方法 ────────────────────────────────────────────────────────────

  /**
   * 将任意内容转换为 GraphPort，自动处理大内容 blobRef。
   */
  protected async makePort(
    name: string,
    type: GraphPort["type"],
    content: unknown
  ): Promise<GraphPort> {
    const stored = await globalBlobStore.store(content);
    return { name, type, content: stored.content, blobRef: stored.blobRef };
  }
}
