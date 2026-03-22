import { WeaveDb } from '../src/infrastructure/wal/weave-db.js';
import { WalDao } from '../src/infrastructure/wal/wal-dao.js';
import { WeaveWalManager } from '../src/infrastructure/wal/weave-wal-manager.ts';
import { WeaveEventBus } from '../src/domain/event/event-bus.ts';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { parse } from 'flatted';

async function main() {
  const testDbPath = path.join(process.cwd(), '.dagent', 'test-wal-interceptor.db');
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

  const weaveDb = new WeaveDb(testDbPath);
  const dao = new WalDao(weaveDb);

  // 0. 满足外键约束
  dao.upsertSession({ id: 'session-123', title: '验证会话' });
  dao.insertExecution({ id: 'run-001', session_id: 'session-123', status: 'RUNNING' });

  const walManager = new WeaveWalManager(dao, 'session-123');

  // 1. 初始化总线并挂载拦截器
  let lastForwardedEvent: any = null;
  const bus = new WeaveEventBus(
    { runId: 'run-001', sessionId: 'session-123', turnIndex: 1 },
    (e) => { lastForwardedEvent = e; },
    walManager
  );

  console.log('1. 测试大文本剥离与黑板存储...');
  const largeText = 'A'.repeat(500); // 超过 200 字符
  bus.dispatch('llm.completed', { finalText: largeText, nodeId: 'llm-1' });

  // 立即刷盘
  walManager.flush();

  const walEvents = dao.getExecutionWalEvents('run-001');
  console.log('   调试: 查找到的 WAL 事件数量:', walEvents.length);
  
  const lastWal = walEvents[walEvents.length - 1];
  console.log('   调试: 最后一条事件类型:', lastWal.event_type);
  
  const payload = parse(lastWal.payload);
  console.log('   调试: Payload 内容:', payload);

  if (!payload.finalText || !payload.finalText.startsWith('[[REF:bb_run-001')) {
    throw new Error(`大文本剥离失败，Payload 为: ${JSON.stringify(payload)}`);
  }
  console.log('   OK: WAL 日志已轻量化，引用 ID 为:', payload.finalText);

  const bbId = payload.finalText.replace('[[REF:', '').replace(']]', '');
  const bbMsg = dao.getBlackboardMessage(bbId);
  if (!bbMsg || bbMsg.content !== largeText) {
    throw new Error('黑板消息存储失败或内容不匹配');
  }
  console.log('   OK: 黑板消息已成功持久化，角色为:', bbMsg.role);

  console.log('2. 测试拓扑边自动记录...');
  // CTE 查询依赖于 wal_event 中存在对应 node_id 的记录
  bus.dispatch('engine.node.transition', { nodeId: 'node-1', toStatus: 'success' });
  bus.dispatch('engine.edge.created', { fromId: 'node-1', toId: 'node-2', kind: 'dependency' });
  walManager.flush();
  
  const ancestorEvents = dao.getAncestorsWalEvents('run-001', 'node-2');
  console.log('   调试: node-2 的祖先事件数量:', ancestorEvents.length);
  if (!ancestorEvents.some(e => e.node_id === 'node-1')) {
    throw new Error('拓扑边记录失败，CTE 无法识别祖先');
  }
  console.log('   OK: 拓扑边已实时入库，血缘查询生效');

  console.log('3. 测试防守型拷贝 (Memory Safety)...');
  const originalPayload = { text: 'Hello', nodeId: 'node-3' };
  bus.dispatch('llm.delta', originalPayload);
  if (originalPayload.nodeId !== 'node-3') {
    throw new Error('内存安全失败，原始 payload 被篡改');
  }
  console.log('   OK: 内存数据安全，未受拦截器副作用影响');

  walManager.destroy();
  weaveDb.close();
  console.log('\n✅ WeaveWalManager 拦截器验证全部通过！');
}

main().catch(err => {
  console.error('\n❌ 验证失败:', err);
  process.exit(1);
});
