# RULES — 全局开发规范

> 精炼版，日常编码参考。高频规则见 `RULES_HOT.md`，已知坑见 `ANTI_PATTERNS.md`。

---

## 一、架构分层铁律

### 1.1 分层顺序
```
core（引擎核心）→ domain（领域模型）→ application（应用层）→ infrastructure（基础设施）→ presentation（表现层）
```

- **上层不能 import 下层实现**（core 不 import application/infrastructure/presentation）
- **跨层通信必须通过 `src/contracts/` 定义的接口**
- `src/contracts/` 只允许：Zod Schema、TypeScript interface/type、JSDoc 注释。**零业务实现代码**。

### 1.2 no-restricted-imports 物理护栏
ESLint 配置强制分层，违规在 lint 阶段熔断。不依赖 Code Review 发现架构问题。

### 1.3 DAG 节点生命周期
```
pending → ready → running → {success | fail | skipped | aborted}
```
- 状态转换必须经过 `DagStateStore.transition()`，**禁止直接修改节点状态字段**
- 状态机不可逆：已到终态（success/fail/skipped/aborted）的节点**不能被重置**

---

## 二、接口与类型规范

### 2.1 Zod-First 契约
```typescript
// 1. 先定义 Zod Schema（运行时契约，唯一真相）
export const WalEventSchema = z.object({ ... });
// 2. 用 z.infer 导出类型（永不漂移）
export type WalEvent = z.infer<typeof WalEventSchema>;
```

### 2.2 禁止 as any
- 发现 `as any` 必须报告并给出类型安全替代方案
- 确实无法避免时（如循环依赖），添加 `// eslint-disable-next-line @typescript-eslint/no-explicit-any` 并注明原因

### 2.3 接口文档
每个 export interface/type 必须有 JSDoc `@example` 展示典型用法。

---

## 三、并发与异步

### 3.1 AbortSignal 透传
所有异步操作必须接受并传递 `signal: AbortSignal` 参数：
```typescript
async function fetchData(url: string, signal: AbortSignal): Promise<Data>
```

### 3.2 深拷贝防污染
从 `event.payload` 提取数据前必须深拷贝：
```typescript
const data = structuredClone(event.payload);  // 或 {...event.payload}
```

### 3.3 WAL 禁止单条 INSERT
所有 WAL 写入必须经过 `WeaveWalManager` 队列，**禁止直接调用 `db.prepare().run()`**。

---

## 四、并发信号控制

### 4.1 挂起字典生命周期
`pendingRegistry` 中的 Promise resolve/reject 必须在 `finally` 块清理：
```typescript
try {
  await pendingRegistry.wait(reqId);
} finally {
  pendingRegistry.delete(reqId);  // 确保不泄漏
}
```

### 4.2 WebSocket RPC 必须回包
所有 RPC handler 必须 `try-catch`，`finally` 按 `reqId` 返回响应（成功或失败）：
```typescript
try {
  const result = await handleRpc(req);
  ws.send(JSON.stringify({ reqId, ok: true, data: result }));
} catch (e) {
  ws.send(JSON.stringify({ reqId, ok: false, error: String(e) }));
}
```

---

## 五、测试规范

### 5.1 骨架驱动开发
1. 先写空 `it('Given X, When Y, Then Z')` 骨架
2. 人类设计场景，AI 实现代码
3. 所有 it() 必须有 Given-When-Then 格式描述

### 5.2 测试隔离
- WAL 测试使用内存 SQLite（`:memory:`）
- 不依赖外部网络（mock LLM 客户端）
- 每个 test suite 独立清理状态

### 5.3 覆盖率要求
- core/domain 层 ≥90%
- 整体 ≥80%

---

## 六、提交规范

### 6.1 Conventional Commits（中文）
```
feat(模块名): 中文描述
fix(模块名): 中文描述
refactor(模块名): 中文描述
```

### 6.2 DoD 自检清单
提交前确认：
- [ ] `pnpm lint` → 0 error
- [ ] `pnpm test` → 全绿
- [ ] `pnpm build` → 0 error
- [ ] ANTI_PATTERNS.md 已更新（若发现新坑）

---

## 七、安全规范

### 7.1 命令执行防注入
`command_exec` 工具执行前必须校验：
- 命令在白名单中
- 参数不含 shell 注入字符（`;`、`|`、`&&`、`$()`、反引号）

### 7.2 API Key 保护
- API Key 只从环境变量读取，**禁止硬编码**
- 日志中 mask 所有敏感字段（apiKey、token、password）
- 启动时校验必要环境变量，缺失则友好报错退出

---

## 八、草稿会话清理（幽灵草稿防护）

```typescript
// dagId 键迁移时必须用 finally 保证清理
try {
  store[newId] = await migrateSession(store[oldId]);
} finally {
  delete store[oldId];
}
```
