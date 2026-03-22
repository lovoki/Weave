import { parseTurnInput, type WeaveMode } from "../../presentation/tui/weave-mode.js";

/**
 * 文件作用：统一处理用户输入分发，将控制命令与问答消息解耦。
 */
export type DispatchedInput =
  | {
      kind: "quit";
      command: "/q" | "/quit" | "/exit";
      nextMode: WeaveMode;
    }
  | {
      kind: "mode-change";
      mode: WeaveMode;
      nextMode: WeaveMode;
    }
  | {
      kind: "empty";
      nextMode: WeaveMode;
    }
  | {
      kind: "question";
      question: string;
      nextMode: WeaveMode;
      enableWeave: boolean;
      stepMode: boolean;
      autoMode: boolean;
    };

/**
 * 先做输入分发，再决定是否进入 Agent 执行。
 */
export function dispatchUserInput(rawInput: string, currentMode: WeaveMode): DispatchedInput {
  const normalized = rawInput.trim().toLowerCase();
  if (normalized === "/q" || normalized === "/quit" || normalized === "/exit") {
    return {
      kind: "quit",
      command: normalized,
      nextMode: currentMode
    };
  }

  const parsed = parseTurnInput(rawInput, currentMode);

  if (parsed.modeCommand) {
    return {
      kind: "mode-change",
      mode: parsed.modeCommand,
      nextMode: parsed.modeCommand
    };
  }

  if (!parsed.question) {
    return {
      kind: "empty",
      nextMode: currentMode
    };
  }

  return {
    kind: "question",
    question: parsed.question,
    enableWeave: parsed.enableWeave,
    stepMode: parsed.stepMode,
    autoMode: parsed.autoMode,
    nextMode: currentMode
  };
}
