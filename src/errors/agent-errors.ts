/**
 * 文件作用：统一业务错误类型定义。
 * 供调用方通过 instanceof 区分错误类别，决定处理策略。
 */

/** 工具执行超时 */
export class ToolTimeoutError extends Error {
  public readonly toolName: string;
  public readonly timeoutMs: number;

  constructor(toolName: string, timeoutMs: number) {
    super(`工具执行超时: ${toolName} 超过 ${timeoutMs}ms`);
    this.name = "ToolTimeoutError";
    this.toolName = toolName;
    this.timeoutMs = timeoutMs;
  }
}

/** 工具执行失败（非超时） */
export class ToolExecutionError extends Error {
  public readonly toolName: string;
  public readonly toolCallId: string;

  constructor(toolName: string, toolCallId: string, message: string) {
    super(message);
    this.name = "ToolExecutionError";
    this.toolName = toolName;
    this.toolCallId = toolCallId;
  }
}

/** DAG 调度死锁 */
export class DagDeadlockError extends Error {
  public readonly remainingNodeIds: string[];

  constructor(remainingNodeIds: string[]) {
    super("DAG 调度死锁：存在未完成节点但无可执行 ready 节点");
    this.name = "DagDeadlockError";
    this.remainingNodeIds = remainingNodeIds;
  }
}

/** LLM 调用失败 */
export class LlmCallError extends Error {
  public readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "LlmCallError";
    this.cause = cause;
  }
}

/** 参数校验错误 */
export class ValidationError extends Error {
  public readonly field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
  }
}

/**
 * 从未知错误中安全提取错误消息。
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
