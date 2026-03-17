/*
 * 文件作用：语义化节点渲染组件，提供类型配色、图标和状态灯。
 */

import { memo } from "react";
import { Handle, Position } from "reactflow";
import type { GraphNodeData } from "../types/graph-events";

interface SemanticNodeProps {
  data: GraphNodeData;
}

export const SemanticNode = memo(function SemanticNode({ data }: SemanticNodeProps) {
  const kindClass = `node-kind-${data.kind ?? "tool"}`;
  const statusClass = `node-status-${data.status ?? "pending"}`;
  const icon = iconByKind(data.kind);

  return (
    <div className={`semantic-node ${kindClass} ${statusClass}`}>
      <Handle type="target" position={Position.Left} className="node-handle" />
      <div className="semantic-node-header">
        <span className="semantic-node-icon">{icon}</span>
        <span className="semantic-node-title">{data.title}</span>
        <span className="semantic-node-status-dot" />
      </div>
      <div className="semantic-node-subtitle">{data.subtitle ?? "waiting for detail"}</div>
      <Handle type="source" position={Position.Right} className="node-handle" />
    </div>
  );
});

function iconByKind(kind?: string): string {
  if (kind === "llm") {
    return "🧠";
  }
  if (kind === "gate") {
    return "⏸️";
  }
  if (kind === "repair") {
    return "✖️";
  }
  if (kind === "final") {
    return "✔️";
  }
  if (kind === "system") {
    return "🧱";
  }
  return "⚡";
}
