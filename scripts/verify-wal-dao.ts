import { WeaveDb } from '../src/infrastructure/wal/weave-db.js';
import { WalDao } from '../src/infrastructure/wal/wal-dao.js';
import * as path from 'node:path';
import * as fs from 'node:fs';

/**
 * 验证脚本：测试 WAL DAO 的基础功能及核心 CTE 拓扑血缘查询。
 */
async function main() {
  const testDbPath = path.join(process.cwd(), '.dagent', 'test-weave.db');
  
  // 清理旧测试数据
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
    const walFile = `${testDbPath}-wal`;
    const shmFile = `${testDbPath}-shm`;
    if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
    if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);
  }

  const weaveDb = new WeaveDb(testDbPath);
  const dao = new WalDao(weaveDb);

  console.log('1. 测试 Session Upsert 与 Head 指针...');
  dao.upsertSession({ id: 's1', title: '测试会话', head_execution_id: 'exec_v1' });
  const s = dao.getSession('s1');
  if (s?.head_execution_id !== 'exec_v1') throw new Error('Session head_execution_id 匹配失败');
  console.log('   OK: Session Head 已正确设置为', s.head_execution_id);

  console.log('2. 测试 Execution 插入...');
  dao.insertExecution({ id: 'exec_v1', session_id: 's1', status: 'RUNNING' });
  const e = dao.getExecution('exec_v1');
  if (!e) throw new Error('Execution 插入失败');
  console.log('   OK: Execution 已创建');

  console.log('3. 测试边插入与 CTE 拓扑血缘过滤...');
  // 构造拓扑：A -> B -> C，独立节点 D -> E
  dao.insertEdge('exec_v1', 'node-a', 'node-b', 'dependency');
  dao.insertEdge('exec_v1', 'node-b', 'node-c', 'dependency');
  dao.insertEdge('exec_v1', 'node-d', 'node-e', 'dependency');

  // 插入模拟日志
  dao.insertWalEvent({ execution_id: 'exec_v1', node_id: 'node-a', event_type: 'NODE_COMPLETED', payload: '{"val": "a"}' });
  dao.insertWalEvent({ execution_id: 'exec_v1', node_id: 'node-b', event_type: 'NODE_COMPLETED', payload: '{"val": "b"}' });
  dao.insertWalEvent({ execution_id: 'exec_v1', node_id: 'node-c', event_type: 'NODE_COMPLETED', payload: '{"val": "c"}' });
  dao.insertWalEvent({ execution_id: 'exec_v1', node_id: 'node-d', event_type: 'NODE_COMPLETED', payload: '{"val": "d"}' });
  dao.insertWalEvent({ execution_id: 'exec_v1', node_id: null, event_type: 'DAG_STARTED', payload: '{}' });

  console.log('   查询节点 node-c 的所有祖先日志 (预期应包含 a, b, c 及全局 null 日志)...');
  const events = dao.getAncestorsWalEvents('exec_v1', 'node-c');
  const nodeIds = events.map(ev => ev.node_id);
  
  console.log('   查询结果:', nodeIds);
  
  if (!nodeIds.includes('node-a') || !nodeIds.includes('node-b') || !nodeIds.includes('node-c')) {
    throw new Error('CTE 祖先节点查找遗漏');
  }
  if (nodeIds.includes('node-d')) {
    throw new Error('CTE 错误地包含了无关并行分支节点 node-d');
  }
  
  console.log('   OK: CTE 拓扑过滤算法完全正确！');

  weaveDb.close();
  console.log('\n✅ WAL DAO 基础验证全部通过！');
}

main().catch(err => {
  console.error('\n❌ 验证失败:', err);
  process.exit(1);
});
