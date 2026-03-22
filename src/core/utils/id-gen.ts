/**
 * 文件作用：ID 生成工具，统一全局 ID 生成策略。
 */
import { randomUUID } from "node:crypto";

/**
 * 生成唯一会话 ID。
 * 使用 crypto.randomUUID 替代 Math.random，确保唯一性与安全性。
 */
export function createSessionId(): string {
  const shortId = randomUUID().replace(/-/g, "").slice(0, 12);
  return `session_${Date.now()}_${shortId}`;
}
