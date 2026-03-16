# Weave 二维图可开工蓝图

## 目标
- 保持现有 Agent Runtime 不破坏。
- 增加 Graph Projection 与 WS 网关。
- 前端使用 React Flow + Zustand + Dagre 先跑通。
- 协议版本化，后续可平滑升级 ELK 与 Worker。

## 目录结构

```text
apps/
  weave-graph-server/
    package.json
    tsconfig.json
    src/
      index.ts
      gateway/ws-gateway.ts
      projection/graph-projector.ts
      protocol/graph-events.ts
  weave-graph-web/
    package.json
    tsconfig.json
    vite.config.ts
    index.html
    src/
      main.tsx
      App.tsx
      types/graph-events.ts
      store/graph-store.ts
      layout/dagre-layout.ts
      workers/layout.worker.ts
```

## 协议说明
- `schemaVersion=weave.graph.v1`
- 最小事件：
  - `run.start`
  - `node.upsert`
  - `edge.upsert`
  - `node.status`
  - `node.io`
  - `layout.hint`
  - `run.end`
- `node.io` 支持：
  - `inputPorts[]`: `{name,type,summary,blobRef?}`
  - `outputPorts[]`: `{name,type,summary,blobRef?}`

## 后端职责边界
- Runtime Event Layer：继续产出原始运行事件。
- Graph Projection Layer：事件归一化，不暴露内部实现细节。
- WS Gateway：
  - 仅监听 `127.0.0.1`
  - token 校验
  - Origin 白名单（本地）
  - 心跳 ping

## 前端职责边界
- Zustand：单一真相源 + `seq` 去重。
- React Flow：纯渲染。
- Dagre：布局计算（当前全量布局）。
- Worker：布局迁移预留位（未来 ELK）。

## 联调步骤
1. 在 `apps/weave-graph-server` 安装依赖并启动。
2. 在 `apps/weave-graph-web` 安装依赖并启动。
3. 将 server 打印的 `port/token` 注入 web URL 参数：
   - `http://127.0.0.1:5173/?port=<port>&token=<token>`
4. 将 Runtime 事件接到 `GraphProjector.project(...)` 的 `forward` 函数。

## 下一阶段建议
- 增加 `blobRef` 详情拉取 API（避免大文本全量推送）。
- 增加 100ms 布局节流与拖拽锁定。
- 增加 run 事件回放与快照存档。
- 节点规模上百后切换 ELK 增量布局。
