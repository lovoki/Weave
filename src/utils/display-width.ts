/**
 * 文件作用：终端显示宽度计算工具，处理 CJK 宽字符与控制字符。
 * 供 TUI 输入渲染与光标定位复用。
 */

/**
 * 计算单个字符在终端中占用的显示列数。
 * CJK 宽字符占 2 列，控制字符占 0 列，其余占 1 列。
 */
export function charDisplayWidth(char: string): number {
  const code = char.codePointAt(0) ?? 0;
  if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) {
    return 0;
  }

  const isWide =
    (code >= 0x1100 && code <= 0x115f) ||
    (code >= 0x2e80 && code <= 0xa4cf) ||
    (code >= 0xac00 && code <= 0xd7a3) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xfe10 && code <= 0xfe19) ||
    (code >= 0xfe30 && code <= 0xfe6f) ||
    (code >= 0xff00 && code <= 0xff60) ||
    (code >= 0xffe0 && code <= 0xffe6);

  return isWide ? 2 : 1;
}

/**
 * 计算字符串在终端中的总显示列宽。
 */
export function stringDisplayWidth(text: string): number {
  return Array.from(text).reduce((sum, char) => sum + charDisplayWidth(char), 0);
}
