/*
 * 文件作用：将节点与边交给 Dagre 计算布局坐标，供 React Flow 渲染。
 */

import dagre from "dagre";
import type { Edge, Node } from "reactflow";

const NODE_WIDTH = 280;
const NODE_HEIGHT = 92;

export function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  direction: "TB" | "LR" = "TB",
  lockedNodeIds: Set<string> = new Set<string>()
): Node[] {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: direction, ranksep: 90, nodesep: 48 });

  for (const node of nodes) {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target);
  }

  dagre.layout(graph);

  return nodes.map((node) => {
    if (lockedNodeIds.has(node.id)) {
      return node;
    }

    const positioned = graph.node(node.id);
    if (!positioned) {
      return node;
    }

    return {
      ...node,
      position: {
        x: positioned.x - NODE_WIDTH / 2,
        y: positioned.y - NODE_HEIGHT / 2
      }
    };
  });
}
