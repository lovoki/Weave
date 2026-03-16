/*
 * 文件作用：二维图主界面骨架，负责 WS 接入、增量事件应用与自动布局。
 */

import { useEffect, useMemo } from "react";
import ReactFlow, { Background, Controls, MiniMap, type Edge, type Node, type NodeChange, type EdgeChange, applyNodeChanges, applyEdgeChanges } from "reactflow";
import "reactflow/dist/style.css";
import { useGraphStore } from "./store/graph-store";
import { applyDagreLayout } from "./layout/dagre-layout";
import type { GraphEnvelope, GraphNodeData } from "./types/graph-events";

const LAYOUT_BATCH_WINDOW_MS = 100;

export default function App(): JSX.Element {
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const applyEnvelope = useGraphStore((s) => s.applyEnvelope);

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

  const layoutedNodes = useMemo(() => {
    return applyDagreLayout(nodes as Node[], edges as Edge[], "TB") as Node<GraphNodeData>[];
  }, [nodes, edges]);

  const onNodesChange = (changes: NodeChange[]) => {
    // 工业建议：拖拽锁定节点应写回 store，这里保留扩展位。
    void changes;
  };

  const onEdgesChange = (changes: EdgeChange[]) => {
    // 工业建议：边操作按需写回 store，这里保留扩展位。
    void changes;
  };

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <ReactFlow
        nodes={layoutedNodes}
        edges={edges}
        onNodesChange={(changes) => onNodesChange(changes)}
        onEdgesChange={(changes) => onEdgesChange(changes)}
        fitView
      >
        <Background />
        <MiniMap />
        <Controls />
      </ReactFlow>
    </div>
  );
}
