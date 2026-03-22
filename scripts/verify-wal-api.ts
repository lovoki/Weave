import { WeaveDb } from '../src/infrastructure/wal/weave-db.js';
import { WalDao } from '../src/infrastructure/wal/wal-dao.js';
import { DagReplayEngine } from '../src/infrastructure/wal/replay-engine.js';
import { WalApiService } from '../src/infrastructure/wal/wal-api-service.js';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { stringify } from 'flatted';

/**
 * 验证脚本：模拟前端通过 WalApiService 进行时空穿梭交互。
 */
async function main() {
  const dbPath = path.join(process.cwd(), '.dagent', 'test-api.db');
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

  const weaveDb = new WeaveDb(dbPath);
  const dao = new WalDao(weaveDb);
  const replayEngine = new DagReplayEngine(dao);
  const api = new WalApiService(dao, replayEngine);

  console.log('1. 模拟前端分页获取会话...');
  dao.upsertSession({ id: 's1', title: '会话 1' });
  await new Promise(r => setTimeout(r, 1100)); 
  dao.upsertSession({ id: 's2', title: '会话 2' });
  
  const { sessions, nextCursor } = api.getSessions(undefined, 1);
  console.log('   第一页 (Limit 1):', sessions.map(s => s.id));
  if (sessions.length !== 1 || !nextCursor) throw new Error('Session 分页逻辑失败');

  const { sessions: sessions2 } = api.getSessions(nextCursor, 1);
  console.log('   第二页 (Limit 1):', sessions2.map(s => s.id));
  if (sessions2.length !== 1 || sessions2[0].id !== 's1') throw new Error('Session Cursor 跳转失败');
  console.log('   OK: 分页与 Cursor 逻辑完全正确');

  console.log('2. 模拟前端获取轻量化图快照 DTO...');
  dao.insertExecution({ id: 'exec-1', session_id: 's1', status: 'COMPLETED' });
  
  // 模拟 WAL 事件流 (使用 flatted.stringify)
  dao.insertWalEvent({ 
    execution_id: 'exec-1', 
    node_id: 'A', 
    event_type: 'engine.node.created', 
    payload: stringify({ nodeId: 'A', nodeType: 'input', payload: { status: 'success' } }) 
  });
  dao.insertWalEvent({ 
    execution_id: 'exec-1', 
    node_id: 'B', 
    event_type: 'engine.node.created', 
    payload: stringify({ nodeId: 'B', nodeType: 'llm', payload: { status: 'pending' } }) 
  });
  
  dao.insertEdge('exec-1', 'A', 'B', 'dependency');

  const snapshot = await api.reconstructExecutionSnapshot('exec-1');
  console.log('   DTO 节点数量:', snapshot.nodes.length);
  console.log('   DTO 边数量:', snapshot.edges.length);
  
  if (snapshot.nodes.length !== 2 || snapshot.edges.length !== 1) {
    throw new Error('DTO 重构数据不完整');
  }
  console.log('   OK: 成功输出轻量级 DTO，防阻塞逻辑通过');

  console.log('3. 模拟防竞态 Fork 流程...');
  const newExecId = await api.forkExecution('s1', 'exec-1', 'A');
  console.log('   Fork 产生的新执行 ID:', newExecId);
  
  const forkRecord = dao.getExecution(newExecId);
  if (!forkRecord || forkRecord.parent_execution_id !== 'exec-1') {
    throw new Error('Fork 记录持久化失败');
  }
  console.log('   OK: 分步 Fork 逻辑正确，已具备防竞态基础');

  weaveDb.close();
  console.log('\n✅ WalApiService 预留接口验证全部通过！');
}

main().catch(err => {
  console.error('\n❌ API 验证失败:', err);
  process.exit(1);
});
