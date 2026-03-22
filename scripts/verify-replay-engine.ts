import { WeaveDb } from '../src/infrastructure/wal/weave-db.js';
import { WalDao } from '../src/infrastructure/wal/wal-dao.js';
import { WeaveWalManager } from '../src/infrastructure/wal/weave-wal-manager.ts';
import { WeaveEventBus } from '../src/domain/event/event-bus.ts';
import { DagReplayEngine } from '../src/infrastructure/wal/replay-engine.ts';
import * as path from 'node:path';
import * as fs from 'node:fs';

async function main() {
  const testDbPath = path.join(process.cwd(), '.dagent', 'test-replay.db');
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

  const weaveDb = new WeaveDb(testDbPath);
  const dao = new WalDao(weaveDb);
  const replayEngine = new DagReplayEngine(dao);

  console.log('1. 构造原始执行 (exec-v1): A -> B -> C ...');
  dao.upsertSession({ id: 's1', title: '回溯测试' });
  dao.insertExecution({ id: 'exec-v1', session_id: 's1', status: 'COMPLETED' });

  const walManager = new WeaveWalManager(dao, 's1');
  const bus = new WeaveEventBus(
    { runId: 'exec-v1', sessionId: 's1', turnIndex: 1 },
    () => {},
    walManager
  );

  // 模拟生命周期
  const largeOutput = 'LLM Output ' + 'A'.repeat(300);
  bus.dispatch('engine.node.created', { nodeId: 'A', nodeType: 'input' });
  bus.dispatch('engine.node.created', { nodeId: 'B', nodeType: 'llm' });
  bus.dispatch('engine.node.created', { nodeId: 'C', nodeType: 'tool' });
  bus.dispatch('engine.edge.created', { fromId: 'A', toId: 'B', kind: 'dependency' });
  bus.dispatch('engine.edge.created', { fromId: 'B', toId: 'C', kind: 'dependency' });
  
  bus.dispatch('engine.node.transition', { nodeId: 'A', toStatus: 'success' });
  bus.dispatch('engine.node.transition', { nodeId: 'B', toStatus: 'success', updatedPayload: { output: { ok: true, content: largeOutput } } });
  bus.dispatch('engine.node.transition', { nodeId: 'C', toStatus: 'fail' });

  walManager.flush();

  console.log('2. 触发分叉 (Fork at Node B) -> exec-v2 ...');
  const { dag, stateStore } = await replayEngine.fork('exec-v1', 'B', 'exec-v2');

  console.log('3. 验证重构结果...');
  
  const nodes = dag.getNodeIds();
  console.log('   重构后的节点:', nodes);
  if (nodes.includes('C')) {
    throw new Error('截断失败：新分支不应包含节点 C');
  }
  if (!nodes.includes('A') || !nodes.includes('B')) {
    throw new Error('重构失败：节点 A 或 B 缺失');
  }
  console.log('   OK: 拓扑血缘截断正确');

  const nodeB = dag.getNode('B');
  if (nodeB.status !== 'success') {
    throw new Error('状态恢复失败：节点 B 状态应为 success');
  }
  console.log('   OK: 节点状态恢复正确');

  const outputB = stateStore.getNodeOutput('B');
  if (!outputB || typeof outputB.content !== 'string' || !outputB.content.startsWith('LLM Output')) {
    throw new Error('数据重构失败：无法从黑板恢复大文本输出');
  }
  console.log('   OK: 成功从黑板还原大文本数据 (长度:', outputB.content.length, ')');

  const session = dao.getSession('s1');
  if (session?.head_execution_id !== 'exec-v2') {
    throw new Error('Session Head 更新失败');
  }
  console.log('   OK: Session Head 已自动切换至新分支 exec-v2');

  walManager.destroy();
  weaveDb.close();
  console.log('\n✅ DagReplayEngine 验证全部通过！');
}

main().catch(err => {
  console.error('\n❌ 验证失败:', err);
  process.exit(1);
});
