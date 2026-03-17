import { commandExecTool } from "./command-exec-tool.js";
import { readFileTool } from "./read-file-tool.js";
import { writeFileTool } from "./write-file-tool.js";
import type { ToolDefinition } from "../tool-types.js";

/**
 * 文件作用：导出内置工具集合，便于入口层集中注册。
 */
export const builtinTools: Array<ToolDefinition<unknown>> = [
	commandExecTool as ToolDefinition<unknown>,
	readFileTool as ToolDefinition<unknown>,
	writeFileTool as ToolDefinition<unknown>
];
