/**
 * 文件作用：DAG 树渲染逻辑，从 App.tsx 提取。
 * 包含节点排序、树线构建、展开/折叠、语义标题等纯函数。
 */

// ─── 类型定义 ───

export type DagDisplayStatus = "running" | "waiting" | "retrying" | "success" | "fail";

export interface TreeLine {
  id: string;
  parentId?: string;
  depth: number;
  branchPrefix: string;
  detailIndent: number;
  label: string;
  status: DagDisplayStatus;
  durationText: string;
  isCurrent: boolean;
  hasDetails: boolean;
  isExpanded: boolean;
  retryCurrent?: number;
  retryMax?: number;
  details: string[];
}

export interface DagNodeInput {
  id: string;
  parentId?: string;
  label: string;
  status: DagDisplayStatus;
  startedAtMs: number;
  endedAtMs?: number;
  updatedAtMs: number;
  pausedAtMs?: number;
  pausedDurationMs: number;
  retryCurrent?: number;
  retryMax?: number;
  details: string[];
}

// ─── 节点排序 ───

function parseNodePath(id: string): number[] {
  return id
    .split(".")
    .map((part) => Number(part))
    .filter((n) => Number.isFinite(n));
}

export function compareNodeId(a: string, b: string): number {
  const ap = parseNodePath(a);
  const bp = parseNodePath(b);
  const max = Math.max(ap.length, bp.length);

  for (let i = 0; i < max; i += 1) {
    const av = ap[i] ?? -1;
    const bv = bp[i] ?? -1;
    if (av !== bv) {
      return av - bv;
    }
  }

  return 0;
}

// ─── 状态与标签 ───

export function statusIcon(status: DagDisplayStatus, retryCurrent?: number, retryMax?: number): string {
  if (status === "running") {
    return "◓";
  }
  if (status === "waiting") {
    return "⏸";
  }
  if (status === "retrying") {
    if (typeof retryCurrent === "number" && typeof retryMax === "number") {
      return `↻(${retryCurrent}/${retryMax})`;
    }
    return "↻";
  }
  if (status === "success") {
    return "✔";
  }
  return "✖";
}

export function isLowSignalDecisionLabel(label: string): boolean {
  const normalized = label.trim();
  return (
    normalized === "大模型决策中..." ||
    normalized === "决策为调用工具" ||
    normalized === "大模型决策完成" ||
    normalized === "大模型决策完成，进入下一轮"
  );
}

export function extractDetailValue(details: string[], key: string): string {
  const line = details.find((item) => item.startsWith(`${key}=`));
  if (!line) {
    return "";
  }

  return line.slice(key.length + 1).trim();
}

export function semanticToolTitle(label: string, details: string[]): string {
  const command = extractDetailValue(details, "command");
  const file = extractDetailValue(details, "file");

  if (label.includes("执行命令") && command) {
    return `⚡ 运行命令: [${command}]`;
  }

  if (label.includes("读取文件") && file) {
    return `📄 查阅文件: [${file}]`;
  }

  if (label.includes("写入文件") && file) {
    return `✏️ 写入文件: [${file}]`;
  }

  if (label.includes("执行命令")) {
    return "⚡ 运行命令";
  }

  if (label.includes("读取文件")) {
    return "📄 查阅文件";
  }

  if (label.includes("写入文件")) {
    return "✏️ 写入文件";
  }

  return label;
}

export function isRepairLlmNodeLabel(label: string): boolean {
  return label.includes("局部修复参数");
}

export function summarizeApprovalIntent(toolName: string, argsText: string): string {
  let args: Record<string, unknown> = {};
  try {
    args = JSON.parse(argsText) as Record<string, unknown>;
  } catch {
    args = {};
  }

  if (toolName === "command_exec") {
    const command = typeof args.command === "string" ? args.command : "";
    return command ? `⚡ 运行命令: [${command}]` : "⚡ 运行命令";
  }

  if (toolName === "read_file") {
    const filePath = typeof args.filePath === "string"
      ? args.filePath
      : typeof args.path === "string"
        ? args.path
        : "";
    return filePath ? `📄 查阅文件: [${filePath}]` : "📄 查阅文件";
  }

  if (toolName === "write_file") {
    const filePath = typeof args.filePath === "string"
      ? args.filePath
      : typeof args.path === "string"
        ? args.path
        : "";
    return filePath ? `✏️ 写入文件: [${filePath}]` : "✏️ 写入文件";
  }

  return `执行工具: ${toolName}`;
}

export function formatDurationMs(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

// ─── 树构建 ───

export function buildWeaveTreeLines(
  nodes: DagNodeInput[],
  expandedNodeIds: Set<string>,
  forceVisibleNodeIds: Set<string>
): TreeLine[] {
  if (nodes.length === 0) {
    return [];
  }

  const byParent = new Map<string, DagNodeInput[]>();
  for (const node of nodes) {
    const parent = node.parentId ?? "__root__";
    const list = byParent.get(parent) ?? [];
    list.push(node);
    byParent.set(parent, list);
  }

  for (const [key, list] of byParent.entries()) {
    list.sort((a, b) => compareNodeId(a.id, b.id));
    byParent.set(key, list);
  }

  const lines: TreeLine[] = [];

  const walk = (list: DagNodeInput[], prefix: string, depth: number): void => {
    list.forEach((node, index) => {
      const children = byParent.get(node.id) ?? [];
      const shouldFlattenThisNode =
        !node.id.includes(".") &&
        children.length > 0 &&
        isLowSignalDecisionLabel(node.label) &&
        !forceVisibleNodeIds.has(node.id);

      if (shouldFlattenThisNode) {
        walk(children, prefix, depth);
        return;
      }

      const isLast = index === list.length - 1;
      const branch = depth === 0 ? "" : `${isLast ? "└─" : "├─"} `;
      const branchPrefix = `${prefix}${branch}`;
      const activePausedMs = node.pausedAtMs ? Math.max(0, Date.now() - node.pausedAtMs) : 0;
      const pausedDurationMs = Math.max(0, (node.pausedDurationMs ?? 0) + activePausedMs);
      const durationMs = Math.max(0, (node.endedAtMs ?? node.updatedAtMs) - node.startedAtMs - pausedDurationMs);
      const durationText = durationMs >= 0 ? ` (${formatDurationMs(durationMs)})` : "";
      const hasDetails = node.details.length > 0;
      const isExpanded = hasDetails ? expandedNodeIds.has(node.id) : false;

      lines.push({
        id: node.id,
        parentId: node.parentId,
        depth,
        branchPrefix,
        detailIndent: branchPrefix.length,
        label: node.label,
        status: node.status,
        durationText,
        isCurrent: false,
        hasDetails,
        isExpanded,
        retryCurrent: node.retryCurrent,
        retryMax: node.retryMax,
        details: node.details
      });

      if (children.length > 0) {
        const childPrefix = depth === 0 ? "" : `${prefix}${isLast ? "   " : "│  "}`;
        walk(children, childPrefix, depth + 1);
      }
    });
  };

  const roots = byParent.get("__root__") ?? [];
  walk(roots, "", 0);

  const currentNode = [...nodes]
    .filter((node) => node.status === "running" || node.status === "waiting" || node.status === "retrying")
    .sort((a, b) => b.updatedAtMs - a.updatedAtMs)[0];
  if (currentNode) {
    const index = lines.findIndex((line) => line.id === currentNode.id);
    if (index >= 0) {
      lines[index] = {
        ...lines[index],
        isCurrent: true
      };
    }
  }

  return lines;
}

export function buildVisibleDagNodeIds(
  nodes: Array<{ id: string; parentId?: string; label: string }>,
  forceVisibleNodeIds: Set<string>
): string[] {
  if (nodes.length === 0) {
    return [];
  }

  const byParent = new Map<string, Array<{ id: string; parentId?: string; label: string }>>();
  for (const node of nodes) {
    const parent = node.parentId ?? "__root__";
    const list = byParent.get(parent) ?? [];
    list.push(node);
    byParent.set(parent, list);
  }

  for (const [key, list] of byParent.entries()) {
    list.sort((a, b) => compareNodeId(a.id, b.id));
    byParent.set(key, list);
  }

  const visibleIds: string[] = [];

  const walk = (list: Array<{ id: string; parentId?: string; label: string }>): void => {
    for (const node of list) {
      const children = byParent.get(node.id) ?? [];
      const shouldFlattenThisNode =
        !node.id.includes(".") &&
        children.length > 0 &&
        isLowSignalDecisionLabel(node.label) &&
        !forceVisibleNodeIds.has(node.id);

      if (shouldFlattenThisNode) {
        walk(children);
        continue;
      }

      visibleIds.push(node.id);
      if (children.length > 0) {
        walk(children);
      }
    }
  };

  walk(byParent.get("__root__") ?? []);
  return visibleIds;
}
