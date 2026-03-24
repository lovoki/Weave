# ANTI_PATTERNS（结构化错题本）

> 从 dev-log 迁移，结构化记录已踩过的坑。每次发现新坑必须追加。
> 格式：`[E-XXX] 标题` → 触发条件 → 错误特征 → 强制规则 → 检测方式

---

## 领域：WebSocket / 网络

### [E-001] WebSocket RPC 业务异常未返回失败回包
**触发条件**：ws-gateway handler 抛异常时只打 log，不返回响应
**错误特征**：前端 pending RPC 请求永远不 resolve，UI 悬挂，无超时提示
**强制规则**：所有 RPC handler 必须 `try-catch`，`finally` 按 `reqId` 返回 `{ok:false, error}`
**检测方式**：搜索 `ws.on('message')` → 检查是否有 `finally` 回包

```typescript
// ✅ 正确
try {
  const result = await handleRpc(req);
  ws.send(JSON.stringify({ reqId, ok: true, data: result }));
} catch (e) {
  ws.send(JSON.stringify({ reqId, ok: false, error: String(e) }));
}
// ❌ 错误：只有 try 没有 catch 回包
```

---

## 领域：环境配置

### [E-002] 子目录启动时 .env 加载路径错误
**触发条件**：从 `apps/` 子目录 `pnpm dev`，dotenv 默认相对路径找不到根 `.env`
**错误特征**：`Missing API key` 错误，但 `.env` 明明存在于项目根目录
**强制规则**：统一使用 `path.resolve(process.cwd(), '../../.env')` 或显式 `--env-file` 参数
**检测方式**：`grep -r 'dotenv.config()' src/ apps/` → 检查是否有路径参数

---

## 领域：状态管理 / 草稿会话

### [E-003] 草稿会话未清理（幽灵草稿）
**触发条件**：`createDraftRun` 后 `run.start` 迁移失败，旧 `dagId` 留存于 store
**错误特征**：UI 同时显示两个会话节点，用户困惑
**强制规则**：`dagId` 键迁移时必须 `delete store[oldId]`，用 `finally` 保证执行
**检测方式**：搜索 `createDraftRun` / `dagId =` → 确认 `finally` 块存在

```typescript
// ✅ 正确
try {
  store[newId] = await migrateSession(store[oldId]);
} finally {
  delete store[oldId];  // 无论成功失败都清理
}
```

---

## 领域：DAG / 异步竞态

### [E-004] 快照端口数据序列倒流
**触发条件**：异步 `hydrateSnapshot` 返回时机晚于同步广播，旧数据覆盖新状态
**错误特征**：端口数据间歇性不显示，刷新后恢复
**强制规则**：使用版本令牌（version token）防止过期响应覆盖最新状态
**检测方式**：搜索 `hydrateSnapshot` 调用 → 确认有版本号比较

```typescript
// ✅ 正确：版本令牌防止竞态
const token = ++this.hydrateToken;
const snapshot = await hydrateSnapshot(id);
if (token !== this.hydrateToken) return;  // 过期，丢弃
applySnapshot(snapshot);
```

---

## 领域：WAL / 数据库

### [E-005] WAL 直接单条 INSERT（严禁）
**触发条件**：事件处理函数直接 `db.prepare().run()`，不经队列
**错误特征**：高并发下 SQLite `BUSY` 锁争用，写入丢失，日志不连续
**强制规则**：所有 WAL 写入通过 `WeaveWalManager` 队列，事务批量刷盘
**检测方式**：`grep -r 'db.prepare' src/` → 非 `WeaveWalManager` 内部调用即违规

---

## 领域：类型系统

### [E-006] as any 掩盖真实类型错误
**触发条件**：遇到类型不匹配时用 `as any` 强制转换，跳过编译器检查
**错误特征**：运行时 `undefined is not a function`，编译阶段无报错
**强制规则**：禁止 `as any`；确实需要时用 `as unknown as TargetType` 并添加注释说明原因
**检测方式**：`grep -r 'as any' src/` → 每一处都需要审查

---

## 领域：插件 / 拦截器

### [E-007] 插件钩子抛异常导致主流程中断
**触发条件**：`beforeToolExecution` / `afterToolExecution` 钩子内部错误未被捕获
**错误特征**：工具执行挂起，用户无任何提示
**强制规则**：插件执行必须包裹在 `try-catch` 中，异常只记录日志，不传播到主流程
**检测方式**：搜索 `plugin.beforeToolExecution(` / `plugin.afterToolExecution(` → 确认有 `try-catch`

---

## 领域：前端 / React

### [E-008] Dagre 布局在主线程阻塞渲染
**触发条件**：节点数量 >200 时，Dagre 布局计算在主线程同步执行
**错误特征**：UI 卡顿，FPS 下降到 <10，交互无响应
**强制规则**：Dagre 计算必须在 Web Worker 中执行（见 P1-3 计划）
**检测方式**：Chrome DevTools Performance → 检查主线程是否有长任务（>50ms）
