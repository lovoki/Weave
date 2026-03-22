/**
 * 文件作用：网关 RPC 集成验证，覆盖 start.run / run.subscribe / run.abort / AGENT_BUSY 关键语义。
 */

import WebSocket from "ws";
import { createGraphGateway } from "../dist/weave-graph-server/src/gateway/ws-gateway.js";

async function main() {
  const gateway = await createGraphGateway();
  const ws = new WebSocket(`ws://127.0.0.1:${gateway.port}/?token=${gateway.token}`);
  const inbox = [];

  ws.on("message", (raw) => {
    inbox.push(JSON.parse(String(raw)));
  });

  await new Promise((resolve, reject) => {
    ws.once("open", resolve);
    ws.once("error", reject);
  });
  // 避免极端时序下首条消息早于服务端 message 监听挂载。
  await new Promise((resolve) => setTimeout(resolve, 80));

  const waitRpc = async (reqId, timeoutMs = 4000) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const found = inbox.find((msg) => msg.eventType === "server.response" && msg.reqId === reqId);
      if (found) {
        return found;
      }
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
    throw new Error(`RPC timeout: ${reqId}`);
  };

  ws.send(JSON.stringify({
    type: "start.run",
    reqId: "req-start-1",
    payload: {
      userInput: "task-1",
      sessionId: "session-A",
      clientRequestId: "cid-1"
    }
  }));

  const startResp = await waitRpc("req-start-1");
  if (!startResp.ok || !startResp.payload?.runId) {
    throw new Error("start.run 第一次请求应成功并返回 runId");
  }
  const runId = startResp.payload.runId;

  ws.send(JSON.stringify({
    type: "start.run",
    reqId: "req-start-2",
    payload: {
      userInput: "task-2",
      sessionId: "session-A",
      clientRequestId: "cid-2"
    }
  }));

  const busyResp = await waitRpc("req-start-2");
  if (busyResp.ok || busyResp.payload?.code !== "AGENT_BUSY") {
    throw new Error("同 session 第二次 start.run 应返回 AGENT_BUSY");
  }

  const runStartEvent = inbox.find((msg) => msg.eventType === "run.start" && msg.runId === runId);
  if (!runStartEvent?.eventId) {
    throw new Error("run.start 事件必须携带 eventId");
  }

  ws.send(JSON.stringify({
    type: "run.subscribe",
    reqId: "req-sub-before-abort",
    payload: {
      runId,
      lastEventId: runStartEvent.eventId
    }
  }));

  const subBeforeAbortResp = await waitRpc("req-sub-before-abort");
  if (!subBeforeAbortResp.ok || typeof subBeforeAbortResp.payload?.replayedCount !== "number") {
    throw new Error("run.subscribe 应返回 replayedCount");
  }

  ws.send(JSON.stringify({
    type: "run.abort",
    reqId: "req-abort-1",
    payload: {
      runId
    }
  }));

  const abortResp = await waitRpc("req-abort-1");
  if (!abortResp.ok || abortResp.payload?.status !== "aborted") {
    throw new Error("run.abort 应返回 status=aborted");
  }

  const runEndEvent = inbox.find((msg) => msg.eventType === "run.end" && msg.runId === runId);
  if (!runEndEvent) {
    throw new Error("run.abort 后必须广播 run.end");
  }

  ws.send(JSON.stringify({
    type: "run.subscribe",
    reqId: "req-sub-after-abort",
    payload: {
      runId,
      lastEventId: runStartEvent.eventId
    }
  }));

  const subAfterAbortResp = await waitRpc("req-sub-after-abort");
  if (!subAfterAbortResp.ok || typeof subAfterAbortResp.payload?.replayedCount !== "number") {
    throw new Error("run.subscribe（abort 后）应返回 replayedCount");
  }
  if (subAfterAbortResp.payload.replayedCount < 1) {
    throw new Error("run.subscribe 应在游标后至少回放 run.end 事件");
  }

  ws.send(JSON.stringify({
    type: "run.subscribe",
    reqId: "req-sub-invalid-cursor",
    payload: {
      runId,
      lastEventId: `${runId}:not-exists`
    }
  }));

  const invalidCursorResp = await waitRpc("req-sub-invalid-cursor");
  if (invalidCursorResp.ok || invalidCursorResp.payload?.code !== "RESYNC_REQUIRED") {
    throw new Error("run.subscribe 在无效游标下应返回 RESYNC_REQUIRED");
  }

  ws.close();
  await gateway.close();

  console.log("Gateway RPC verification passed.", {
    runId,
    replayedCountBeforeAbort: subBeforeAbortResp.payload.replayedCount,
    replayedCountAfterAbort: subAfterAbortResp.payload.replayedCount,
    invalidCursorCode: invalidCursorResp.payload.code
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
