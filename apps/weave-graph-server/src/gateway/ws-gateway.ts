/*
 * 文件作用：提供本地 WS 网关，按会话 token 广播图协议事件，并支持前端发送 gate.action 审批消息。
 */

import { createServer, type Server as HttpServer } from "node:http";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import express from "express";
import { WebSocketServer, type WebSocket } from "ws";
import type { GraphEnvelope } from "../protocol/graph-events.js";
import type { RuntimeRawEvent } from "../projection/graph-projector.js";

export interface GateDecision {
  action: "approve" | "edit" | "skip" | "abort";
  params?: string;
}

export interface GraphGateway {
  port: number;
  token: string;
  ingestUrl: string;
  publish(event: GraphEnvelope<unknown>): void;
  registerRuntimeIngestHandler(handler: (event: RuntimeRawEvent) => void): void;
  getGateDecision(gateId: string): GateDecision | undefined;
  clearGateDecision(gateId: string): void;
  close(): Promise<void>;
  httpServer: HttpServer;
}

export async function createGraphGateway(staticDir?: string): Promise<GraphGateway> {
  const app = express();
  app.use(express.json({ limit: "2mb" }));
  if (staticDir) {
    app.use(express.static(staticDir));
  }

  const token = randomBytes(16).toString("hex");
  let runtimeIngestHandler: ((event: RuntimeRawEvent) => void) | null = null;
  // 存储来自 Web 前端的 gate 审批决策，key=gateId（即 toolCallId）
  const pendingGateDecisions = new Map<string, GateDecision>();

  app.post("/ingest/runtime-event", (req, res) => {
    const incomingToken = req.headers["x-graph-token"];
    if (incomingToken !== token) {
      res.status(401).json({ ok: false, error: "unauthorized" });
      return;
    }

    if (!runtimeIngestHandler) {
      res.status(503).json({ ok: false, error: "ingest-handler-not-ready" });
      return;
    }

    runtimeIngestHandler(req.body as RuntimeRawEvent);
    console.log(`[graph-server] ingest accepted type=${String((req.body as RuntimeRawEvent)?.type ?? "unknown")}`);
    res.status(202).json({ ok: true });
  });

  // CLI 轮询端点：获取 Web 前端已做的 gate 审批决策
  app.get("/api/gate/decision/:gateId", (req, res) => {
    const incomingToken = req.headers["x-graph-token"];
    if (incomingToken !== token) {
      res.status(401).json({ ok: false, error: "unauthorized" });
      return;
    }

    const gateId = req.params["gateId"] ?? "";
    const decision = pendingGateDecisions.get(gateId);
    if (!decision) {
      res.status(204).end();
      return;
    }

    console.log(`[graph-server] gate decision picked up gateId=${gateId} action=${decision.action}`);
    res.status(200).json(decision);
  });

  // Blob 按需拉取端点（供前端 Inspector 大内容懒加载）
  app.get("/api/blob/:blobRef", (req, res) => {
    const blobRef = req.params["blobRef"] ?? "";
    if (!blobRef || !/^[0-9a-f]{32}$/.test(blobRef)) {
      res.status(400).json({ ok: false, error: "invalid-blob-ref" });
      return;
    }

    const filePath = join(tmpdir(), "dagent-blobs", `${blobRef}.json`);
    readFile(filePath, "utf-8")
      .then((data) => {
        res.setHeader("Content-Type", "application/json");
        res.status(200).send(data);
      })
      .catch(() => {
        res.status(404).json({ ok: false, error: "blob-not-found" });
      });
  });

  // CLI 清除已消费的 gate 决策
  app.delete("/api/gate/decision/:gateId", (req, res) => {
    const incomingToken = req.headers["x-graph-token"];
    if (incomingToken !== token) {
      res.status(401).json({ ok: false, error: "unauthorized" });
      return;
    }

    const gateId = req.params["gateId"] ?? "";
    pendingGateDecisions.delete(gateId);
    res.status(204).end();
  });

  const httpServer = createServer(app);
  const wss = new WebSocketServer({ noServer: true });
  const clients = new Set<WebSocket>();

  httpServer.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const incomingToken = url.searchParams.get("token") ?? "";

    if (incomingToken !== token) {
      socket.write("HTTP/1.1 401 Unauthorized\\r\\n\\r\\n");
      socket.destroy();
      return;
    }

    if (
      req.headers.origin &&
      !String(req.headers.origin).startsWith("http://127.0.0.1") &&
      !String(req.headers.origin).startsWith("http://localhost")
    ) {
      socket.write("HTTP/1.1 403 Forbidden\\r\\n\\r\\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", (ws) => {
    clients.add(ws);

    const pingTimer = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.ping();
      }
    }, 10_000);

    // 接收来自前端的消息（主要是 gate.action 审批操作）
    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(String(raw)) as { type?: string; gateId?: string; action?: string; params?: string };
        if (msg.type === "gate.action" && msg.gateId && msg.action) {
          const decision: GateDecision = {
            action: msg.action as GateDecision["action"],
            params: msg.params
          };
          pendingGateDecisions.set(msg.gateId, decision);
          console.log(`[graph-server] gate.action received gateId=${msg.gateId} action=${msg.action}`);
        }
      } catch {
        // 忽略非 JSON 消息
      }
    });

    ws.on("close", () => {
      clearInterval(pingTimer);
      clients.delete(ws);
    });
  });

  await new Promise<void>((resolve) => {
    httpServer.listen(0, "127.0.0.1", () => resolve());
  });

  const address = httpServer.address();
  const port = typeof address === "object" && address ? address.port : 0;

  return {
    port,
    token,
    ingestUrl: `http://127.0.0.1:${port}/ingest/runtime-event`,
    httpServer,
    publish(event) {
      const payload = JSON.stringify(event);
      console.log(`[graph-server] publish event=${event.eventType} run=${event.runId} clients=${clients.size}`);
      for (const client of clients) {
        if (client.readyState === client.OPEN) {
          client.send(payload);
        }
      }
    },
    registerRuntimeIngestHandler(handler) {
      runtimeIngestHandler = handler;
    },
    getGateDecision(gateId) {
      return pendingGateDecisions.get(gateId);
    },
    clearGateDecision(gateId) {
      pendingGateDecisions.delete(gateId);
    },
    async close() {
      await new Promise<void>((resolve) => {
        wss.close(() => resolve());
      });
      await new Promise<void>((resolve) => {
        httpServer.close(() => resolve());
      });
    }
  };
}
