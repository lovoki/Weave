# core — 引擎核心层

## 职责
- DAG 状态机与执行引擎（dag-executor、dag-graph、state-store）
- 引擎事件总线接口（engine-event-bus）
- 节点类型定义（node-types）
- 端口接口（ports/：logger、blob-store、memory-store、tool-registry）

## 分层规则
- **core 只能 import core 内部模块**
- **禁止 import application、infrastructure、presentation 层**
- 跨层通信通过 `src/contracts/` 接口（no-restricted-imports ESLint 规则强制）

## 测试
见 `src/core/__tests__/`，所有测试使用 Given-When-Then 格式。
