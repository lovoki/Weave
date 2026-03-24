# application — 应用层

## 职责
- 智能体运行时主循环（agent/run-agent）
- 插件系统（agent/plugins/、agent/plugin-manager、agent/plugin-executor）
- 端口接口（ports/：llm-client、wal-dao）
- 会话上下文（session/run-context）
- Weave 插件（weave/weave-plugin）

## 分层规则
- **application 可以 import core、domain、application 内部模块**
- **禁止 import presentation 层**
- **infrastructure 实现通过 `src/contracts/` 接口注入（依赖反转）**

## 测试
见 `src/application/__tests__/`，使用 mock ILlmClient 和 IToolRegistry，不依赖真实网络。
