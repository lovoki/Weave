import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import type { ToolDefinition } from "../tool-types.js";

/**
 * 文件作用：文件写入工具，支持覆盖写入或追加写入，并限制在工作区目录内执行。
 */
export interface WriteFileArgs {
  filePath: string;
  content: string;
  mode?: "overwrite" | "append";
  createDirs?: boolean;
}

export const writeFileTool: ToolDefinition<WriteFileArgs> = {
  name: "write_file",
  description: "写入文件内容，支持覆盖(overwrite)或追加(append)。",
  inputSchema: {
    type: "object",
    properties: {
      filePath: {
        type: "string",
        description: "目标文件路径，支持相对路径（相对工作区根目录）。"
      },
      content: {
        type: "string",
        description: "要写入的文本内容。"
      },
      mode: {
        type: "string",
        enum: ["overwrite", "append"],
        description: "写入模式，overwrite=覆盖，append=追加，默认 overwrite。"
      },
      createDirs: {
        type: "boolean",
        description: "是否自动创建不存在的目录，默认 true。"
      }
    },
    required: ["filePath", "content"],
    additionalProperties: false
  },
  async execute(context, args) {
    if (!args?.filePath || typeof args.filePath !== "string") {
      return {
        ok: false,
        content: "参数错误：filePath 必须是非空字符串。"
      };
    }

    if (typeof args.content !== "string") {
      return {
        ok: false,
        content: "参数错误：content 必须是字符串。"
      };
    }

    const mode = args.mode ?? "overwrite";
    const createDirs = args.createDirs ?? true;
    const workspaceRoot = resolve(context.workspaceRoot);
    const absolutePath = resolve(workspaceRoot, args.filePath);

    if (!isPathInsideWorkspace(workspaceRoot, absolutePath)) {
      return {
        ok: false,
        content: `安全限制：只允许写入工作区目录内文件。目标路径=${absolutePath}`
      };
    }

    const parentDir = dirname(absolutePath);
    if (!existsSync(parentDir)) {
      if (!createDirs) {
        return {
          ok: false,
          content: `目录不存在：${parentDir}`
        };
      }

      // 默认自动创建父目录，减少工具调用方对目录前置处理的耦合。
      mkdirSync(parentDir, { recursive: true });
    }

    if (mode === "append") {
      appendFileSync(absolutePath, args.content, "utf8");
    } else {
      writeFileSync(absolutePath, args.content, "utf8");
    }

    return {
      ok: true,
      content: `文件写入成功：${absolutePath}`,
      metadata: {
        absolutePath,
        mode,
        bytesWritten: Buffer.byteLength(args.content, "utf8")
      }
    };
  }
};

function isPathInsideWorkspace(workspaceRoot: string, targetPath: string): boolean {
  const normalizedRoot = workspaceRoot.endsWith(sep) ? workspaceRoot : `${workspaceRoot}${sep}`;
  const normalizedTarget = targetPath;

  if (process.platform === "win32") {
    return normalizedTarget.toLowerCase().startsWith(normalizedRoot.toLowerCase());
  }

  return normalizedTarget.startsWith(normalizedRoot);
}
