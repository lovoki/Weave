# domain — 领域模型层

## 职责
- 领域事件类型定义（event/event-types）
- 领域节点模型（nodes/）

## 分层规则
- **domain 只能 import core 和 domain 内部模块**
- **禁止 import application、infrastructure、presentation 层**
- 跨层通信通过 `src/contracts/` 接口（no-restricted-imports ESLint 规则强制）

## 测试
见 `src/domain/__tests__/`，所有测试使用 Given-When-Then 格式。
