/*
 * 文件作用：提供本地 WS 网关，按会话 token 广播图协议事件。
 */

import { createServer, type Server as HttpServer } from "node:http";
import { randomBytes } from "node:crypto";
import express from "express";
import { WebSocketServer, type WebSocket } from "ws";
import type { GraphEnvelope } from "../protocol/graph-events.js";

export interface GraphGateway {
  port: number;
  token: string;
  publish(event: GraphEnvelope<unknown>): void;
  close(): Promise<void>;
  httpServer: HttpServer;
}

export async function createGraphGateway(staticDir?: string): Promise<GraphGateway> {
  const app = express();
  if (staticDir) {
    app.use(express.static(staticDir));
  }

  const token = randomBytes(16).toString("hex");
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

    if (req.headers.origin && !String(req.headers.origin).startsWith("http://127.0.0.1")) {
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
    httpServer,
    publish(event) {
      const payload = JSON.stringify(event);
      for (const client of clients) {
        if (client.readyState === client.OPEN) {
          client.send(payload);
        }
      }
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
