/**
 * 文件作用：统一解析 Weave 会话模式与行内 /weave 输入语义，供 TUI 与非 TTY 回退模式复用。
 */
export type WeaveMode = "off" | "on" | "step";

export interface ParsedTurnInput {
  modeCommand?: WeaveMode;
  enableWeave: boolean;
  stepMode: boolean;
  question: string;
}

export function parseTurnInput(input: string, currentMode: WeaveMode): ParsedTurnInput {
  const trimmed = input.trim().replace(/[\u200B-\u200D\uFEFF]/g, "");
  if (!trimmed) {
    return {
      enableWeave: currentMode !== "off",
      stepMode: currentMode === "step",
      question: ""
    };
  }

  const modeMatch = trimmed.match(/^(?:[\/／](weave|w)|(?:weave|w))\s+(on|off|step)$/i);
  if (modeMatch) {
    const modeValue = modeMatch[2].toLowerCase() as WeaveMode;
    return {
      modeCommand: modeValue,
      enableWeave: modeValue !== "off",
      stepMode: modeValue === "step",
      question: ""
    };
  }

  const match = trimmed.match(/^(?:[\/／](weave|w)|(?:weave|w))\b\s*(.*)$/i);
  if (!match) {
    return {
      enableWeave: currentMode !== "off",
      stepMode: currentMode === "step",
      question: trimmed
    };
  }

  const inlineMode = currentMode === "off" ? "on" : currentMode;
  return {
    enableWeave: true,
    stepMode: inlineMode === "step",
    question: (match[2] ?? "").trim()
  };
}
