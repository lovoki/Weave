import { AgentRuntime } from '../src/application/agent/run-agent.ts';
import { WalDao } from '../src/infrastructure/wal/wal-dao.js';
import { WeaveDb } from '../src/infrastructure/wal/weave-db.js';
import * as path from 'node:path';
import * as fs from 'node:fs';

async function main() {
  console.log('🚀 开始系统级 WAL 持久化验证...');

  // 1. 准备测试环境
  const dbPath = path.join(process.cwd(), '.dagent', 'weave.db');
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

  const llmConfig = {
    provider: 'openai',
    model: 'gpt-4o',
    apiKey: 'sk-test',
    endpoint: 'https://api.openai.com/v1'
  };

  const runtime = new AgentRuntime(llmConfig as any);
  
  // 注入一个模拟的 chat 方法，避免真实调用 API
  (runtime as any).llmClient.chat = async () => '这是一个非常长的模拟回复，旨在触发黑板剥离逻辑。' + 'A'.repeat(300);

  const sessionId = 'sys-test-session';
  runtime.startSession(sessionId);

  console.log('2. 执行一次 Agent Run...');
  await runtime.runOnceStream('你好，请帮我生成一段长文本。', { stepMode: false });

  console.log('3. 检查 SQLite 持久化结果...');
  const weaveDb = new WeaveDb(dbPath);
  const dao = new WalDao(weaveDb);

  const session = dao.getSession(sessionId);
  console.log('   Session 记录:', session);
  if (!session || !session.head_execution_id) {
    throw new Error('Session 或 Head 指针未持久化');
  }

  const execId = session.head_execution_id;
  const execution = dao.getExecution(execId);
  console.log('   Execution 状态:', execution?.status);
  if (execution?.status !== 'COMPLETED') {
    throw new Error('Execution 终态未正确更新');
  }

  const events = dao.getExecutionWalEvents(execId);
  console.log('   WAL 事件数量:', events.length);
  if (events.length < 5) {
    throw new Error('WAL 事件记录不足，可能存在丢失');
  }

  const hasBlackboardRef = events.some(e => e.payload.includes('[[REF:bb_'));
  console.log('   是否包含黑板引用:', hasBlackboardRef);
  if (!hasBlackboardRef) {
    throw new Error('黑板剥离逻辑未生效');
  }

  console.log('\n✅ 系统级 WAL 持久化验证全部通过！');
  weaveDb.close();
}

main().catch(err => {
  console.error('\n❌ 系统验证失败:', err);
  process.exit(1);
});
