/*
 * 文件作用：维护 run 与 session 的占用关系，提供 Fast-Fail 并发守卫与状态迁移。
 */

export type RunState = "running" | "completed" | "failed" | "aborted";

export interface RunRecord {
  runId: string;
  sessionId: string;
  state: RunState;
  createdAt: string;
  updatedAt: string;
}

export class RunRegistry {
  private readonly byRunId = new Map<string, RunRecord>();
  private readonly activeRunBySession = new Map<string, string>();

  canStart(sessionId: string): boolean {
    return !this.activeRunBySession.has(sessionId);
  }

  getActiveRunIds(): string[] {
    return Array.from(this.activeRunBySession.values());
  }

  start(runId: string, sessionId: string, at: string): RunRecord {
    const record: RunRecord = {
      runId,
      sessionId,
      state: "running",
      createdAt: at,
      updatedAt: at
    };
    this.byRunId.set(runId, record);
    this.activeRunBySession.set(sessionId, runId);
    return record;
  }

  get(runId: string): RunRecord | undefined {
    return this.byRunId.get(runId);
  }

  mark(runId: string, state: RunState, at: string): RunRecord | undefined {
    const existing = this.byRunId.get(runId);
    if (!existing) {
      return undefined;
    }

    const next: RunRecord = {
      ...existing,
      state,
      updatedAt: at
    };
    this.byRunId.set(runId, next);

    if (state !== "running") {
      const activeRunId = this.activeRunBySession.get(existing.sessionId);
      if (activeRunId === runId) {
        this.activeRunBySession.delete(existing.sessionId);
      }
    }

    return next;
  }
}
