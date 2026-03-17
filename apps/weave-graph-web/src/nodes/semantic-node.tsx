/*
 * 文件作用：语义化节点渲染组件 — 玻璃态卡片，Emoji 图标，TB 方向 Handle。
 */

import { memo } from "react";
import { Handle, Position } from "reactflow";
// import {
//   BrainCircuit, Zap, PauseOctagon, ShieldAlert, Sparkles, Cpu, MessageCircle,
//   Timer, Coins, type LucideIcon
// } from "lucide-react";
import type { GraphNodeData } from "../types/graph-events";

interface KindConfig {
  icon: string;
  color: string;
}

const KIND_MAP: Record<string, KindConfig> = {
  llm:        { icon: "🧠", color: "#a855f7" },
  tool:       { icon: "⚡", color: "#3b82f6" },
  attempt:    { icon: "⚡", color: "#3b82f6" },
  escalation: { icon: "⚡", color: "#3b82f6" },
  condition:  { icon: "⚡", color: "#3b82f6" },
  gate:       { icon: "⏸️", color: "#f59e0b" },
  repair:     { icon: "✖️", color: "#ef4444" },
  final:      { icon: "✔️", color: "#10b981" },
  system:     { icon: "🧱", color: "#64748b" },
  input:      { icon: "💬", color: "#06b6d4" },
};

const DEFAULT_KIND: KindConfig = { icon: "⚡", color: "#3b82f6" };

function getStatusDot(status?: string): { color: string; pulse: boolean } {
  if (status === "running" || status === "retrying") return { color: "#f59e0b", pulse: true };
  if (status === "success") return { color: "#22c55e", pulse: false };
  if (status === "fail")    return { color: "#ef4444", pulse: false };
  if (status === "skipped") return { color: "#475569", pulse: false };
  return { color: "#64748b", pulse: false };
}

function parseFooter(data: GraphNodeData): { ms?: string; tokens?: string } {
  // 优先从 metrics 读取
  if (data.metrics?.durationMs !== undefined) {
    const ms = `${data.metrics.durationMs}ms`;
    const tokens =
      data.metrics.promptTokens !== undefined
        ? `${data.metrics.promptTokens}+${data.metrics.completionTokens ?? 0} tokens`
        : undefined;
    return { ms, tokens };
  }
  // 降级：从副标题文本解析（旧格式兼容）
  const subtitle = data.subtitle ?? "";
  if (!subtitle) return {};
  const parts = subtitle.split(/[·•|]/);
  const ms = parts.find((p) => p.includes("ms"))?.trim();
  const tokens = parts.find((p) => p.includes("token"))?.trim();
  return { ms, tokens };
}

interface SemanticNodeProps {
  data: GraphNodeData;
}

export const SemanticNode = memo(function SemanticNode({ data }: SemanticNodeProps) {
  const kind = data.kind ?? "tool";
  const status = data.status ?? "pending";
  const { icon, color } = KIND_MAP[kind] ?? DEFAULT_KIND;
  const dot = getStatusDot(status);
  const isPendingApproval = data.pendingApproval === true;
  const footer = parseFooter(data);

  const subtitleText = isPendingApproval
    ? `等待放行 · ${data.approvalPayload?.toolName ?? "工具调用"}`
    : undefined;

  return (
    <div
      className={`node-status-${status} ${isPendingApproval ? "node-pending-approval" : ""}`}
      style={{ width: 260 }}
    >
      <Handle type="target" position={Position.Top} className="node-handle" />

      {/* 玻璃态卡片 */}
      <div
        className="semantic-node-card"
        style={{
          position: "relative",
          width: 260,
          borderRadius: 12,
          background: "rgba(24,24,27,0.90)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.55)",
          overflow: "hidden",
        }}
      >
        {/* 左侧发光线 */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 8,
            bottom: 8,
            width: 3,
            borderRadius: "0 2px 2px 0",
            background: color,
            boxShadow: `0 0 8px 3px ${color}50`,
          }}
        />

        {/* Top Bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px 4px 14px" }}>
          <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }}>{icon}</span>
          <span
            style={{
              flex: 1,
              fontSize: 13,
              fontWeight: 700,
              color: "#ffffff",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {data.title}
          </span>
          {/* 状态圆点 */}
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: dot.color,
              boxShadow: `0 0 0 2px ${dot.color}30`,
              animation: dot.pulse ? "node-aura 1.8s ease-in-out infinite" : undefined,
              flexShrink: 0,
            }}
          />
        </div>

        {/* 副标题（审批状态） */}
        {subtitleText && (
          <div
            style={{
              fontSize: 11,
              color: "#f59e0b",
              padding: "0 12px 4px 14px",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            ⏸ {subtitleText}
          </div>
        )}

        {/* Footer：耗时 + tokens */}
        {(footer.ms || footer.tokens) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "2px 12px 8px 14px",
              fontSize: 11,
              color: "#6b7280",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {/* <Timer size={10} strokeWidth={1.5} /> */}
            {footer.ms && <span>⏱ {footer.ms}</span>}
            {/* <Coins size={10} strokeWidth={1.5} /> */}
            {footer.tokens && <span>🪙 {footer.tokens}</span>}
          </div>
        )}

        {/* 无 footer 时补充底部 padding */}
        {!footer.ms && !footer.tokens && !subtitleText && (
          <div style={{ height: 8 }} />
        )}
        {!footer.ms && !footer.tokens && subtitleText && (
          <div style={{ height: 4 }} />
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="node-handle" />
    </div>
  );
});
