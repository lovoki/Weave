import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ToolDefinition } from "../tool-types.js";

/**
 * 文件作用：文件读取工具，支持读取目标文件的指定行区间，避免一次返回超长内容。
 */
export interface ReadFileArgs {
  filePath: string;
  startLine?: number;
  endLine?: number;
}

export const readFileTool: ToolDefinition<ReadFileArgs> = {
  name: "read_file",
  description: "读取文件内容，可指定开始行与结束行（1-based）。",
  inputSchema: {
    type: "object",
    properties: {
      filePath: {
        type: "string",
        description: "目标文件路径，支持相对路径（相对工作区根目录）。"
      },
      startLine: {
        type: "number",
        description: "可选，起始行号（从 1 开始）。"
      },
      endLine: {
        type: "number",
        description: "可选，结束行号（从 1 开始，包含该行）。"
      }
    },
    required: ["filePath"],
    additionalProperties: false
  },
  async execute(context, args) {
    if (!args?.filePath || typeof args.filePath !== "string") {
      return {
        ok: false,
        content: "参数错误：filePath 必须是非空字符串。"
      };
    }

    const absolutePath = resolve(context.workspaceRoot, args.filePath);
    if (!existsSync(absolutePath)) {
      return {
        ok: false,
        content: `文件不存在：${absolutePath}`
      };
    }

    const fileText = readFileSync(absolutePath, "utf8");
    const lines = fileText.split(/\r?\n/);

    const startLine = Math.max(1, Math.floor(args.startLine ?? 1));
    const endLine = Math.min(lines.length, Math.floor(args.endLine ?? lines.length));
    if (endLine < startLine) {
      return {
        ok: false,
        content: `参数错误：endLine(${endLine}) 不能小于 startLine(${startLine})。`
      };
    }

    const content = lines.slice(startLine - 1, endLine).join("\n");
    return {
      ok: true,
      content,
      metadata: {
        absolutePath,
        startLine,
        endLine,
        totalLines: lines.length
      }
    };
  }
};
