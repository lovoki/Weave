import { useEffect, useState } from "react";
import { MAX_LOG_ITEMS } from "../config/defaults.js";
import type {
  AgentErrorEvent,
  AgentFinishEvent,
  AgentStartEvent,
  AgentThoughtEvent,
  AgentUiEventGateway,
  AgentUiStatus,
  ToolEndEvent,
  ToolStartEvent
} from "./agent-ui-events.js";
import { useWeaveDagState, type WeaveDagNodeItem } from "./use-weave-dag-state.js";

/**
 * 文件作用：维护 TUI 状态树，并监听 Agent 事件驱动界面动态更新。
 */
export interface ToolHistoryItem {
  id: string;
  toolName: string;
  args: string;
  status: "running" | "success" | "fail";
  result: string;
}

export interface ChatLogItem {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
}

export { type WeaveDagNodeItem } from "./use-weave-dag-state.js";

export interface AgentUiState {
  status: AgentUiStatus;
  thoughtText: string;
  toolHistory: ToolHistoryItem[];
  currentTool: ToolHistoryItem | null;
  chatLogs: ChatLogItem[];
  weaveDagNodes: WeaveDagNodeItem[];
  latestError: string;
}


export function useAgentState(gateway: AgentUiEventGateway): AgentUiState {
  const [status, setStatus] = useState<AgentUiStatus>("idle");
  const [thoughtText, setThoughtText] = useState("");
  const [toolHistory, setToolHistory] = useState<ToolHistoryItem[]>([]);
  const [currentTool, setCurrentTool] = useState<ToolHistoryItem | null>(null);
  const [chatLogs, setChatLogs] = useState<ChatLogItem[]>([]);
  const [latestError, setLatestError] = useState("");

  const weaveDagNodes = useWeaveDagState(gateway);

  useEffect(() => {
    const onAgentStart = (event: AgentStartEvent): void => {
      setStatus("thinking");
      setThoughtText("");
      setCurrentTool(null);
      setLatestError("");
      setChatLogs((prev) => {
        const next = [
          ...prev,
          ...(prev.length > 0
            ? [
                {
                  id: `${event.runId}-turn-divider`,
                  role: "system" as const,
                  text: "__turn_divider__"
                }
              ]
            : []),
          {
            id: `${event.runId}-user`,
            role: "user" as const,
            text: event.userInput
          }
        ];
        return next.slice(-MAX_LOG_ITEMS);
      });
    };

    const onAgentThought = (_event: AgentThoughtEvent): void => {
      setStatus((prev) => (prev === "using_tool" ? prev : "thinking"));
    };

    const onToolStart = (event: ToolStartEvent): void => {
      const running: ToolHistoryItem = {
        id: `${event.runId}-${event.toolName}-${Date.now()}`,
        toolName: event.toolName,
        args: event.args,
        status: "running",
        result: ""
      };

      setStatus("using_tool");
      setCurrentTool(running);
      setToolHistory((prev) => [...prev, running]);
      setChatLogs((prev) => {
        const next = [
          ...prev,
          {
            id: `${running.id}-tool-start`,
            role: "system" as const,
            text: `tool:${event.toolName} start${event.args ? ` args=${event.args}` : ""}`
          }
        ];
        return next.slice(-MAX_LOG_ITEMS);
      });
    };

    const onToolEnd = (event: ToolEndEvent): void => {
      setStatus("thinking");
      setCurrentTool(null);
      setToolHistory((prev) => {
        const index = [...prev].reverse().findIndex((item) => item.toolName === event.toolName && item.status === "running");
        if (index < 0) {
          return prev;
        }

        const targetIndex = prev.length - 1 - index;
        const updated = [...prev];
        updated[targetIndex] = {
          ...updated[targetIndex],
          status: event.status,
          result: event.result
        };
        return updated;
      });

      setChatLogs((prev) => {
        const next = [
          ...prev,
          {
            id: `${event.runId}-${event.toolName}-tool-end-${Date.now()}`,
            role: "system" as const,
            text: `tool:${event.toolName} ${event.status === "success" ? "ok" : "fail"}${event.result ? ` result=${event.result}` : ""}`
          }
        ];
        return next.slice(-MAX_LOG_ITEMS);
      });
    };

    const onAgentFinish = (event: AgentFinishEvent): void => {
      setStatus("done");
      setThoughtText("");
      setCurrentTool(null);
      setChatLogs((prev) => {
        const next = [
          ...prev,
          {
            id: `${event.runId}-assistant`,
            role: "assistant" as const,
            text: event.finalText
          }
        ];
        return next.slice(-MAX_LOG_ITEMS);
      });
    };

    const onAgentError = (event: AgentErrorEvent): void => {
      setStatus("error");
      setCurrentTool(null);
      setLatestError(event.errorMessage);
      setChatLogs((prev) => {
        const next = [
          ...prev,
          {
            id: `${event.runId}-error`,
            role: "system" as const,
            text: `error=${event.errorMessage}`
          }
        ];
        return next.slice(-MAX_LOG_ITEMS);
      });
    };

    gateway.on("agent:start", onAgentStart);
    gateway.on("agent:thought", onAgentThought);
    gateway.on("tool:start", onToolStart);
    gateway.on("tool:end", onToolEnd);
    gateway.on("agent:finish", onAgentFinish);
    gateway.on("agent:error", onAgentError);

    return () => {
      gateway.off("agent:start", onAgentStart);
      gateway.off("agent:thought", onAgentThought);
      gateway.off("tool:start", onToolStart);
      gateway.off("tool:end", onToolEnd);
      gateway.off("agent:finish", onAgentFinish);
      gateway.off("agent:error", onAgentError);
    };
  }, [gateway]);

  return {
    status,
    thoughtText,
    toolHistory,
    currentTool,
    chatLogs,
    weaveDagNodes,
    latestError
  };
}
