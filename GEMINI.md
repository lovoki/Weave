# Dagent - Gemini Context

## Gemini
用中文输出！！

## Project Overview

**Dagent** is a TypeScript-based CLI Agent project designed to provide an observable, controllable, and extensible multi-turn conversation experience in the terminal.

**Key Features:**
- Persistent multi-turn conversations (use `/q`, `/quit`, or `/exit` to exit).
- **TUI (Text User Interface)** built with Ink and React.
- **Weave Visualization Mode**: Visualizes DAG (Directed Acyclic Graph) nodes and execution details directly in the terminal.
- **Step Gate**: An approval mechanism before tool execution, allowing users to approve (Enter), edit (E), skip (S), or abort (Q).
- Session recording and invocation chain logging.
- Includes sub-apps `weave-graph-server` and `weave-graph-web` for a more advanced graph web view.

## Technology Stack
- **Language**: TypeScript (ESM)
- **Runtime**: Node.js
- **Package Manager**: pnpm
- **TUI Framework**: Ink + React
- **LLM SDK**: OpenAI-compatible interface (currently connected to Qwen)
- **Validation**: Zod

## Building and Running

### Setup
Ensure you have Node.js and `pnpm` installed.
```powershell
# Install dependencies
pnpm install
```

### Configuration
Model configurations are managed via `config/llm.config.json` and optionally a `.env` file for API Keys.

### Execution Commands
- **Development Mode (CLI)**:
  ```powershell
  pnpm dev
  ```
- **Build**:
  ```powershell
  pnpm build
  ```
- **Production Run (After build)**:
  ```powershell
  pnpm start
  ```
- **Start Weave Graph Apps (Server + Web)**:
  ```powershell
  pnpm dev:graph:all
  ```
- **Stop Weave Graph Apps**:
  ```powershell
  pnpm dev:graph:stop
  ```

### Testing and Verification
- **Verify Step Gate Workflow**:
  ```powershell
  pnpm verify:step-gate
  ```
- **Verify DAG Matrix**:
  ```powershell
  pnpm verify:dag-matrix
  ```
- **Full Verification Suite**:
  ```powershell
  pnpm verify:p0
  ```

## Development Conventions and Guidelines
1. **Testing**: After making changes, ensure you run the build and verification scripts:
   ```powershell
   pnpm build
   node scripts/verify-step-gate.mjs
   ```
2. **Manual Verification**: Perform a round of interactive testing:
   - Check multi-turn input.
   - Test `/weave step` functionality.
   - Test `/q` exit functionality.
3. **Documentation Sync**: When making significant changes, synchronously update the project documentation:
   - `docs/project/development-progress.md`
   - `docs/project/architecture-and-files.md`
4. **Encoding**: Ensure terminals are set to UTF-8 (`chcp 65001` in PowerShell) to properly render UI elements and Chinese characters.
