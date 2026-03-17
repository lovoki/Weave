/*
 * 文件作用：聊天面板，展示每轮对话及状态徽章（图标流），替代原 MiniDagThumbnail。
 */

import { useEffect, useRef } from "react";
import { User, Bot, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import type { DagGraph } from "../store/graph-store";

interface ChatPanelProps {
  dagOrder: string[];
  dags: Record<string, DagGraph>;
  activeDagId: string;
  onSelectDag: (dagId: string) => void;
}

export function ChatPanel({ dagOrder, dags, activeDagId, onSelectDag }: ChatPanelProps) {
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [dagOrder.length]);

  const orderedDags = [...dagOrder].reverse();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* 对话列表 */}
      <div
        ref={threadRef}
        className="custom-scroll"
        style={{ flex: 1, overflowY: "auto", padding: "10px 8px", display: "flex", flexDirection: "column", gap: 6 }}
      >
        {orderedDags.length === 0 && (
          <div style={{ fontSize: 12, color: "#4b5563", textAlign: "center", padding: "32px 12px", lineHeight: 1.5 }}>
            在 CLI 输入问题后，对话将出现在这里...
          </div>
        )}

        {orderedDags.map((dagId) => {
          const dag = dags[dagId];
          if (!dag) return null;

          const isActive = dagId === activeDagId;
          const userText = dag.userInputSummary?.trim() || dagId;
          const hasRunning = dag.nodes.some((n) => n.data.status === "running" || n.data.status === "retrying");
          const hasFail    = dag.nodes.some((n) => n.data.status === "fail");
          const hasSuccess = dag.nodes.some((n) => n.data.status === "success");

          return (
            <div
              key={dagId}
              role="button"
              tabIndex={0}
              onClick={() => onSelectDag(dagId)}
              onKeyDown={(e) => e.key === "Enter" && onSelectDag(dagId)}
              style={{
                position: "relative",
                borderRadius: 10,
                padding: "8px 10px 8px 14px",
                border: "1px solid transparent",
                cursor: "pointer",
                transition: "background 0.15s, border-color 0.15s",
                background: isActive ? "rgba(255,255,255,0.05)" : undefined,
                borderColor: isActive ? "rgba(59,130,246,0.35)" : "transparent",
              }}
              onMouseEnter={(e) => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)";
              }}
              onMouseLeave={(e) => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = "";
              }}
            >
              {/* 选中指示线 */}
              {isActive && (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 8,
                    bottom: 8,
                    width: 2,
                    borderRadius: "0 2px 2px 0",
                    background: "#3b82f6",
                  }}
                />
              )}

              {/* 用户气泡 */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#6b7280", fontWeight: 600 }}>
                  <User size={10} />
                  <span>You</span>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    lineHeight: 1.4,
                    background: "rgba(59,130,246,0.14)",
                    border: "1px solid rgba(59,130,246,0.25)",
                    borderRadius: "10px 10px 3px 10px",
                    padding: "5px 10px",
                    color: "#e2e8f0",
                    maxWidth: "95%",
                    wordBreak: "break-word",
                    textAlign: "right",
                  }}
                >
                  {userText}
                </div>
              </div>

              {/* Agent 状态徽章 */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 5 }}>
                {hasRunning && (
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#60a5fa", animation: "blink 1.4s ease-in-out infinite" }}
                  >
                    <Bot size={12} />
                    <span>思考中...</span>
                  </div>
                )}
                {!hasRunning && hasSuccess && !hasFail && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#34d399" }}>
                    <CheckCircle2 size={12} />
                    <span>完成 · {dag.nodes.length} 节点</span>
                  </div>
                )}
                {!hasRunning && hasFail && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#fbbf24" }}>
                    <AlertTriangle size={12} />
                    <span>拦截挂起</span>
                  </div>
                )}
                {!hasRunning && !hasSuccess && !hasFail && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#6b7280" }}>
                    <Clock size={12} />
                    <span>等待中</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 输入栏（只读占位） */}
      <div
        style={{
          padding: "8px 10px",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          gap: 6,
          alignItems: "flex-end",
          background: "var(--bg-panel)",
        }}
      >
        <textarea
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            color: "#9ca3af",
            fontSize: 12,
            padding: "6px 10px",
            resize: "none",
            fontFamily: "inherit",
            cursor: "not-allowed",
            lineHeight: 1.45,
          }}
          placeholder="后端集成中..."
          disabled
          rows={2}
        />
        <button
          style={{
            background: "rgba(59,130,246,0.2)",
            border: "1px solid rgba(59,130,246,0.25)",
            color: "#6b7280",
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: 12,
            cursor: "not-allowed",
            whiteSpace: "nowrap",
          }}
          disabled
        >
          发送 →
        </button>
      </div>
    </div>
  );
}
