/*
 * 文件作用：图状态单一真相源，负责接收协议事件并更新 React Flow 数据。
 */

import { create } from "zustand";
import type { Edge, Node } from "reactflow";
import type { GraphEnvelope, GraphNodeData, GraphPort } from "../types/graph-events";

interface GraphState {
  runId: string;
  nodes: Node<GraphNodeData>[];
  edges: Edge[];
  latestSeq: number;
  lockedNodeIds: Set<string>;
  upsertNode: (payload: { nodeId: string; parentId?: string; title: string; kind: string }) => void;
  upsertEdge: (payload: { edgeId: string; source: string; target: string; label?: string }) => void;
  updateNodeStatus: (payload: { nodeId: string; status: string }) => void;
  updateNodeIo: (payload: { nodeId: string; inputPorts?: GraphPort[]; outputPorts?: GraphPort[] }) => void;
  applyEnvelope: (evt: GraphEnvelope<unknown>) => void;
  setLockedNodes: (nodeIds: string[]) => void;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  runId: "",
  nodes: [],
  edges: [],
  latestSeq: 0,
  lockedNodeIds: new Set<string>(),
  upsertNode(payload) {
    set((state) => {
      const index = state.nodes.findIndex((n) => n.id === payload.nodeId);
      if (index < 0) {
        const node: Node<GraphNodeData> = {
          id: payload.nodeId,
          position: { x: 0, y: 0 },
          data: {
            title: payload.title,
            kind: payload.kind
          }
        };
        return { nodes: [...state.nodes, node] };
      }

      const nextNodes = [...state.nodes];
      nextNodes[index] = {
        ...nextNodes[index],
        data: {
          ...nextNodes[index].data,
          title: payload.title,
          kind: payload.kind
        }
      };
      return { nodes: nextNodes };
    });
  },
  upsertEdge(payload) {
    set((state) => {
      if (state.edges.some((e) => e.id === payload.edgeId)) {
        return state;
      }

      const edge: Edge = {
        id: payload.edgeId,
        source: payload.source,
        target: payload.target,
        label: payload.label
      };
      return { edges: [...state.edges, edge] };
    });
  },
  updateNodeStatus(payload) {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === payload.nodeId
          ? { ...n, data: { ...n.data, status: payload.status } }
          : n
      )
    }));
  },
  updateNodeIo(payload) {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === payload.nodeId
          ? {
              ...n,
              data: {
                ...n.data,
                inputPorts: payload.inputPorts ?? n.data.inputPorts,
                outputPorts: payload.outputPorts ?? n.data.outputPorts
              }
            }
          : n
      )
    }));
  },
  applyEnvelope(evt) {
    if (evt.seq <= get().latestSeq) {
      return;
    }

    set({ latestSeq: evt.seq, runId: evt.runId });

    if (evt.eventType === "node.upsert") {
      const payload = evt.payload as { nodeId: string; parentId?: string; title: string; kind: string };
      get().upsertNode(payload);
      if (payload.parentId) {
        get().upsertEdge({
          edgeId: `${payload.parentId}->${payload.nodeId}`,
          source: payload.parentId,
          target: payload.nodeId
        });
      }
      return;
    }

    if (evt.eventType === "edge.upsert") {
      get().upsertEdge(evt.payload as { edgeId: string; source: string; target: string; label?: string });
      return;
    }

    if (evt.eventType === "node.status") {
      get().updateNodeStatus(evt.payload as { nodeId: string; status: string });
      return;
    }

    if (evt.eventType === "node.io") {
      get().updateNodeIo(evt.payload as { nodeId: string; inputPorts?: GraphPort[]; outputPorts?: GraphPort[] });
    }
  },
  setLockedNodes(nodeIds) {
    set({ lockedNodeIds: new Set(nodeIds) });
  }
}));
