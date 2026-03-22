/**
 * 文件作用：工具语义格式化注册器，解耦 WeavePlugin 对具体工具的硬编码依赖。
 * 新增工具时只需注册一个 formatter，无需修改 WeavePlugin。
 */
import { summarizeText } from "../../core/utils/text-utils.js";

export interface ToolIntentSemantic {
  title: string;
  details: string[];
}

export type ToolFormatter = (args: Record<string, unknown>, baseDetails: string[]) => ToolIntentSemantic;

const formatters = new Map<string, ToolFormatter>();

/**
 * 注册工具的语义格式化器。
 */
export function registerToolFormatter(toolName: string, formatter: ToolFormatter): void {
  formatters.set(toolName, formatter);
}

/**
 * 格式化工具意图。优先使用已注册的格式化器，否则使用通用兜底。
 */
export function formatToolIntent(toolName: string, args?: unknown): ToolIntentSemantic {
  const argObj = (args && typeof args === "object" ? (args as Record<string, unknown>) : {}) ?? {};
  const intentSummary = summarizeText(argObj.__intentSummary ?? "");
  const toolGoal = summarizeText(argObj.__toolGoal ?? "");

  const baseDetails: string[] = [];
  if (intentSummary) {
    baseDetails.push(`intent=${intentSummary}`);
  }
  if (toolGoal) {
    baseDetails.push(`goal=${toolGoal}`);
  }

  const formatter = formatters.get(toolName);
  if (formatter) {
    return formatter(argObj, baseDetails);
  }

  baseDetails.push(`args=${summarizeText(args)}`);
  return {
    title: `执行 ${toolName}`,
    details: baseDetails
  };
}

// ─── 内置工具格式化器 ───

registerToolFormatter("command_exec", (argObj, details) => {
  const command = summarizeText(argObj.command ?? "");
  details.push(command ? `command=${command}` : "command=");
  return { title: "执行命令", details };
});

registerToolFormatter("read_file", (argObj, details) => {
  const filePath = summarizeText(argObj.filePath ?? argObj.path ?? "");
  const startLine = summarizeText(argObj.startLine ?? "");
  const endLine = summarizeText(argObj.endLine ?? "");
  const span = startLine || endLine ? ` lines=${startLine || "?"}-${endLine || "?"}` : "";
  details.push(`file=${filePath || "(unknown)"}${span}`);
  return { title: "读取文件", details };
});

registerToolFormatter("write_file", (argObj, details) => {
  const filePath = summarizeText(argObj.filePath ?? argObj.path ?? "");
  details.push(`file=${filePath || "(unknown)"}`);
  return { title: "写入文件", details };
});
