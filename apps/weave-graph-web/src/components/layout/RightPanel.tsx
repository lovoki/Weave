import React, { useState } from "react";
import { Resizer } from "./Resizer";

function createModeButtonStyle(currentMode: "on" | "step", targetMode: "on" | "step") {
  const active = currentMode === targetMode;
  return {
    flex: 1,
    padding: "6px 0",
    fontSize: 11,
    borderRadius: 6,
    cursor: "pointer",
    background: active ? "var(--bg-surface)" : "transparent",
    color: active ? "var(--text-primary)" : "var(--text-muted)",
    border: active ? "1px solid var(--border-muted)" : "1px solid transparent",
    boxShadow: active ? "0 2px 4px rgba(0,0,0,0.2)" : "none",
    transition: "all var(--duration-fast)",
    fontWeight: active ? 600 : 400,
  } as const;
}

interface RightPanelProps {
  isCollapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  children?: React.ReactNode;
  weaveMode: "on" | "step";
  setWeaveMode: (mode: "on" | "step") => void;
  activeRunId: string;
  onPause: (runId: string) => void;
  onResume: (runId: string) => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  isCollapsed,
  setCollapsed,
  children,
  weaveMode,
  setWeaveMode,
  activeRunId,
  onPause,
  onResume,
}) => {
  const [controlsExpanded, setControlsExpanded] = useState(true);
  const [inspectorExpanded, setInspectorExpanded] = useState(true);
  const [orchestrateExpanded, setOrchestrateExpanded] = useState(false);

  return (
    <div
      className="panel-slide-in-right"
      style={{
        position: "relative",
        gridRow: 2,
        overflow: "hidden",
        borderLeft: "1px solid rgba(255,255,255,0.05)",
        background: "rgba(15, 15, 20, 0.4)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        width: isCollapsed ? "36px" : "var(--panel-right-width, 26%)",
        transition: "var(--transition-layout)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <button
        onClick={() => setCollapsed(!isCollapsed)}
        style={{
          position: "absolute",
          top: "50%",
          left: -10,
          transform: "translateY(-50%)",
          width: 20,
          height: 48,
          background: "var(--bg-raised)",
          border: "1px solid var(--border-muted)",
          borderRadius: 10,
          color: "var(--text-muted)",
          fontSize: 11,
          cursor: "pointer",
          zIndex: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          backdropFilter: "blur(8px)",
          transition: "background var(--duration-fast), color var(--duration-fast)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--bg-overlay)";
          e.currentTarget.style.color = "var(--text-secondary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--bg-raised)";
          e.currentTarget.style.color = "var(--text-muted)";
        }}
      >
        {isCollapsed ? "‹" : "›"}
      </button>

      {!isCollapsed && (
        <>
          <Resizer side="right" defaultWidth={320} isCollapsed={isCollapsed} />
          <aside
            className="inspector-panel"
            style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}
          >
            {/* 执行控制区块 */}
            <div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
              <div
                className="panel-title"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                  userSelect: "none",
                }}
                onClick={() => setControlsExpanded(!controlsExpanded)}
              >
                <span>⚙️ 执行控制 (Controls)</span>
                <span style={{ fontSize: 10 }}>{controlsExpanded ? "▼" : "◀"}</span>
              </div>

              <div
                style={{
                  overflow: "hidden",
                  transition: "max-height 0.3s ease",
                  maxHeight: controlsExpanded ? "200px" : "0",
                  padding: controlsExpanded ? "12px 16px 0" : "0 16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginBottom: 12,
                    background: "var(--bg-raised)",
                    padding: 4,
                    borderRadius: 8,
                    border: "1px solid var(--border-muted)",
                  }}
                >
                  <button
                    onClick={() => setWeaveMode("on")}
                    style={createModeButtonStyle(weaveMode, "on")}
                  >
                    👁️ Observe (On)
                  </button>
                  <button
                    onClick={() => setWeaveMode("step")}
                    style={createModeButtonStyle(weaveMode, "step")}
                  >
                    🛡️ Intercept (Step)
                  </button>
                </div>

                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  <button
                    className="orchestrate-btn"
                    style={{ flex: 1, justifyContent: "center" }}
                    onClick={() => onPause(activeRunId)}
                    disabled={!activeRunId}
                  >
                    ⏸ 暂停
                  </button>
                  <button
                    className="orchestrate-btn"
                    style={{ flex: 1, justifyContent: "center" }}
                    onClick={() => onResume(activeRunId)}
                    disabled={!activeRunId}
                  >
                    ▶️ 恢复
                  </button>
                </div>
              </div>
            </div>

            {/* 节点检查区块 */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flex: inspectorExpanded ? 1 : "0 0 auto",
                minHeight: 0,
              }}
            >
              <div
                className="panel-title"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 0,
                  borderTop: "1px solid var(--border-muted)",
                  paddingTop: 10,
                  cursor: "pointer",
                  userSelect: "none",
                }}
                onClick={() => setInspectorExpanded(!inspectorExpanded)}
              >
                <span>🔍 节点检查 (Inspector)</span>
                <span style={{ fontSize: 10 }}>{inspectorExpanded ? "▼" : "◀"}</span>
              </div>

              <div
                className="inspector-content"
                style={{
                  flex: 1,
                  overflowY: "auto",
                  display: inspectorExpanded ? "block" : "none",
                }}
              >
                {children}
              </div>
            </div>

            {/* 编排区块 */}
            <div
              className="orchestrate-section"
              style={{
                marginTop: "auto",
                borderTop: "1px solid var(--border-muted)",
                padding: "0",
              }}
            >
              <div
                className="orchestrate-title"
                style={{
                  padding: "10px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                  userSelect: "none",
                  marginBottom: 0,
                }}
                onClick={() => setOrchestrateExpanded(!orchestrateExpanded)}
              >
                <span>🔒 编排</span>
                <span style={{ fontSize: 10 }}>{orchestrateExpanded ? "▼" : "▲"}</span>
              </div>

              <div
                style={{
                  display: orchestrateExpanded ? "flex" : "none",
                  flexDirection: "column",
                  gap: 7,
                  padding: "0 14px 12px",
                }}
              >
                <button className="orchestrate-btn" disabled>
                  ➕ 添加节点
                </button>
                <button className="orchestrate-btn" disabled>
                  ✏️ 编辑结构
                </button>
                <button className="orchestrate-btn" disabled>
                  🔁 从此节点重跑
                </button>
                <p className="orchestrate-hint">🔒 即将推出</p>
              </div>
            </div>
          </aside>
        </>
      )}

      {isCollapsed && (
        <span
          style={{
            writingMode: "vertical-rl",
            fontSize: 8,
            letterSpacing: "0.14em",
            color: "var(--text-muted)",
            marginTop: 48,
            fontWeight: 700,
            display: "block",
            textAlign: "center",
            width: "100%",
          }}
        >
          INFO
        </span>
      )}
    </div>
  );
};
