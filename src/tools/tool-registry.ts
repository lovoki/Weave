import type { ToolDefinition, ToolExecuteResult, ToolExecutionContext, ModelToolDefinition } from "./tool-types.js";

/**
 * 文件作用：提供工具注册、解析、执行能力，并向模型导出可调用工具定义。
 */
export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition<unknown>>();

  register<TArgs>(tool: ToolDefinition<TArgs>): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`工具已存在：${tool.name}`);
    }
    this.tools.set(tool.name, tool as ToolDefinition<unknown>);
  }

  resolve(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  listModelTools(): ModelToolDefinition[] {
    // 将内部工具定义转换为模型可识别的 function tool 结构。
    return Array.from(this.tools.values()).map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema
      }
    }));
  }

  async execute(name: string, args: unknown, context: ToolExecutionContext): Promise<ToolExecuteResult> {
    const tool = this.resolve(name);
    if (!tool) {
      return {
        ok: false,
        content: `工具不存在：${name}`,
        metadata: { name }
      };
    }

    return tool.execute(context, args);
  }
}
