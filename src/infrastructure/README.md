# infrastructure — 基础设施层

## 职责
- LLM 客户端实现（llm/qwen-client）
- 工具实现（tools/）
- WAL 数据库（wal/：weave-db、wal-dao、weave-wal-manager）
- 存储（storage/：blob-store、snapshot-store）
- 日志（logging/app-logger）
- 记忆（memory/memory-store）

## 分层规则
- **infrastructure 实现 `src/contracts/` 中的接口**
- **infrastructure 不能被 core、domain 直接 import**（通过依赖注入）
- **presentation 层从 infrastructure 获取已初始化的实例**

## 测试
见 `src/infrastructure/__tests__/`，WAL 测试使用内存 SQLite（`:memory:`）。
