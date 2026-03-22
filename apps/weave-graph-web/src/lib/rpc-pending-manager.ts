/*
 * 文件作用：RPC Pending 状态管理器。
 * 统一管理请求注册、发送后计时、取消和消费，确保超时语义可测试且一致。
 */

export interface RpcPendingEntry {
  resolve: (data: any) => void;
  reject: (error: string) => void;
  type: string;
  payload: unknown;
  resyncRetried?: boolean;
  timer?: ReturnType<typeof setTimeout>;
}

export class RpcPendingManager {
  private readonly pending = new Map<string, RpcPendingEntry>();

  constructor(private readonly timeoutMs: number) {}

  register(reqId: string, entry: Omit<RpcPendingEntry, "timer">): void {
    this.pending.set(reqId, {
      ...entry,
      timer: undefined
    });
  }

  markDispatched(reqId: string): void {
    const entry = this.pending.get(reqId);
    if (!entry || entry.timer) {
      return;
    }

    entry.timer = setTimeout(() => {
      const timeoutEntry = this.pending.get(reqId);
      if (!timeoutEntry) {
        return;
      }
      this.pending.delete(reqId);
      timeoutEntry.reject("RPC Timeout");
    }, this.timeoutMs);
  }

  cancel(reqId: string, reason = "RPC Canceled"): void {
    const entry = this.pending.get(reqId);
    if (!entry) {
      return;
    }

    if (entry.timer) {
      clearTimeout(entry.timer);
    }
    this.pending.delete(reqId);
    entry.reject(reason);
  }

  consume(reqId: string): RpcPendingEntry | undefined {
    const entry = this.pending.get(reqId);
    if (!entry) {
      return undefined;
    }

    if (entry.timer) {
      clearTimeout(entry.timer);
    }
    this.pending.delete(reqId);
    return entry;
  }

  has(reqId: string): boolean {
    return this.pending.has(reqId);
  }

  size(): number {
    return this.pending.size;
  }
}
