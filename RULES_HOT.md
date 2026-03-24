# RULES_HOT（每次 prompt 第一行必读，≤15条）

> 高频、高风险规则集。完整规范见 `RULES.md`，已知坑见 `ANTI_PATTERNS.md`。

---

## 执行前必做
1. **复述规则**：生成代码前，用一句话复述你理解的核心逻辑，并列出 2 个 Edge Cases
2. **ANTI_PATTERNS 扫描**：静默读取 ANTI_PATTERNS.md，生成代码前总结如何避免已知陷阱
3. **分支检查**：确认当前在正确的 `refactor/PX-Y-xxx` 分支上操作

## 代码约束（编写代码前检查）
4. **接口优先**：只 import `src/contracts/` 中的接口，不 import 跨层实现文件
5. **禁止 as any**：发现 `as any` 必须报告并给出类型安全替代方案
6. **深拷贝防污染**：从 `event.payload` 提取数据前必须深拷贝（`structuredClone` 或 `{...}`）
7. **WAL 禁止单条 INSERT**：所有 WAL 写入必须经过 `WeaveWalManager` 队列
8. **AbortSignal 透传**：所有异步操作必须接受并传递 `signal` 参数

## 测试约束
9. **骨架驱动**：先在 `.spec.ts` 中写 `it('Given-When-Then 描述')` 骨架，再实现
10. **测试用例场景由人类设计**：AI 只负责把空 `it()` 变成绿色代码

## 提交约束
11. **Conventional Commits**：`feat/fix/refactor(模块名): 中文描述`
12. **DoD 自检**：提交前确认 ESLint 0 error + `.spec.ts` 全绿 + `pnpm build` 通过

## Review 约束（威胁建模）
13. 完成 Diff 后，扮演攻击者，从「**并发竞态 / 边界输入 / ANTI_PATTERNS 相似性**」3个角度各列1个崩溃场景

## 紧急约束（违反即阻断）
14. **WebSocket RPC 必须回包**：所有 RPC handler 必须 `try-catch`，`finally` 按 `reqId` 返回响应
15. **挂起字典必须清理**：`pendingRegistry` 中的 Promise 在 `finally` 块清理，确保不泄漏
