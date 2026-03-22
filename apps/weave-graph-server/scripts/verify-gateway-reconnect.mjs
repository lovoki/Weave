/**
 * 文件作用：网关重连回放验证脚本。
 * 覆盖断开后重连订阅、游标增量回放与跨连接 run.abort 语义。
 */

import WebSocket from "ws";
import { createGraphGateway } from "../dist/weave-graph-server/src/gateway/ws-gateway.js";

async function openClient(port, token) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/?token=${token}`);
  const inbox = [];

  ws.on("message", (raw) => {
    inbox.push(JSON.parse(String(raw)));
  });

  await new Promise((resolve, reject) => {
    ws.once("open", resolve);
    ws.once("error", reject);
  });

  return { ws, inbox };
}

async function waitRpc(inbox, reqId, timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const hit = inbox.find((msg) => msg.eventType === "server.response" && msg.reqId === reqId);
    if (hit) {
      return hit;
    }
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
  throw new Error(`RPC timeout: ${reqId}`);
}

async function main() {
  const gateway = await createGraphGateway();

  // 连接 A：启动 run，并记录 run.start 的 eventId（后续用于增量订阅游标）。
  const clientA = await openClient(gateway.port, gateway.token);

  clientA.ws.send(JSON.stringify({
    type: "start.run",
    reqId: "req-start",
    payload: {
      userInput: "reconnect-test",
      sessionId: "session-reconnect",
      clientRequestId: "cid-reconnect"
    }
  }));

  const startResp = await waitRpc(clientA.inbox, "req-start");
  if (!startResp.ok || !startResp.payload?.runId) {
    throw new Error("start.run 应返回 runId");
  }

  const runId = startResp.payload.runId;
  const runStart = clientA.inbox.find((msg) => msg.eventType === "run.start" && msg.runId === runId);
  if (!runStart?.eventId) {
    throw new Error("run.start 必须包含 eventId");
  }

  clientA.ws.close();

  // 连接 B：模拟重连后按游标订阅，应暂时无新增事件；随后发起 abort。
  const clientB = await openClient(gateway.port, gateway.token);

  clientB.ws.send(JSON.stringify({
    type: "run.subscribe",
    reqId: "req-sub-before-abort",
    payload: {
      runId,
      lastEventId: runStart.eventId
    }
  }));

  const subBeforeAbort = await waitRpc(clientB.inbox, "req-sub-before-abort");
  if (!subBeforeAbort.ok || typeof subBeforeAbort.payload?.replayedCount !== "number") {
    throw new Error("重连后 run.subscribe 应返回 replayedCount");
  }
  if (subBeforeAbort.payload.replayedCount !== 0) {
    throw new Error("abort 前游标增量回放应为 0");
  }

  clientB.ws.send(JSON.stringify({
    type: "run.abort",
    reqId: "req-abort",
    payload: { runId }
  }));

  const abortResp = await waitRpc(clientB.inbox, "req-abort");
  if (!abortResp.ok || abortResp.payload?.status !== "aborted") {
    throw new Error("跨连接 run.abort 应返回 status=aborted");
  }

  clientB.ws.close();

  // 连接 C：再次重连并按同一游标订阅，应回放到 run.end。
  const clientC = await openClient(gateway.port, gateway.token);

  clientC.ws.send(JSON.stringify({
    type: "run.subscribe",
    reqId: "req-sub-after-abort",
    payload: {
      runId,
      lastEventId: runStart.eventId
    }
  }));

  const subAfterAbort = await waitRpc(clientC.inbox, "req-sub-after-abort");
  if (!subAfterAbort.ok || typeof subAfterAbort.payload?.replayedCount !== "number") {
    throw new Error("abort 后 run.subscribe 应返回 replayedCount");
  }
  if (subAfterAbort.payload.replayedCount < 1) {
    throw new Error("重连后应至少回放 run.end 事件");
  }

  const replayedRunEnd = clientC.inbox.find((msg) => msg.eventType === "run.end" && msg.runId === runId);
  if (!replayedRunEnd) {
    throw new Error("重连订阅后应收到 run.end");
  }

  clientC.ws.close();
  await gateway.close();

  console.log("Gateway reconnect verification passed.", {
    runId,
    replayedCountBeforeAbort: subBeforeAbort.payload.replayedCount,
    replayedCountAfterAbort: subAfterAbort.payload.replayedCount
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
