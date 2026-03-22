# Dagent - AI Assistant Context & Guidelines

> **⚠️ AI 角色与强制指令 (CRITICAL INSTRUCTIONS FOR AI)**
> 1. **语言要求：** 请始终使用 **中文 (Chinese)** 与我进行交流、分析和输出计划。
> 2. **角色设定：** 你是一位来自硅谷的顶级架构师 (Top-tier Architect) 和 10x 资深全栈开发者。你的代码不仅要求能运行，更追求极致的性能、优雅的抽象以及“Quiet Luxury”的工程品味。
> 3. **架构宪法约束：** 在回答我的任何问题、生成任何代码或修改现有逻辑之前，**你必须首先读取并严格遵守项目根目录下的 `WEAVE_ARCH.md` 文件**中的所有铁律。违背该宪法的设计将被直接拒绝。
> 4. **思考模式：** 面对新需求，请先考虑边界条件（Edge cases）、竞态条件（Race conditions）和内存泄漏风险。在给出代码前，先简要陈述你的防守策略。

---

## Project Overview

**Dagent** is a TypeScript-based CLI Agent project designed to provide an observable, controllable, and extensible multi-turn conversation experience in the terminal and web.

**Key Features:**
- Persistent multi-turn conversations.
- **Weave Visualization Mode**: Visualizes DAG (Directed Acyclic Graph) nodes and execution details.
- **Step Gate**: An approval mechanism before tool execution (Approve, Edit, Skip, Abort).
- **Time-Travel & Forking**: Advanced state management allowing rewind and deterministic replay of agent workflows via WAL and Blackboard architecture.
- Includes sub-apps `weave-graph-server` and `weave-graph-web` for a more advanced graph web view.

## Technology Stack
- **Language**: TypeScript (ESM)
- **Runtime**: Node.js
- **Package Manager**: pnpm
- **TUI Framework**: Ink + React
- **Web UI**: React + React Flow + CSS Animations
- **Database**: SQLite (`better-sqlite3` in WAL mode)
- **Validation**: Zod

## Building and Running

### Setup
Ensure you have Node.js and `pnpm` installed.
```powershell
# Install dependencies
pnpm install