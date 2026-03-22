/**
 * 文件作用：验证 RPC Pending 状态机语义。
 * 覆盖：未发送不超时、发送后超时、取消语义、成功消费语义。
 */

import { RpcPendingManager } from "../apps/weave-graph-web/src/lib/rpc-pending-manager";

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyUndispatchedNoTimeout(): Promise<void> {
  const manager = new RpcPendingManager(30);
  let rejected = false;

  manager.register("req-undispatched", {
    resolve: () => {},
    reject: () => {
      rejected = true;
    },
    type: "run.subscribe",
    payload: { runId: "r1" }
  });

  await sleep(80);
  assert(!rejected, "未发送请求不应触发超时");
  assert(manager.has("req-undispatched"), "未发送请求应保持 pending");
}

async function verifyDispatchedTimeout(): Promise<void> {
  const manager = new RpcPendingManager(30);
  let rejectedReason = "";

  manager.register("req-timeout", {
    resolve: () => {},
    reject: (reason) => {
      rejectedReason = reason;
    },
    type: "run.subscribe",
    payload: { runId: "r2" }
  });

  manager.markDispatched("req-timeout");
  await sleep(80);

  assert(rejectedReason === "RPC Timeout", "发送后应按超时策略 reject");
  assert(!manager.has("req-timeout"), "超时后请求应移出 pending");
}

async function verifyCancel(): Promise<void> {
  const manager = new RpcPendingManager(50);
  let rejectedReason = "";

  manager.register("req-cancel", {
    resolve: () => {},
    reject: (reason) => {
      rejectedReason = reason;
    },
    type: "start.run",
    payload: { userInput: "x" }
  });

  manager.cancel("req-cancel", "RPC queue overflow");
  await sleep(10);

  assert(rejectedReason === "RPC queue overflow", "取消应透传取消原因");
  assert(!manager.has("req-cancel"), "取消后请求应移出 pending");
}

async function verifyConsumeSuccess(): Promise<void> {
  const manager = new RpcPendingManager(50);
  let resolved = false;

  manager.register("req-success", {
    resolve: () => {
      resolved = true;
    },
    reject: () => {},
    type: "run.abort",
    payload: { runId: "r3" }
  });

  manager.markDispatched("req-success");
  const entry = manager.consume("req-success");
  entry?.resolve({ ok: true });

  await sleep(20);
  assert(resolved, "consume 后应可正常 resolve");
  assert(!manager.has("req-success"), "consume 后请求应移出 pending");
}

async function main(): Promise<void> {
  await verifyUndispatchedNoTimeout();
  await verifyDispatchedTimeout();
  await verifyCancel();
  await verifyConsumeSuccess();

  console.log("RPC pending verification passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
