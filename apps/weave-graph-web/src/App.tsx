/*
 * 文件作用：二维图主界面 — 浮动面板三栏布局，TB 方向画布，三 Tab Inspector。
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeChange
} from "reactflow";
import "reactflow/dist/style.css";
import "./app.css";
import {
  BrainCircuit,
  Zap,
  PauseOctagon,
  ShieldAlert,
  Sparkles,
  Cpu,
  MessageCircle,
  Inbox,
  Send,
  ScrollText,
  SearchCode,
  Copy,
  Check,
  type LucideIcon
} from "lucide-react";
import { useGraphStore } from "./store/graph-store";
import { applyDagreLayoutAsync } from "./layout/dagre-layout";
import type { GateActionMessage, GraphEnvelope, GraphNodeData } from "./types/graph-events";
import { SemanticNode } from "./nodes/semantic-node";
import { FlowEdge } from "./edges/FlowEdge";
import { ApprovalPanel } from "./components/ApprovalPanel";
import { ChatPanel } from "./components/ChatPanel";
import { WeaveIcon } from "./components/WeaveIcon";
import { InspectorTextBlock } from "./components/InspectorTextBlock";

const nodeTypes = { semantic: SemanticNode };
const edgeTypes = { flow: FlowEdge };

// 图标映射（Inspector 头部用）
const KIND_ICONS: Record<string, { Icon: LucideIcon; color: string }> = {
  llm:        { Icon: BrainCircuit,  color: "#a855f7" },
  tool:       { Icon: Zap,           color: "#3b82f6" },
  attempt:    { Icon: Zap,           color: "#3b82f6" },
  escalation: { Icon: Zap,           color: "#3b82f6" },
  condition:  { Icon: Zap,           color: "#3b82f6" },
  gate:       { Icon: PauseOctagon,  color: "#f59e0b" },
  repair:     { Icon: ShieldAlert,   color: "#ef4444" },
  final:      { Icon: Sparkles,      color: "#10b981" },
  system:     { Icon: Cpu,           color: "#64748b" },
  input:      { Icon: MessageCircle, color: "#06b6d4" },
};

// MiniMap 颜色映射
function kindNodeColor(kind?: string): string {
  const cfg = KIND_ICONS[kind ?? ""];
  return cfg?.color ?? "#64748b";
}

function renderPortSummary(summary: string) {
  return <InspectorTextBlock text={summary} />;
}

// ── 内层组件 ─────────────────────────────────────────────────────────────────

function GraphCanvas() {
  const dags           = useGraphStore((s) => s.dags);
  const dagOrder       = useGraphStore((s) => s.dagOrder);
  const activeDagId    = useGraphStore((s) => s.activeDagId);
  const setActiveDag   = useGraphStore((s) => s.setActiveDag);
  const selectNode     = useGraphStore((s) => s.selectNode);
  const applyActiveNodeChanges = useGraphStore((s) => s.applyActiveNodeChanges);
  const applyEnvelope  = useGraphStore((s) => s.applyEnvelope);
  const pendingApprovalNodeId = useGraphStore((s) => s.pendingApprovalNodeId);
  const clearPendingApproval  = useGraphStore((s) => s.clearPendingApproval);

  const { setCenter, fitView } = useReactFlow();

  const activeDag  = activeDagId ? dags[activeDagId] : undefined;
  const nodes      = activeDag?.nodes ?? [];
  const edges      = activeDag?.edges ?? [];
  const lockedNodeIds = activeDag?.lockedNodeIds ?? [];
  const selectedNode  = activeDag?.selectedNodeId
    ? nodes.find((n) => n.id === activeDag.selectedNodeId)
    : undefined;

  const [layoutedNodes, setLayoutedNodes] = useState<Node<GraphNodeData>[]>([]);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<"input" | "output" | "logs">("input");
  const [copied, setCopied] = useState(false);

  // Reset tab when selected node changes
  useEffect(() => { setActiveTab("input"); }, [selectedNode?.id]);

  const wsRef   = useRef<WebSocket | null>(null);
  const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const userInteractedRef = useRef(false);
  const layoutCancelRef   = useRef(false);

  const styledEdges = useMemo(() => {
    const nodeById = new Map(nodes.map((n) => [n.id, n]));
    return edges.map((edge) => {
      const target = nodeById.get(edge.target);
      const status = target?.data.status;
      let stroke = "rgba(255,255,255,0.12)";
      if (status === "success")                      stroke = "rgba(16,185,129,0.9)";
      else if (status === "fail")                    stroke = "rgba(239,68,68,0.95)";
      else if (status === "running" || status === "retrying") stroke = "rgba(59,130,246,0.95)";
      const isAnimated = status === "running" || status === "retrying";
      return {
        ...edge,
        type: isAnimated ? ("flow" as const) : ("smoothstep" as const),
        animated: isAnimated,
        style: { stroke, strokeWidth: 1.8 }
      };
    });
  }, [edges, nodes]);

  // WebSocket
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token  = params.get("token") ?? "";
    const port   = params.get("port") ?? "8787";
    const ws = new WebSocket(`ws://127.0.0.1:${port}/?token=${token}`);
    wsRef.current = ws;
    setWsStatus("connecting");
    ws.onopen    = () => setWsStatus("connected");
    ws.onclose   = () => setWsStatus("disconnected");
    ws.onerror   = () => setWsStatus("disconnected");
    ws.onmessage = (msg) => {
      const evt = JSON.parse(String(msg.data)) as GraphEnvelope<unknown>;
      applyEnvelope(evt);
    };
    return () => { wsRef.current = null; ws.close(); };
  }, [applyEnvelope]);

  const semanticNodes = useMemo(
    () => nodes.map((n) => ({ ...n, type: "semantic" })) as Node<GraphNodeData>[],
    [nodes]
  );

  // 异步布局
  useEffect(() => {
    layoutCancelRef.current = false;
    const timer = window.setTimeout(() => {
      void applyDagreLayoutAsync(semanticNodes as Node[], styledEdges as Edge[], "TB", new Set(lockedNodeIds)).then(
        (result) => {
          if (!layoutCancelRef.current) setLayoutedNodes(result as Node<GraphNodeData>[]);
        }
      );
    }, 100);
    return () => { window.clearTimeout(timer); layoutCancelRef.current = true; };
  }, [semanticNodes, styledEdges, lockedNodeIds]);

  useEffect(() => { if (!activeDagId) setLayoutedNodes([]); }, [activeDagId]);

  // 执行焦点跟踪
  useEffect(() => {
    if (userInteractedRef.current) return;
    const runningNode = layoutedNodes.find((n) => n.data.status === "running" || n.data.status === "retrying");
    if (runningNode?.position) {
      setCenter(runningNode.position.x + 130, runningNode.position.y + 40, { zoom: 0.95, duration: 500 });
    }
  }, [layoutedNodes, setCenter]);

  // pending_approval 自动选中 + 居中
  useEffect(() => {
    if (!pendingApprovalNodeId) return;
    userInteractedRef.current = false;
    selectNode(pendingApprovalNodeId);
    const timer = window.setTimeout(() => {
      const gateNode = layoutedNodes.find((n) => n.id === pendingApprovalNodeId);
      if (gateNode?.position) {
        setCenter(gateNode.position.x + 130, gateNode.position.y + 40, { zoom: 1.1, duration: 600 });
      } else {
        fitView({ padding: 0.2, duration: 600 });
      }
    }, 200);
    return () => window.clearTimeout(timer);
  }, [pendingApprovalNodeId, layoutedNodes, selectNode, setCenter, fitView]);

  const onNodesChange = (changes: NodeChange[]) => {
    const hasPositionChange = changes.some((c) => c.type === "position" && Boolean(c.dragging));
    if (hasPositionChange) userInteractedRef.current = true;
    applyActiveNodeChanges(changes);
  };

  const onPaneClick = () => { selectNode(undefined); userInteractedRef.current = false; };

  const handleApprovalAction = useCallback(
    (action: "approve" | "edit" | "skip" | "abort", params?: string) => {
      if (!wsRef.current || !pendingApprovalNodeId) return;
      const msg: GateActionMessage = { type: "gate.action", gateId: pendingApprovalNodeId, action, params };
      wsRef.current.send(JSON.stringify(msg));
      clearPendingApproval();
    },
    [pendingApprovalNodeId, clearPendingApproval]
  );

  const handleCopy = () => {
    if (!selectedNode) return;
    void navigator.clipboard.writeText(JSON.stringify(selectedNode.data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };

  const displayedNodes = layoutedNodes.length > 0 ? layoutedNodes : semanticNodes;

  const emptyCanvasNode = useMemo(() => {
    if (displayedNodes.length > 0 || activeDagId) return displayedNodes;
    return [
      {
        id: "placeholder",
        type: "semantic",
        position: { x: 120, y: 120 },
        draggable: false,
        selectable: false,
        data: { title: "等待会话事件", kind: "system", status: "pending", subtitle: "在 CLI 输入问题后，这里会生成 DAG" }
      }
    ] as Node<GraphNodeData>[];
  }, [displayedNodes, activeDagId]);

  // Inspector 内容
  const kindCfg = selectedNode ? (KIND_ICONS[selectedNode.data.kind ?? ""] ?? KIND_ICONS["tool"]) : null;

  const inspectorContent = useMemo(() => {
    if (!selectedNode) {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, color: "#4b5563" }}>
          <SearchCode size={40} opacity={0.4} />
          <p style={{ fontSize: 12, margin: 0, textAlign: "center" }}>在左侧画布选择节点以审查上下文</p>
        </div>
      );
    }

    const isPendingApproval = selectedNode.data.pendingApproval === true;

    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        {/* 节点头部摘要 */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 14px 10px" }}>
          {kindCfg && <kindCfg.Icon size={18} color={kindCfg.color} strokeWidth={2} style={{ flexShrink: 0 }} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {selectedNode.data.title}
            </div>
            <div style={{ fontSize: 10, color: "#6b7280", fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
              {selectedNode.id}
            </div>
          </div>
          <button
            onClick={handleCopy}
            title="复制节点数据"
            style={{ background: "none", border: "none", cursor: "pointer", color: copied ? "#34d399" : "#6b7280", padding: 4, flexShrink: 0 }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>

        {/* 审批面板（优先于 Tab） */}
        {isPendingApproval && selectedNode.data.approvalPayload && (
          <div style={{ padding: "0 14px 10px" }}>
            <ApprovalPanel
              toolName={selectedNode.data.approvalPayload.toolName}
              toolParams={selectedNode.data.approvalPayload.toolParams}
              gateId={selectedNode.id}
              onAction={handleApprovalAction}
            />
          </div>
        )}

        {/* 分隔线 */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", margin: "0 14px" }} />

        {/* Tab 切换条 */}
        <div style={{ display: "flex", gap: 2, padding: "8px 14px 0" }}>
          {([ ["input", Inbox, "输入"], ["output", Send, "输出"], ["logs", ScrollText, "日志"] ] as [string, LucideIcon, string][]).map(
            ([key, Icon, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as "input" | "output" | "logs")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  background: activeTab === key ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.04)",
                  color: activeTab === key ? "#93c5fd" : "#6b7280",
                  borderBottom: activeTab === key ? "2px solid #3b82f6" : "2px solid transparent",
                  transition: "all 0.15s",
                }}
              >
                <Icon size={11} />
                {label}
              </button>
            )
          )}
        </div>

        {/* Tab 内容区 */}
        <div
          className="custom-scroll"
          style={{ flex: 1, overflowY: "auto", padding: "10px 14px" }}
        >
          {activeTab === "input" && (
            <div>
              {(selectedNode.data.inputPorts ?? []).length === 0 ? (
                <div style={{ fontSize: 12, color: "#4b5563" }}>无输入端口</div>
              ) : (
                (selectedNode.data.inputPorts ?? []).map((port) => (
                  <div key={`in-${port.name}`} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", marginBottom: 4 }}>{port.name}</div>
                    {renderPortSummary(port.summary)}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "output" && (
            <div>
              {(selectedNode.data.outputPorts ?? []).length === 0 ? (
                <div style={{ fontSize: 12, color: "#4b5563" }}>无输出端口</div>
              ) : (
                (selectedNode.data.outputPorts ?? []).map((port) => (
                  <div key={`out-${port.name}`} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", marginBottom: 4 }}>{port.name}</div>
                    {renderPortSummary(port.summary)}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "logs" && (
            <div style={{ fontSize: 12, color: "#4b5563", fontFamily: "'JetBrains Mono', monospace" }}>
              暂无日志数据
            </div>
          )}
        </div>
      </div>
    );
  }, [selectedNode, activeTab, activeTab, kindCfg, copied, handleApprovalAction, handleCopy]);

  // WS 状态
  const wsStatusDot   = wsStatus === "connected" ? "ws-dot-connected" : wsStatus === "connecting" ? "ws-dot-connecting" : "ws-dot-disconnected";
  const wsStatusLabel = wsStatus === "connected" ? "已连接" : wsStatus === "connecting" ? "连接中" : "已断开";

  // 动态网格列
  const gridCols = `${leftCollapsed ? "36px" : "24%"} 1fr ${rightCollapsed ? "36px" : "26%"}`;

  const panelStyle: React.CSSProperties = {
    background: "rgba(17,17,17,0.82)",
    backdropFilter: "blur(18px)",
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "grid",
        gridTemplateColumns: gridCols,
        gridTemplateRows: "40px 1fr",
        background: "var(--bg-app)",
        transition: "grid-template-columns 0.26s cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header
        style={{
          gridColumn: "1 / -1",
          gridRow: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          ...panelStyle,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <WeaveIcon size={26} />
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.18em", color: "#e2e8f0" }}>WEAVE</span>
          {dagOrder.length > 0 && (
            <span style={{ fontSize: 10, color: "#9ca3af", background: "rgba(255,255,255,0.06)", padding: "2px 8px", borderRadius: 10, marginLeft: 4 }}>
              {dagOrder.length} 轮对话
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span className={`ws-dot ${wsStatusDot}`} />
          <span style={{ fontSize: 11, color: "#9ca3af" }}>{wsStatusLabel}</span>
        </div>
      </header>

      {/* ── Chat Panel ─────────────────────────────────────────────── */}
      <div
        style={{
          position: "relative",
          gridRow: 2,
          overflow: "hidden",
          borderRight: "1px solid rgba(255,255,255,0.08)",
          ...panelStyle,
          ...(leftCollapsed ? { display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "6px 0" } : {}),
        }}
      >
        <button
          onClick={() => setLeftCollapsed(!leftCollapsed)}
          style={{
            position: "absolute",
            top: "50%",
            right: -9,
            transform: "translateY(-50%)",
            width: 18,
            height: 44,
            background: "rgba(31,41,55,0.95)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 3,
            color: "#9ca3af",
            fontSize: 12,
            cursor: "pointer",
            zIndex: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
          }}
        >
          {leftCollapsed ? "›" : "‹"}
        </button>
        {!leftCollapsed && (
          <ChatPanel dagOrder={dagOrder} dags={dags} activeDagId={activeDagId} onSelectDag={setActiveDag} />
        )}
        {leftCollapsed && (
          <span style={{ writingMode: "vertical-rl", fontSize: 10, letterSpacing: "0.1em", color: "#6b7280", marginTop: 48 }}>
            CHAT
          </span>
        )}
      </div>

      {/* ── DAG Canvas ─────────────────────────────────────────────── */}
      <main style={{ gridRow: 2, position: "relative" }}>
        <ReactFlow
          nodes={emptyCanvasNode}
          edges={styledEdges}
          fitView
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onNodeClick={(_, node) => { userInteractedRef.current = true; selectNode(node.id); }}
          onPaneClick={onPaneClick}
          defaultEdgeOptions={{ type: "smoothstep" }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} color="rgba(255,255,255,0.06)" />
          <MiniMap
            position="bottom-left"
            style={{ backgroundColor: "#18181B", border: "1px solid rgba(255,255,255,0.08)" }}
            maskColor="rgba(0,0,0,0.7)"
            nodeColor={(node) => kindNodeColor(node.data?.kind)}
          />
          <Controls />
        </ReactFlow>
      </main>

      {/* ── Inspector Panel ─────────────────────────────────────────── */}
      <div
        style={{
          position: "relative",
          gridRow: 2,
          overflow: "hidden",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
          ...panelStyle,
          ...(rightCollapsed ? { display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "6px 0" } : {}),
        }}
      >
        <button
          onClick={() => setRightCollapsed(!rightCollapsed)}
          style={{
            position: "absolute",
            top: "50%",
            left: -9,
            transform: "translateY(-50%)",
            width: 18,
            height: 44,
            background: "rgba(31,41,55,0.95)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 3,
            color: "#9ca3af",
            fontSize: 12,
            cursor: "pointer",
            zIndex: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
          }}
        >
          {rightCollapsed ? "‹" : "›"}
        </button>
        {!rightCollapsed && (
          <div style={{ height: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {inspectorContent}
          </div>
        )}
        {rightCollapsed && (
          <span style={{ writingMode: "vertical-rl", fontSize: 10, letterSpacing: "0.1em", color: "#6b7280", marginTop: 48 }}>
            INFO
          </span>
        )}
      </div>
    </div>
  );
}

// ── 外层：注入 ReactFlowProvider ────────────────────────────────────────────

export default function App() {
  return (
    <ReactFlowProvider>
      <GraphCanvas />
    </ReactFlowProvider>
  );
}
