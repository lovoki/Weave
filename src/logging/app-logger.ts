import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * 文件作用：提供统一日志能力，支持核心调用链路打标、按日落盘，
 * 以及“每次对话一个文档”的调用链路日志输出。
 */
export type LogLevel = "INFO" | "ERROR";

export interface ConversationChainStep {
  stage: string;
  message: string;
  data?: unknown;
}

export class AppLogger {
  constructor(
    private readonly moduleName: string,
    private readonly runtimeLogDir = "logs/runtime",
    private readonly enableConsoleOutput = false
  ) {}

  info(tag: string, message: string, data?: unknown): void {
    this.write("INFO", tag, message, data);
  }

  error(tag: string, message: string, data?: unknown): void {
    this.write("ERROR", tag, message, data);
  }

  private write(level: LogLevel, tag: string, message: string, data?: unknown): void {
    const timestamp = new Date().toISOString();
    const serializedData = data === undefined ? "" : ` ${safeStringify(data)}`;
    const line = `[${timestamp}] [${level}] [${this.moduleName}] [${tag}] ${message}${serializedData}`;

    // 日志默认不输出到终端，避免干扰流式响应展示。
    if (this.enableConsoleOutput) {
      if (level === "ERROR") {
        console.error(line);
      } else {
        console.log(line);
      }
    }

    // 文件输出用于离线排查与历史追踪。
    const logFile = resolve(process.cwd(), this.runtimeLogDir, `${timestamp.slice(0, 10)}.log`);
    ensureDir(resolve(process.cwd(), this.runtimeLogDir));
    appendFileSync(logFile, line + "\n", "utf8");
  }
}

export function writeConversationChainLog(
  conversationId: string,
  summary: string,
  steps: ConversationChainStep[]
): string {
  // 每次对话（session）都生成独立日志文档，便于按会话维度排障与回放。
  const outputDir = resolve(process.cwd(), "logs/conversations");
  ensureDir(outputDir);

  const timestamp = new Date().toISOString();
  const logFilePath = resolve(
    outputDir,
    `conversation-${Date.now()}-${sanitizeFileName(conversationId)}.md`
  );

  const lines: string[] = [];
  lines.push("# 对话调用链路日志");
  lines.push("");
  lines.push(`- 记录时间: ${timestamp}`);
  lines.push(`- 会话标识: ${conversationId}`);
  lines.push(`- 会话摘要: ${summary}`);
  lines.push("");
  lines.push("## 调用链路");

  for (const step of steps) {
    const dataText = step.data === undefined ? "" : ` | data=${safeStringify(step.data)}`;
    lines.push(`- [${step.stage}] ${step.message}${dataText}`);
  }

  writeFileSync(logFilePath, lines.join("\n") + "\n", "utf8");
  return logFilePath;
}

function ensureDir(path: string): void {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '"[无法序列化的数据]"';
  }
}
