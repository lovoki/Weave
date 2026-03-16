/*
 * 文件作用：布局 Worker 预留骨架，用于未来将 Dagre/ELK 迁移到后台线程。
 */

self.onmessage = (event: MessageEvent<{ nodes: unknown[]; edges: unknown[] }>) => {
  // 预留：这里接入 Dagre/ELK 增量布局，避免主线程卡顿。
  self.postMessage(event.data);
};
