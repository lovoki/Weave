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

  // Windows 命令输出在某些环境仍可能落在 GBK，尝试用 gbk 解码兜底。
  try {
    const decoder = new TextDecoder("gbk");
    const gbk = decoder.decode(raw);
    return looksLikeMojibake(gbk) ? utf8 : gbk;
  } catch {
    return utf8;
  }
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
