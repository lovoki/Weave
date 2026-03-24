/**
 * application/agent AgentRuntime BDD 测试骨架
 * 规则：场景由人类设计，AI 填充实现。空 it() 即是验收标准。
 * 注意：使用 mock ILlmClient 和 IToolRegistry，不依赖真实网络。
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ILlmClient, IToolRegistry, AgentLoopPlugin } from "../../contracts/agent.js";

describe("AgentRuntime — 多轮对话循环", () => {
  // ─── 基础对话流程 ──────────────────────────────────────────────────────────

  it("Given 用户输入, When runTurn 执行, Then LLM 被调用一次并返回响应");

  it("Given LLM 响应包含工具调用, When runTurn 执行, Then 工具被执行且结果追加到消息历史");

  it("Given 工具执行后 LLM 不再调用工具, When runTurn 执行, Then 循环终止并返回最终文本");

  // ─── 中止机制 ──────────────────────────────────────────────────────────────

  it("Given abort 信号在 LLM 调用中触发, When runTurn 执行, Then 循环立即终止");

  it("Given abort 信号在工具执行中触发, When runTurn 执行, Then 工具调用被取消");

  // ─── 插件系统 ──────────────────────────────────────────────────────────────

  it(
    "Given 插件注册了 beforeLlmRequest 钩子, When LLM 调用前, Then 钩子被调用并可修改 systemPrompt"
  );

  it("Given 插件注册了 afterToolExecution 钩子, When 工具执行后, Then 钩子被调用并收到执行结果");

  it("Given 插件钩子抛出 Error, When 主流程继续, Then 错误被隔离，主流程不中断（见 E-007）");

  // ─── Step Gate ─────────────────────────────────────────────────────────────

  it("Given Step Gate 模式开启, When 工具执行前, Then 等待人工审批");

  it("Given Step Gate 等待审批, When 用户批准, Then 工具继续执行");

  it("Given Step Gate 等待审批, When 用户跳过, Then 工具不执行，标记为 skipped");

  it("Given Step Gate 等待审批, When abort 信号触发, Then 审批等待被取消");
});

describe("PluginExecutor — 插件执行器", () => {
  it("Given 多个插件注册同一钩子, When 钩子触发, Then 所有插件按注册顺序依次调用");

  it(
    "Given 插件 beforeLlmRequest 返回修改后的 systemPrompt, When LLM 调用, Then 使用修改后的 systemPrompt"
  );
});
