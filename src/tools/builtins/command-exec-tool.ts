import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { ToolDefinition } from "../tool-types.js";

const execAsync = promisify(exec);

/**
 * 文件作用：命令行执行工具，允许 Agent 在受控上下文中执行 shell 命令并返回输出。
 */
export interface CommandExecArgs {
  command: string;
  cwd?: string;
  timeoutMs?: number;
}

export const commandExecTool: ToolDefinition<CommandExecArgs> = {
  name: "command_exec",
  description: "执行一条命令行并返回标准输出和标准错误。",
  inputSchema: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "要执行的命令，例如 `node -v` 或 `dir`。"
      },
      cwd: {
        type: "string",
        description: "可选，命令执行目录。默认是工作区根目录。"
      },
      timeoutMs: {
        type: "number",
        description: "可选，超时时间（毫秒），默认 15000。"
      }
    },
    required: ["command"],
    additionalProperties: false
  },
  async execute(context, args) {
    if (!args?.command || typeof args.command !== "string") {
      return {
        ok: false,
        content: "参数错误：command 必须是非空字符串。"
      };
    }

    const blocked = checkCommandSafety(args.command);
    if (blocked) {
      return {
        ok: false,
        content: `安全拦截：${blocked}`
      };
    }

    const timeoutMs = typeof args.timeoutMs === "number" ? args.timeoutMs : 15000;
    const cwd = args.cwd ?? context.workspaceRoot;
    const isWindows = process.platform === "win32";
    const commandToRun = isWindows ? `chcp 65001>nul & ${args.command}` : args.command;

    try {
      // 使用 shell 模式兼容 Windows 命令；同时限制超时与缓冲区避免阻塞。
      const result = await execAsync(commandToRun, {
        cwd,
        timeout: timeoutMs,
        maxBuffer: 1024 * 1024,
        windowsHide: true,
        shell: process.env.ComSpec ?? "cmd.exe",
        encoding: "buffer"
      });

      const stdoutText = decodeCommandOutput(result.stdout, isWindows).trim();
      const stderrText = decodeCommandOutput(result.stderr, isWindows).trim();
      const combined = [stdoutText, stderrText].filter(Boolean).join("\n");

      return {
        ok: true,
        content: combined || "命令执行成功，无输出。",
        metadata: {
          command: args.command,
          commandExecuted: commandToRun,
          cwd,
          timeoutMs
        }
      };
    } catch (error: unknown) {
      const errorObj = error as { stdout?: Buffer | string; stderr?: Buffer | string; message?: string; code?: number };
      const stdoutText = decodeCommandOutput(errorObj.stdout, isWindows).trim();
      const stderrText = decodeCommandOutput(errorObj.stderr, isWindows).trim();

      return {
        ok: false,
        content: [
          `命令执行失败：${errorObj.message ?? "未知错误"}`,
          stdoutText ? `stdout:\n${stdoutText}` : "",
          stderrText ? `stderr:\n${stderrText}` : ""
        ]
          .filter(Boolean)
          .join("\n\n"),
        metadata: {
          command: args.command,
          commandExecuted: commandToRun,
          cwd,
          timeoutMs,
          exitCode: errorObj.code
        }
      };
    }
  }
};

function decodeCommandOutput(raw: Buffer | string | undefined, isWindows: boolean): string {
  if (!raw) {
    return "";
  }

  if (typeof raw === "string") {
    return raw;
  }

  const utf8 = raw.toString("utf8");
  if (!isWindows) {
    return utf8;
  }

  if (!looksLikeMojibake(utf8)) {
    return utf8;
  }

  // Windows 命令输出在某些环境仍可能落在 GB 系编码，按 gb18030/gbk 依次兜底。
  const fallbacks = ["gb18030", "gbk", "utf-8"] as const;
  for (const encoding of fallbacks) {
    try {
      const decoder = new TextDecoder(encoding);
      const decoded = decoder.decode(raw);
      if (!looksLikeMojibake(decoded)) {
        return decoded;
      }
    } catch {
      // 忽略当前编码失败，继续尝试下一个编码。
    }
  }

  return utf8;
}

/**
 * 检查命令是否安全，返回拦截原因或 null（安全）。
 */
function checkCommandSafety(command: string): string | null {
  const trimmed = command.trim().toLowerCase();

  // 拦截破坏性命令
  const destructivePatterns = [
    { pattern: /\brm\s+(-rf?|--recursive)\s+[/\\]/, reason: "禁止递归删除根目录" },
    { pattern: /\bformat\s+[a-z]:/i, reason: "禁止格式化磁盘" },
    { pattern: /\bmkfs\b/, reason: "禁止创建文件系统" },
    { pattern: /\bdd\s+.*of=\/dev\//, reason: "禁止直接写入设备" },
    { pattern: />\s*\/dev\/sd[a-z]/, reason: "禁止直接写入磁盘设备" },
    { pattern: /\b:()\s*\{\s*:\|:&\s*\};:/, reason: "禁止 fork bomb" },
  ];

  for (const { pattern, reason } of destructivePatterns) {
    if (pattern.test(trimmed)) {
      return reason;
    }
  }

  // 拦截超长命令（可能包含注入尝试）
  if (command.length > 4096) {
    return "命令长度超过 4096 字符限制";
  }

  return null;
}

function looksLikeMojibake(text: string): boolean {
  if (!text) {
    return false;
  }

  const replacementCount = (text.match(/�/g) ?? []).length;
  if (replacementCount >= 2) {
    return true;
  }

  return /����/.test(text);
}
