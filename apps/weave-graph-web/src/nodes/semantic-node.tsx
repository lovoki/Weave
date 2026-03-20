import React, { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import type { GraphNodeData } from "../types/graph-events";
import { LlmIcon } from "../icons/LlmIcon";
import { ToolIcon } from "../icons/ToolIcon";
import { AttemptIcon } from "../icons/AttemptIcon";
import { EscalationIcon } from "../icons/EscalationIcon";
import { GateIcon } from "../icons/GateIcon";
import { FinalIcon } from "../icons/FinalIcon";
import { InputIcon } from "../icons/InputIcon";
import { SystemIcon } from "../icons/SystemIcon";
import { RepairIcon } from "../icons/RepairIcon";
import { ConditionIcon } from "../icons/ConditionIcon";
import styles from "./SemanticNode.module.css";

interface KindConfig {
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
  label: string;
}

const KIND_MAP: Record<string, KindConfig> = {
  llm:        { Icon: LlmIcon,        color: "#b48aff", label: "llm" },
  tool:       { Icon: ToolIcon,       color: "#5aadff", label: "tool" },
  attempt:    { Icon: AttemptIcon,    color: "#5aadff", label: "attempt" },
  escalation: { Icon: EscalationIcon, color: "#ff6057", label: "escalation" },
  condition:  { Icon: ConditionIcon,  color: "#7ec8ff", label: "condition" },
  gate:       { Icon: GateIcon,       color: "#ffab5e", label: "gate" },
  repair:     { Icon: RepairIcon,     color: "#ff6057", label: "repair" },
  final:      { Icon: FinalIcon,      color: "#3dc653", label: "final" },
  system:     { Icon: SystemIcon,     color: "#6e7a90", label: "system" },
  input:      { Icon: InputIcon,      color: "#38d8f8", label: "input" },
};

const DEFAULT_KIND: KindConfig = { Icon: ToolIcon, color: "#5aadff", label: "node" };

interface StatusStyle {
  barColor: string;
  glowColor: string;
  glow: boolean;
  badgeText: string;
  badgeBg: string;
  badgeColor: string;
  badgePulse: boolean;
}

function getStatusStyle(status?: string, kindColor?: string): StatusStyle {
  switch (status) {
    case "running":
      return {
        barColor: "#f5a623", glowColor: "#f5a623", glow: true,
        badgeText: "RUNNING", badgeBg: "rgba(245,166,35,0.18)", badgeColor: "#f5a623", badgePulse: true,
      };
    case "retrying":
      return {
        barColor: "#e8872a", glowColor: "#e8872a", glow: true,
        badgeText: "RETRY", badgeBg: "rgba(232,135,42,0.18)", badgeColor: "#e8872a", badgePulse: true,
      };
    case "success":
      return {
        barColor: "#3dc653", glowColor: "#3dc653", glow: false,
        badgeText: "DONE", badgeBg: "rgba(61,198,83,0.15)", badgeColor: "#3dc653", badgePulse: false,
      };
    case "fail":
      return {
        barColor: "#ff6057", glowColor: "#ff6057", glow: false,
        badgeText: "FAIL", badgeBg: "rgba(255,96,87,0.18)", badgeColor: "#ff6057", badgePulse: false,
      };
    case "skipped":
      return {
        barColor: "#6e7a90", glowColor: "#6e7a90", glow: false,
        badgeText: "SKIP", badgeBg: "rgba(110,122,144,0.15)", badgeColor: "#6e7a90", badgePulse: false,
      };
    default:
      return {
        barColor: kindColor ?? "#4a5468", glowColor: kindColor ?? "#4a5468", glow: false,
        badgeText: "WAIT", badgeBg: "rgba(48,54,61,0.4)", badgeColor: "#5a6b82", badgePulse: false,
      };
  }
}

function parseFooter(data: GraphNodeData): { ms?: string; tokens?: string } {
  if (data.metrics?.durationMs !== undefined) {
    const ms = `${data.metrics.durationMs}ms`;
    const tokens =
      data.metrics.promptTokens !== undefined
        ? `${data.metrics.promptTokens}+${data.metrics.completionTokens ?? 0}`
        : undefined;
    return { ms, tokens };
  }
  const subtitle = data.subtitle ?? "";
  if (!subtitle) return {};
  const parts = subtitle.split(/[·•|]/);
  const ms = parts.find((p) => p.includes("ms"))?.trim();
  const tokens = parts.find((p) => p.includes("token"))?.trim();
  return { ms, tokens };
}

const areEqual = (prev: NodeProps<GraphNodeData>, next: NodeProps<GraphNodeData>) => {
  return (
    prev.id === next.id &&
    prev.selected === next.selected &&
    prev.dragging === next.dragging && // 显式包含 dragging 状态
    prev.data.status === next.data.status &&
    prev.data.title === next.data.title &&
    prev.data.pendingApproval === next.data.pendingApproval &&
    prev.data.subtitle === next.data.subtitle &&
    prev.data.error === next.data.error &&
    prev.data.outputPorts === next.data.outputPorts &&
    prev.data.inputPorts === next.data.inputPorts
  );
};

export const SemanticNode = memo(function SemanticNode({ data }: NodeProps<GraphNodeData>) {
  const kind = data.kind ?? "tool";
  const status = data.status ?? "pending";
  const { Icon, color, label } = KIND_MAP[kind] ?? DEFAULT_KIND;
  const statusStyle = getStatusStyle(status, color);
  const isPendingApproval = data.pendingApproval === true;
  const footer = parseFooter(data);
  const hasFooter = Boolean(footer.ms || footer.tokens);

  const vertBarOpacity =
    status === "success" ? 0.7 :
    status === "fail" ? 0.75 :
    status === "skipped" ? 0.35 :
    status === "pending" ? 0.4 :
    undefined;

  const vertBarStyle: React.CSSProperties = {
    background: statusStyle.barColor,
    ...(vertBarOpacity !== undefined ? { opacity: vertBarOpacity } : {}),
    ...(statusStyle.glow ? {
      boxShadow: `0 0 10px 3px ${statusStyle.glowColor}55`,
      animation: "status-glow 1.6s ease-in-out infinite",
    } : {}),
  };

  const cardClassName = [
    styles.nodeCard,
    styles.nodeEnter,
    status === "running" || status === "retrying" ? styles.nodeRunning : ""
  ].join(" ");

  return (
    <div
      className={`node-status-${status} ${isPendingApproval ? "node-pending-approval" : ""}`}
      style={{ width: 248 }}
    >
      <Handle type="target" position={Position.Top} className="node-handle" />

      <div className={cardClassName} data-status={status}>
        <div className={styles.vertBar} style={vertBarStyle} />

        <div className={styles.typeBar}>
          <Icon size={13} color={color} />
          <span
            style={{
              fontSize: 10,
              color: color,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
              opacity: 0.9,
            }}
          >
            {label}
          </span>
        </div>

        <div className={styles.titleRow}>
          <span
            style={{
              flex: 1,
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-main)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {data.title}
          </span>
          <span
            className={`status-badge ${statusStyle.badgePulse ? status : ""}`}
            style={{
              background: statusStyle.badgeBg,
              color: statusStyle.badgeColor,
              border: `1px solid ${statusStyle.badgeColor}40`,
            }}
          >
            {statusStyle.badgeText}
          </span>
        </div>

        {(() => {
          const livePort = data.outputPorts?.find(p => p.name === "live_stream");
          if (!livePort || !livePort.content) return null;
          
          return (
            <div className={styles.streamLog}>
              <div
                style={{
                  fontSize: 11,
                  lineHeight: "1.4",
                  color: "rgba(180, 200, 230, 0.85)",
                  fontFamily: "var(--font-mono)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}
              >
                {String(livePort.content)}
                {status === "running" && (
                  <span style={{ 
                    display: "inline-block", 
                    width: 6, 
                    height: 12, 
                    background: color, 
                    marginLeft: 2,
                    verticalAlign: "middle",
                    animation: "blink 1s step-end infinite" 
                  }} />
                )}
              </div>
            </div>
          );
        })()}

        {isPendingApproval && (
          <div
            style={{
              fontSize: 11,
              color: "#ffab5e",
              padding: "2px 12px 4px 16px",
              fontFamily: "var(--font-mono)",
              opacity: 0.9,
              background: "rgba(255, 171, 94, 0.07)",
            }}
          >
            🔐 等待放行 · {data.approvalPayload?.toolName ?? "工具调用"}
          </div>
        )}

        {hasFooter ? (
          <div className={styles.footerBar}>
            {footer.ms && <span>⏱ {footer.ms}</span>}
            {footer.tokens && <span>· {footer.tokens} tok</span>}
          </div>
        ) : (
          <div style={{ height: isPendingApproval ? 4 : 8 }} />
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="node-handle" />
    </div>
  );
}, areEqual);
SemanticNode.displayName = "SemanticNode";