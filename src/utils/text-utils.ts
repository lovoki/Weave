/**
 * 文件作用：通用文本处理工具函数，供 Agent 运行时与 Weave 插件复用。
 */

/**
 * 将任意值转换为可读摘要文本，超出 maxLength 截断并追加省略号。
 */
export function summarizeText(value: unknown, maxLength = 2000): string {
  if (value === null || value === undefined) {
    return "";
  }

  let text = "";
  if (typeof value === "string") {
    text = value;
  } else {
    try {
      text = JSON.stringify(value);
    } catch {
      text = String(value);
    }
  }

  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)}...`;
}

/**
 * 安全解析 JSON 文本为对象。解析失败或非对象类型返回 null（不掩盖错误）。
 */
export function tryParseJson(text: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(text || "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 安全序列化任意值为 JSON 字符串，失败时返回 "{}"。
 */
export function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return "{}";
  }
}

/**
 * 截断字符串参数摘要，用于 TUI 显示。
 */
export function summarizeArgs(args: string, maxLength = 70): string {
  if (!args) {
    return "";
  }
  return args.length > maxLength ? `${args.slice(0, maxLength)}...` : args;
}
