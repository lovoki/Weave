/**
 * 文件作用：安全序列化工具 — 三合一：深拷贝 + 循环引用防爆 + 不可序列化类型过滤。
 * 替代原生 structuredClone（会因 Function/Proxy 抛 DOMException）。
 */

/**
 * 深拷贝 + 剔除不可序列化类型 + 解决循环引用。
 * - Function / Symbol / undefined → "[Function]" / "[Symbol]" / 省略
 * - 循环引用 → "[Circular]"
 * - Error → { name, message, stack }
 * - Date → ISO 字符串
 * - RegExp → toString()
 * - BigInt → "<n>n"
 */
export function safeClone<T>(value: T): T {
  const seen = new WeakSet<object>();

  function clone(val: unknown): unknown {
    if (val === null || val === undefined) return val;

    if (typeof val === "function") return "[Function]";
    if (typeof val === "symbol") return "[Symbol]";
    if (typeof val === "bigint") return `${String(val)}n`;

    // 基础类型直接返回
    if (typeof val !== "object") return val;

    // Error 对象
    if (val instanceof Error) {
      return { name: val.name, message: val.message, stack: val.stack };
    }

    // Date 对象
    if (val instanceof Date) {
      return val.toISOString();
    }

    // RegExp 对象
    if (val instanceof RegExp) {
      return val.toString();
    }

    // 循环引用检测
    if (seen.has(val)) {
      return "[Circular]";
    }
    seen.add(val);

    // 数组
    if (Array.isArray(val)) {
      const result = val.map((item) => clone(item));
      seen.delete(val);
      return result;
    }

    // 普通对象
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(val as Record<string, unknown>)) {
      const cloned = clone((val as Record<string, unknown>)[key]);
      // 仅包含非 undefined 的值（模仿 JSON.stringify 行为）
      if (cloned !== undefined) {
        result[key] = cloned;
      }
    }
    seen.delete(val);
    return result;
  }

  return clone(value) as T;
}
