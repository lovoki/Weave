/*
 * 文件作用：后端入口骨架，连接 Runtime 事件源 -> GraphProjector -> WS 网关。
 */

import { GraphProjector, type RuntimeRawEvent } from "./projection/graph-projector.js";
import { createGraphGateway } from "./gateway/ws-gateway.js";
import { createRuntimeBridge } from "./runtime/runtime-bridge.js";

async function main(): Promise<void> {
  const projector = new GraphProjector();
  const gateway = await createGraphGateway();

  // 注册二次校验钩子 (Double Validation)
  // 后续可进一步接入 ToolRegistry 进行 Schema 校验
  gateway.registerValidationHandler(async (nodeId, params) => {
    try {
      JSON.parse(params);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: `后端校验失败：无效的 JSON 格式 (${String(e)})` };
    }
  });

  console.log(`[graph-server] ws://127.0.0.1:${gateway.port}/?token=${gateway.token}`);
  console.log(`[graph-server] ingest=${gateway.ingestUrl} token=${gateway.token}`);

  // 这里应替换为真实 Runtime 事件订阅：
  // runtime.on("event", (evt) => forward(evt))
  const forward = (evt: RuntimeRawEvent): void => {
    const graphEvents = projector.project(evt);
    for (const graphEvent of graphEvents) {
      gateway.publish(graphEvent);
    }
  };

  const runtimeBridge = await createRuntimeBridge({
    onRuntimeEvent: forward
  });

  gateway.registerRuntimeIngestHandler(forward);
  gateway.registerRunCommandHandlers({
    startRun: async (payload) => runtimeBridge.startRun({
      userInput: payload.userInput,
      sessionId: payload.sessionId ?? "",
      clientRequestId: payload.clientRequestId
    }),
    abortRun: async (runId) => runtimeBridge.abortRun(runId),
    replayRunEvents: async (runId) => {
      if (!runtimeBridge.loadRunEvents) {
        return null;
      }
      const loaded = await runtimeBridge.loadRunEvents(runId);
      if (!loaded) {
        return null;
      }

      // 使用独立 projector 重放，保证序号从 run 起点稳定重建。
      const replayProjector = new GraphProjector();
      const rebuilt = loaded.events.flatMap((evt) => replayProjector.project(evt));
      return rebuilt;
    }
  });
}

main().catch((error) => {
  console.error("[graph-server] failed", error);
  process.exitCode = 1;
});
