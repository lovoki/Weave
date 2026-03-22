import type {
  IToolRegistry,
  ToolDefinition,
  ToolExecuteResult,
  ToolExecutionContext,
  ModelToolDefinition
} from "../../core/ports/tool-registry.js";

/**
 * 文件作用：提供工具注册、解析、执行能力，并向模型导出可调用工具定义。
 */
export class ToolRegistry implements IToolRegistry {
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

    // 运行时参数基础验证：确保 args 是对象类型
    if (args !== undefined && args !== null && typeof args !== "object") {
      return {
        ok: false,
        content: `参数类型错误：期望对象，收到 ${typeof args}`,
        metadata: { name, argsType: typeof args }
      };
    }

    // 验证 required 字段
    const schema = tool.inputSchema;
    const required = Array.isArray(schema?.required) ? schema.required as string[] : [];
    const argObj = (args ?? {}) as Record<string, unknown>;
    const missingFields = required.filter((field) => !(field in argObj));
    if (missingFields.length > 0) {
      return {
        ok: false,
        content: `缺少必需参数：${missingFields.join(", ")}`,
        metadata: { name, missingFields }
      };
    }

    return tool.execute(context, args);
  }
}
