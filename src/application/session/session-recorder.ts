import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

/**
 * 文件作用：管理终端会话级记录，按 sessionId 将用户输入与 Agent 输出写入 jsonl 文件，
 * 并记录会话开始与结束事件，便于回放与排障。
 */
export class SessionRecorder {
  private readonly filePath: string;

  constructor(private readonly sessionId: string, private readonly sessionsDir = "sessions") {
    const absoluteDir = resolve(process.cwd(), this.sessionsDir);
    if (!existsSync(absoluteDir)) {
      mkdirSync(absoluteDir, { recursive: true });
    }

    this.filePath = resolve(absoluteDir, `session-${sessionId}.jsonl`);
  }

  start(): void {
    // 会话开始时写入元事件，标记记录文件可用于本次会话回放。
    this.append({
      type: "session_start",
      sessionId: this.sessionId
    });
  }

  recordUser(turn: number, content: string): void {
    this.append({
      type: "message",
      role: "user",
      turn,
      sessionId: this.sessionId,
      content
    });
  }

  recordAssistant(turn: number, content: string, runId?: string): void {
    this.append({
      type: "message",
      role: "assistant",
      turn,
      runId,
      sessionId: this.sessionId,
      content
    });
  }

  recordError(turn: number, errorMessage: string, runId?: string): void {
    this.append({
      type: "error",
      turn,
      runId,
      sessionId: this.sessionId,
      errorMessage
    });
  }

  end(reason: string): void {
    this.append({
      type: "session_end",
      sessionId: this.sessionId,
      reason
    });
  }

  getSessionFilePath(): string {
    return this.filePath;
  }

  private append(payload: Record<string, unknown>): void {
    const line = JSON.stringify({
      timestamp: new Date().toISOString(),
      ...payload
    });
    appendFileSync(this.filePath, line + "\n", "utf8");
  }
}
