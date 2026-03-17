/*
 * 文件作用：二维图主界面，支持按 dagId 时间轴切换并渲染当前 DAG。
 */

import { useEffect, useMemo, useState } from "react";
import ReactFlow, { Background, BackgroundVariant, Controls, MiniMap, type Edge, type Node, type NodeChange } from "reactflow";
import "reactflow/dist/style.css";
import "./app.css";
import { useGraphStore } from "./store/graph-store";
import { applyDagreLayout } from "./layout/dagre-layout";
import type { GraphEnvelope, GraphNodeData } from "./types/graph-events";
import { SemanticNode } from "./nodes/semantic-node";

const nodeTypes = {
  semantic: SemanticNode
};

export default function App() {
  const dags = useGraphStore((s) => s.dags);
  const dagOrder = useGraphStore((s) => s.dagOrder);
  const activeDagId = useGraphStore((s) => s.activeDagId);
  const setActiveDag = useGraphStore((s) => s.setActiveDag);
  const selectNode = useGraphStore((s) => s.selectNode);
  const applyActiveNodeChanges = useGraphStore((s) => s.applyActiveNodeChanges);
  const applyEnvelope = useGraphStore((s) => s.applyEnvelope);

  const activeDag = activeDagId ? dags[activeDagId] : undefined;
  const nodes = activeDag?.nodes ?? [];
  const edges = activeDag?.edges ?? [];
  const lockedNodeIds = activeDag?.lockedNodeIds ?? [];
  const selectedNode = activeDag?.selectedNodeId ? nodes.find((n) => n.id === activeDag.selectedNodeId) : undefined;
  const [layoutedNodes, setLayoutedNodes] = useState<Node<GraphNodeData>[]>([]);

  const styledEdges = useMemo(() => {
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    return edges.map((edge) => {
      const target = nodeById.get(edge.target);
      const status = target?.data.status;
      let stroke = "rgba(255, 255, 255, 0.2)";
      if (status === "success") {
        stroke = "rgba(16, 185, 129, 0.9)";
      } else if (status === "fail") {
        stroke = "rgba(239, 68, 68, 0.95)";
      } else if (status === "running" || status === "retrying") {
        stroke = "rgba(59, 130, 246, 0.95)";
      }

      return {
        ...edge,
        type: "smoothstep" as const,
        animated: status === "running" || status === "retrying",
        style: {
          stroke,
          strokeWidth: 1.8
        }
      };
    });
  }, [edges, nodes]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token") ?? "";
    const port = params.get("port") ?? "8787";

    const ws = new WebSocket(`ws://127.0.0.1:${port}/?token=${token}`);

    ws.onmessage = (message) => {
      const evt = JSON.parse(String(message.data)) as GraphEnvelope<unknown>;
      applyEnvelope(evt);
    };

    return () => {
      ws.close();
    };
  }, [applyEnvelope]);

  const semanticNodes = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      type: "semantic"
    })) as Node<GraphNodeData>[];
  }, [nodes]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = applyDagreLayout(semanticNodes as Node[], styledEdges as Edge[], "LR", new Set(lockedNodeIds));
      setLayoutedNodes(next as Node<GraphNodeData>[]);
    }, 100);

    return () => {
      window.clearTimeout(timer);
    };
  }, [semanticNodes, styledEdges, lockedNodeIds]);

  useEffect(() => {
    if (!activeDagId) {
      setLayoutedNodes([]);
    }
  }, [activeDagId]);

  const onNodesChange = (changes: NodeChange[]) => {
    applyActiveNodeChanges(changes);
  };

  const displayedNodes = layoutedNodes.length > 0 ? layoutedNodes : semanticNodes;

  const emptyCanvasNode = useMemo(() => {
    if (displayedNodes.length > 0 || activeDagId) {
      return displayedNodes;
    }

    return [
      {
        id: "placeholder",
        type: "semantic",
        position: { x: 120, y: 120 },
        draggable: false,
        selectable: false,
        data: {
          title: "等待会话事件",
          kind: "system",
          status: "pending",
          subtitle: "在 CLI 输入问题后，这里会生成 DAG"
        }
      }
    ] as Node<GraphNodeData>[];
  }, [displayedNodes, activeDagId]);

  return (
    <div className="graph-shell">
      <aside className="timeline-panel">
        <h3 className="panel-title">Timeline</h3>
        {dagOrder.length === 0 ? <div className="inspector-value">等待事件...</div> : null}
        {dagOrder.map((dagId) => {
          const dag = dags[dagId];
          const isActive = dagId === activeDagId;
          const title = dag?.userInputSummary?.trim() || dagId;
          return (
            <button
              key={dagId}
              onClick={() => setActiveDag(dagId)}
              className={`timeline-item ${isActive ? "active" : ""}`}
            >
              <div className="timeline-title">{title}</div>
              <div className="timeline-subtitle">{dagId}</div>
            </button>
          );
        })}
      </aside>

      <main className="canvas-panel">
        <ReactFlow
          nodes={emptyCanvasNode}
          edges={styledEdges}
          fitView
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onNodeClick={(_, node) => selectNode(node.id)}
          onPaneClick={() => selectNode(undefined)}
          defaultEdgeOptions={{ type: "smoothstep" }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} color="rgba(255,255,255,0.1)" />
          <MiniMap />
          <Controls />
        </ReactFlow>
      </main>

      <aside className="inspector-panel">
        <h3 className="panel-title">Inspector</h3>
        {!selectedNode ? (
          <div className="inspector-empty">
            <div className="inspector-empty-icon">◌</div>
            <div className="inspector-value">请在画布中选择一个节点查看 DAG 详情...</div>
          </div>
        ) : (
          <div>
            <div className="inspector-group">
              <div className="inspector-label">节点</div>
              <div className="inspector-value">{selectedNode.data.title}</div>
              <div className="inspector-code">{selectedNode.id}</div>
            </div>

            <div className="inspector-group">
              <div className="inspector-label">类型 / 状态</div>
              <div className="inspector-value">
                {selectedNode.data.kind} / {selectedNode.data.status ?? "pending"}
              </div>
            </div>

            <div className="inspector-group">
              <div className="inspector-label">输入端口</div>
              {(selectedNode.data.inputPorts ?? []).length === 0 ? (
                <div className="inspector-value">无</div>
              ) : (
                (selectedNode.data.inputPorts ?? []).map((port) => (
                  <div key={`in-${port.name}`} className="inspector-value" style={{ marginBottom: 8 }}>
                    <div style={{ fontWeight: 600 }}>{port.name}</div>
                    {renderPortSummary(port.summary)}
                  </div>
                ))
              )}
            </div>

            <div className="inspector-group">
              <div className="inspector-label">输出端口</div>
              {(selectedNode.data.outputPorts ?? []).length === 0 ? (
                <div className="inspector-value">无</div>
              ) : (
                (selectedNode.data.outputPorts ?? []).map((port) => (
                  <div key={`out-${port.name}`} className="inspector-value" style={{ marginBottom: 8 }}>
                    <div style={{ fontWeight: 600 }}>{port.name}</div>
                    {renderPortSummary(port.summary)}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function renderPortSummary(summary: string) {
  return <InspectorTextBlock text={summary} />;
}

function InspectorTextBlock({ text }: { text: string }) {
  const normalizedText = (text ?? "").trim();
  const isLikelyJson =
    (normalizedText.startsWith("{") && normalizedText.endsWith("}")) ||
    (normalizedText.startsWith("[") && normalizedText.endsWith("]"));
  const shouldCollapse = normalizedText.length > 120 || normalizedText.includes("\n");
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [SyntaxHighlighterComp, setSyntaxHighlighterComp] = useState<null | React.ComponentType<any>>(null);
  const [highlighterTheme, setHighlighterTheme] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    if (!expanded || SyntaxHighlighterComp) {
      return;
    }

    Promise.all([
      import("react-syntax-highlighter"),
      import("react-syntax-highlighter/dist/esm/styles/prism")
    ]).then(([syntaxModule, themeModule]) => {
      if (cancelled) {
        return;
      }
      setSyntaxHighlighterComp(() => syntaxModule.Prism);
      setHighlighterTheme(themeModule.oneDark);
    });

    return () => {
      cancelled = true;
    };
  }, [expanded, SyntaxHighlighterComp]);

  const onCopy = async () => {
    if (!normalizedText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(normalizedText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1000);
    } catch {
      setCopied(false);
    }
  };

  if (!normalizedText) {
    return <div className="inspector-code">(empty)</div>;
  }

  if (!shouldCollapse) {
    return (
      <div className="inspector-code-toolbar-wrap">
        <div className="inspector-code">{normalizedText}</div>
        <div className="inspector-toolbar">
          <button className="inspector-btn" onClick={() => void onCopy()}>
            {copied ? "已复制" : "复制"}
          </button>
        </div>
      </div>
    );
  }

  const preview = normalizedText.length > 120 ? `${normalizedText.slice(0, 120)}...` : normalizedText;
  return (
    <div className="inspector-code-toolbar-wrap">
      <div className="inspector-toolbar">
        <button className={`inspector-btn ${!expanded ? "active" : ""}`} onClick={() => setExpanded(false)}>
          摘要
        </button>
        <button className={`inspector-btn ${expanded ? "active" : ""}`} onClick={() => setExpanded(true)}>
          展开
        </button>
        <button className="inspector-btn" onClick={() => void onCopy()}>
          {copied ? "已复制" : "复制"}
        </button>
      </div>

      {!expanded ? (
        <div className="inspector-code">{preview}</div>
      ) : SyntaxHighlighterComp && highlighterTheme ? (
        <div className="inspector-code-block">
          <SyntaxHighlighterComp language={isLikelyJson ? "json" : "bash"} style={highlighterTheme} customStyle={{ margin: 0, fontSize: 11 }}>
            {normalizedText}
          </SyntaxHighlighterComp>
        </div>
      ) : (
        <div className="inspector-code">正在加载高亮...</div>
      )}
    </div>
  );
}
