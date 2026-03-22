import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ILogger } from "../../core/ports/logger.js";

/**
 * 文件作用：提供统一日志能力，支持核心调用链路打标、按日落盘，
 * 以及"每次对话一个文档"的调用链路日志输出。
 */
export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

export interface ConversationChainStep {
  stage: string;
  message: string;
  data?: unknown;
}

export class AppLogger implements ILogger {
  private readonly minLevel: number;

  constructor(
    private readonly moduleName: string,
    private readonly runtimeLogDir = "logs/runtime",
    private readonly enableConsoleOutput = false,
    minLevel: LogLevel = "INFO"
  ) {
    this.minLevel = LOG_LEVEL_PRIORITY[minLevel];
  }

  debug(tag: string, message: string, data?: unknown): void {
    this.write("DEBUG", tag, message, data);
  }

  info(tag: string, message: string, data?: unknown): void {
    this.write("INFO", tag, message, data);
  }

  warn(tag: string, message: string, data?: unknown): void {
    this.write("WARN", tag, message, data);
  }

  error(tag: string, message: string, data?: unknown): void {
    this.write("ERROR", tag, message, data);
  }

  private write(level: LogLevel, tag: string, message: string, data?: unknown): void {
    if (LOG_LEVEL_PRIORITY[level] < this.minLevel) {
      return;
    }

    const timestamp = new Date().toISOString();
    const serializedData = data === undefined ? "" : ` ${safeStringify(data)}`;
    const line = `[${timestamp}] [${level}] [${this.moduleName}] [${tag}] ${message}${serializedData}`;

    if (this.enableConsoleOutput) {
      if (level === "ERROR") {
        console.error(line);
      } else if (level === "WARN") {
        console.warn(line);
      } else {
        console.log(line);
      }
    }

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
