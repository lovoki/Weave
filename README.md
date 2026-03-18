# Dagent 中文说明文档

## 1. 项目简介
Dagent 是一个基于 TypeScript 的终端智能体（CLI Agent）工程，目标是提供可观测、可控制、可扩展的多轮会话体验。

当前已实现的核心方向：
- 多轮会话常驻（输入一次后不会退出，继续等待下一次输入）
- `/q`、`/quit`、`/exit` 退出会话
- Weave 可视化模式（DAG 节点与执行细节）
- Step Gate 审批闸门（工具执行前可放行/编辑/跳过/终止）
- 会话记录与调用链路日志

---

## 2. 技术栈
- 语言：TypeScript（ESM）
- 运行时：Node.js
- 包管理：pnpm
- TUI：Ink + React
- LLM SDK：OpenAI 兼容接口（当前接入 Qwen）
- 配置校验：zod

---

## 3. 目录结构
```text
dagent/
  config/                  # 模型配置
  docs/project/            # 项目文档（架构/进度）
  logs/                    # 运行日志、会话调用链路
  memories/                # 系统提示词/用户风格/长期记忆
  scripts/                 # 校验脚本（如 Step Gate 冒烟测试）
  sessions/                # 每次会话的 jsonl 记录
  src/
    agent/                 # Agent Runtime 与插件机制
    llm/                   # 模型客户端封装
    tui/                   # Ink 界面与交互
    tools/                 # 工具定义/注册/内置工具
    weave/                 # Weave DAG 插件
    session/               # 会话记录器
  package.json
  tsconfig.json
```

---

## 4. 环境准备
### 4.1 安装依赖
在项目根目录执行：

```powershell
pnpm install
```

### 4.2 配置模型
项目使用配置文件 + 环境变量方式读取模型参数。

关键文件：
- `config/llm.config.json`
- `.env`（可选，放 API Key）

示例要点：
- provider：`qwen`
- model：你的可用模型名
- baseUrl：Qwen/OpenAI 兼容网关地址
- apiKey 或 apiKeyEnv：二选一

---

## 5. 启动方式
### 5.1 开发模式
```powershell
pnpm dev
```

### 5.2 构建 + 生产运行
```powershell
pnpm build
pnpm start
```

---

## 6. 交互与命令
### 6.1 基础会话
- 直接输入问题并回车即可发起一轮问答
- 会话不会在第一轮后退出，会继续等待下一条输入
- 退出命令：`/q`、`/quit`、`/exit`

### 6.2 Weave 模式
支持会话级模式切换：
- `/weave on`：启用 DAG 可视化
- `/weave off`：关闭 DAG 可视化
- `/weave step`：启用 Step Gate 审批模式

也支持行内触发：
- `/weave 请分析这个问题`

### 6.3 Step Gate 键位（交互式 TTY）
当工具调用进入审批闸门时：
- `Enter`：放行（approve）
- `E`：编辑参数后放行（edit）
- `S`：跳过本次工具调用（skip）
- `Q`：终止本轮执行（abort）

### 6.4 DAG 浏览键位
在输入框为空时：
- `↑ / ↓`：切换选中节点
- `Enter`：展开/折叠节点详情

---

## 7. 非交互（管道）模式
为解决 Ink 在非 TTY 环境下 raw mode 报错，项目已内置非 TTY 回退执行模式。

你可以像下面这样批处理输入：

```powershell
$input=@"
你好
再问一句
/q
"@
$input | pnpm dev
```

说明：
- 非 TTY 模式下不渲染 Ink UI，但会按行执行多轮输入
- `/q` 同样有效
- 会生成正常的 session 记录与调用链路日志

---

## 8. 日志与会话记录
### 8.1 会话记录
目录：`sessions/`

格式：`session-<sessionId>.jsonl`

内容包含：
- session_start
- message（user / assistant）
- error
- session_end

### 8.2 调用链路日志
目录：`logs/conversations/`

内容包含：
- session.start
- session.exit
- session.end

### 8.3 运行日志
目录：`logs/runtime/`

用于记录关键运行阶段打点（非分片全文日志）。

---

## 9. 测试与验证
### 9.1 编译验证
```powershell
pnpm build
```

### 9.2 Step Gate 冒烟测试
```powershell
node scripts/verify-step-gate.mjs
```

覆盖分支：
- approve
- edit
- skip

脚本会验证：
- skip 不执行真实工具
- edit 参数可透传到工具执行
- 审批事件与执行事件链路完整

---

## 10. 架构摘要
### 10.1 Agent Runtime
核心文件：`src/agent/run-agent.ts`

职责：
- 多轮 Agent loop
- 工具调用编排
- 运行事件发布
- Step Gate 审批流程

### 10.2 Weave 插件
核心文件：`src/weave/weave-plugin.ts`

职责：
- 以观察者模式输出结构化 DAG 事件
- 节点事件：`weave.dag.node`
- 详情事件：`weave.dag.detail`

### 10.3 TUI
核心文件：`src/tui/App.tsx`

职责：
- 会话输入输出渲染
- DAG 交互渲染
- Step Gate 键位审批

---

## 11. 常见问题
### Q1：输入中文在某些终端里显示为问号？
可能是终端编码或字体问题。建议：
- PowerShell 执行：`chcp 65001`
- 使用支持 UTF-8 的终端字体（如 Cascadia Mono）

### Q2：脚本管道运行时报 raw mode 错误？
当前版本已修复。若仍出现，确认代码是最新版本并重新构建：
```powershell
pnpm build
```

### Q3：模型调用失败怎么办？
按顺序检查：
- `config/llm.config.json` 中的 `baseUrl`、`model`
- API Key 是否存在且有效
- 网络是否可达对应网关

---

## 12. 当前进展与后续方向
### 已实现
- 多轮会话常驻 + `/q` 退出
- Weave DAG 实时渲染
- Step Gate 审批与参数编辑
- 会话级 `/weave on|off|step`
- 非 TTY 回退批处理

### 计划中
- 更完善的会话记忆持久化
- Gateway 层（WebSocket/HTTP）
- 统一事件总线与跨端协议收敛

---

## 13. 贡献建议
建议在每次改动后执行：
1. `pnpm build`
2. `node scripts/verify-step-gate.mjs`
3. 手动进行一轮交互验证：
   - 多轮输入
   - `/weave step`
   - `/q` 退出

并同步更新：
- `docs/project/development-progress.md`
- `docs/project/architecture-and-files.md`
