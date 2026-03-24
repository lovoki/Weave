/**
 * 文件作用：TUI 纯函数工具集，从 App.tsx 提取。
 * 包含输入显示、文本裁剪、通用计算等无副作用函数。
 */
import { charDisplayWidth, stringDisplayWidth } from "../../core/utils/display-width.js";

// ─── 通用工具 ───

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function summarizeLine(text: string, maxLength = 72): string {
  const singleLine = text.replace(/\s+/g, " ").trim();
  if (!singleLine) {
    return "";
  }

  return singleLine.length > maxLength ? `${singleLine.slice(0, maxLength)}...` : singleLine;
}

export function estimateDisplayWidth(text: string): number {
  return stringDisplayWidth(text);
}

export function areSetsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) {
    return false;
  }

  for (const value of a) {
    if (!b.has(value)) {
      return false;
    }
  }

  return true;
}

// ─── 键盘输入检测 ───

export function isBackspaceKey(
  value: string,
  key: { backspace?: boolean; delete?: boolean; ctrl?: boolean }
): boolean {
  if (key.backspace) {
    return true;
  }

  if (value === "\b" || value === "\x7f") {
    return true;
  }

  if (key.delete && value === "") {
    return true;
  }

  if (key.ctrl && value.toLowerCase() === "h") {
    return true;
  }

  return false;
}

export function isPrintableInput(value: string): boolean {
  if (!value) {
    return false;
  }

  // eslint-disable-next-line no-control-regex
  return !/[\x00-\x1F\x7F]/.test(value);
}

// ─── 输入显示 ───

function ensureVisibleCursor(value: string): string {
  return `${value}█`;
}

export function renderInputWithCursor(value: string, cursor: number, maxLength: number): string {
  const safeCursor = clamp(cursor, 0, value.length);
  const chars = Array.from(value);
  const withCursorChars = [...chars.slice(0, safeCursor), "█", ...chars.slice(safeCursor)];
  const totalWidth = withCursorChars.reduce((sum, char) => sum + charDisplayWidth(char), 0);

  if (totalWidth <= maxLength) {
    return withCursorChars.join("");
  }

  const cursorIndex = safeCursor;
  const prefixWidth = new Array<number>(withCursorChars.length + 1).fill(0);
  for (let i = 0; i < withCursorChars.length; i += 1) {
    prefixWidth[i + 1] = prefixWidth[i] + charDisplayWidth(withCursorChars[i]);
  }

  const rangeWidth = (start: number, endExclusive: number): number =>
    prefixWidth[endExclusive] - prefixWidth[start];
  const buildDisplay = (left: number, rightExclusive: number): string => {
    const hasLeft = left > 0;
    const hasRight = rightExclusive < withCursorChars.length;
    const body = withCursorChars.slice(left, rightExclusive).join("");
    return `${hasLeft ? "…" : ""}${body}${hasRight ? "…" : ""}`;
  };

  let left = cursorIndex;
  let rightExclusive = cursorIndex + 1;

  const canUseRange = (nextLeft: number, nextRightExclusive: number): boolean => {
    const hasLeft = nextLeft > 0;
    const hasRight = nextRightExclusive < withCursorChars.length;
    const ellipsisCost = (hasLeft ? 1 : 0) + (hasRight ? 1 : 0);
    return rangeWidth(nextLeft, nextRightExclusive) + ellipsisCost <= maxLength;
  };

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let changed = false;

    if (rightExclusive < withCursorChars.length && canUseRange(left, rightExclusive + 1)) {
      rightExclusive += 1;
      changed = true;
    }

    if (left > 0 && canUseRange(left - 1, rightExclusive)) {
      left -= 1;
      changed = true;
    }

    if (!changed) {
      break;
    }
  }

  return buildDisplay(left, rightExclusive);
}

export function fitInputPreview(text: string, maxLength: number): string {
  if (!text) {
    return text;
  }

  const chars = Array.from(text);
  let width = 0;
  const kept: string[] = [];

  for (let i = chars.length - 1; i >= 0; i -= 1) {
    const char = chars[i];
    const next = charDisplayWidth(char);
    if (width + next > Math.max(1, maxLength - 1)) {
      break;
    }

    kept.push(char);
    width += next;
  }

  if (kept.length === chars.length) {
    return text;
  }

  return `…${kept.reverse().join("")}`;
}

export function buildInputDisplayText(
  input: string,
  cursor: number,
  maxLength: number,
  idlePlaceholder: string
): string {
  if (input) {
    return renderInputWithCursor(input, cursor, maxLength);
  }

  return ensureVisibleCursor(fitInputPreview(idlePlaceholder, maxLength));
}
