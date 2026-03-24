/**
 * 文件作用：统一解析 Weave 会话模式与行内 /weave 输入语义，供 TUI 与非 TTY 回退模式复用。
 */
export type WeaveMode = "off" | "observe" | "step" | "auto";

export interface ParsedTurnInput {
  modeCommand?: WeaveMode;
  enableWeave: boolean;
  stepMode: boolean;
  autoMode: boolean;
  question: string;
}

export function parseTurnInput(input: string, currentMode: WeaveMode): ParsedTurnInput {
  const trimmed = input.trim().replace(/[\u200B-\u200D\uFEFF]/g, "");
  if (!trimmed) {
    return {
      enableWeave: currentMode !== "off",
      stepMode: currentMode === "step",
      autoMode: currentMode === "auto",
      question: "",
    };
  }

  const modeMatch = trimmed.match(/^(?:[/／](weave|w)|(?:weave|w))\s+(on|off|step|observe|auto)$/i);
  if (modeMatch) {
    const modeRaw = modeMatch[2].toLowerCase();
    const modeValue: WeaveMode = modeRaw === "on" ? "observe" : (modeRaw as WeaveMode);
    return {
      modeCommand: modeValue,
      enableWeave: modeValue !== "off",
      stepMode: modeValue === "step",
      autoMode: modeValue === "auto",
      question: "",
    };
  }

  const match = trimmed.match(/^(?:[/／](weave|w)|(?:weave|w))\b\s*(.*)$/i);
  if (!match) {
    return {
      enableWeave: currentMode !== "off",
      stepMode: currentMode === "step",
      autoMode: currentMode === "auto",
      question: trimmed,
    };
  }

  const inlineMode: WeaveMode = currentMode === "off" ? "observe" : currentMode;
  return {
    enableWeave: true,
    stepMode: inlineMode === "step",
    autoMode: inlineMode === "auto",
    question: (match[2] ?? "").trim(),
  };
}
