# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dagent is a TypeScript CLI intelligent agent with real-time DAG visualization. It supports multi-turn conversations, tool orchestration, a plugin system, and a Weave mode for DAG-based execution observability and human-in-the-loop approval (Step Gate).

**Language:** Chinese for all docs, comments, UI text, and commit messages.

## Commands

```bash
# Install
pnpm install

# Development (CLI only)
pnpm dev

# Build
pnpm build

# Production
pnpm start

# Full stack (CLI + graph server + graph web + opens browser)
pnpm dev:graph:all
pnpm dev:graph:stop    # clean shutdown
pnpm dev:graph:logs    # stream backend logs

# Verification
pnpm build                              # compile check
node scripts/verify-step-gate.mjs       # Step Gate smoke test (approve/edit/skip)
node scripts/verify-dag-matrix.mjs      # DAG semantic matrix (cycles, deadlock, retry)
pnpm verify:p0                          # full P0 suite (build + all verifications)
```

## Architecture

### Monorepo Layout (pnpm workspaces)

- **`src/`** — Core CLI agent runtime (entry: `src/index.ts`)
- **`apps/weave-graph-server/`** — Express + WebSocket gateway that ingests runtime events and broadcasts graph protocol to web clients
- **`apps/weave-graph-web/`** — Vite + React Flow + Zustand frontend for DAG visualization

### Core Runtime Layers (`src/`)

| Layer | Key File(s) | Purpose |
|-------|-------------|---------|
| Entry | `index.ts` | CLI bootstrap, TTY/non-TTY detection, session lifecycle, graph event forwarding |
| Agent | `agent/run-agent.ts` | Multi-turn loop, plugin hooks, Step Gate approval, event emission |
| LLM | `llm/qwen-client.ts` | OpenAI-compatible wrapper (streaming, tool calls) |
| Tools | `tools/tool-registry.ts` | Registry pattern; builtins: `command_exec`, `read_file`, `write_file` |
| Runtime | `runtime/dag-graph.ts`, `runner-selector.ts` | DAG data model with state machine, runner strategy selection (legacy vs DAG) |
| Weave | `weave/weave-plugin.ts` | Observer plugin that transforms agent events into hierarchical DAG node events |
| TUI | `tui/App.tsx` | Ink/React terminal UI with DAG tree rendering, Step Gate key handling |
| Memory | `memory/memory-store.ts` | File-based: `SOUL.md` (personality), `USER.md` (prefs), `MEMORY.md` (long-term) |
| Session | `session/session-recorder.ts` | JSONL per-session recording |
| Logging | `logging/app-logger.ts` | Runtime logs + conversation chain logs (Markdown) |

### Data Flow

```
User input → src/index.ts → AgentRuntime (run-agent.ts)
  → QwenClient (LLM) → ToolRegistry (tool execution)
  → WeavePlugin (DAG events) → TUI rendering
  → [optional] HTTP POST to graph-server → WebSocket → graph-web
```

### Key Patterns

- **Event-driven:** Agent emits typed events (`run.start`, `llm.delta`, `tool.execution.*`, `plugin.output`, `run.completed`); plugins and TUI subscribe
- **Plugin system:** `AgentLoopPlugin` interface with hooks: `beforeLlmRequest`, `afterLlmResponse`, `beforeToolExecution`, `afterToolExecution`
- **DAG state machine:** Nodes transition through `pending → ready → running → {success/fail/skipped/aborted}` with cycle detection
- **Graph protocol:** Versioned envelope (`weave.graph.v1`) with event types: `node.upsert`, `edge.upsert`, `node.status`, `node.io`, `layout.hint`
- **File-first persistence:** Sessions as JSONL, memories as Markdown, logs as daily files — no database

### Graph Visualization Stack

- **Server** (`apps/weave-graph-server/`): `GraphProjector` normalizes runtime events → `GraphGateway` broadcasts via WebSocket (token auth, localhost-only, heartbeat)
- **Web** (`apps/weave-graph-web/`): Zustand store manages per-DAG state, Dagre computes layout, React Flow renders with custom `SemanticNode` component

## Configuration

- **LLM config:** `config/llm.config.json` (provider, model, baseUrl, apiKey/apiKeyEnv, temperature, maxTokens)
- **Template:** `config/llm.config.template.json`
- **Environment variables:** `QWEN_API_KEY`, `WEAVE_GRAPH_INGEST_URL`, `WEAVE_GRAPH_TOKEN`, `WEAVE_GRAPH_MANAGED=1`

## Contribution Checklist

After changes, run:
1. `pnpm build`
2. `node scripts/verify-step-gate.mjs`
3. Manual interactive test: multi-turn input → `/weave step` → `/q` exit

Update these docs if architecture changes:
- `docs/project/development-progress.md`
- `docs/project/architecture-and-files.md`
