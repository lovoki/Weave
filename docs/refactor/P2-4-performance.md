# [P2-4] 性能优化

## 目标（可测量）
WAL 批量写入，快照 LRU 缓存命中率 ≥80%，无 SQLite BUSY 锁争用

## 执行步骤
- [ ] 确认 WAL 模式已开启（`PRAGMA journal_mode=WAL`）
- [ ] 为高频查询字段添加索引（sessionId, dagId, timestamp）
- [ ] SnapshotStore 添加 LRU 缓存（最近 N 个快照，TTL 5 分钟）
- [ ] 连接池：确认 WAL 读写分离

## Definition of Done
- [ ] 压测：1000 条 WAL 事件写入 <500ms
- [ ] 快照读取：LRU 命中时 <5ms
- [ ] 无 SQLITE_BUSY 错误
