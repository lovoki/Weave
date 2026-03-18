# WEAVE 深色模式 Web IDE 渲染级性能与美学白皮书

> 本文档记录 weave-graph-web 前端 UI 全面重构的设计理念、技术决策与实现规范。
> 级别：达到 Linear、Vercel、Stripe 的工业设计标准。

---

## 一、设计理念

### 方向：从"太空控制台"到"高级暗色工作室"

当前"深空控制台"主题的三个根本问题：
1. **纯黑底色缺乏层次** — 所有层级视觉上无法区分
2. **动画时序过于线性** — 缺乏弹性和生命力
3. **色彩饱和度均一无主次** — 霓虹品牌色被淹没

**新方向**：带轻微蓝紫色温的深灰底色 + 玻璃态 + 弹性动画 + 语义化 Emoji

---

## 二、Emoji 语义化映射（必须精确）

| kind | Emoji | 说明 | 视觉原则 |
|------|-------|------|---------|
| llm | 🧠 | 脑，LLM 调用 | - |
| tool | 🛠️ | 锤子与扳手，常规执行 | 不可与 attempt/escalation 混淆 |
| attempt | 🔄 | 循环，重试状态 | "不屈不挠"的视觉隐喻 |
| escalation | 🚨 | 警灯，熔断/异常升级 | **必须刺眼**，代表严重状态转移 |
| condition | 🔀 | 分支，条件判断 | - |
| gate | 🛡️ | 盾牌，Step Gate 守卫 | - |
| repair | 🩹 | 创可贴，修复节点 | - |
| final | ✅ | 完成标志 | - |
| system | ⚙️ | 齿轮，系统节点 | - |
| input | 💬 | 对话气泡，用户输入 | - |

> **设计原则**：`tool` / `attempt` / `escalation` 三者在白盒调试时含义截然不同（正常执行 vs 重试 vs 熔断），必须用视觉差异极大的 emoji 区分。相同 emoji 会摧毁 DAG 图的可读性。

**Weave 品牌 Emoji**：`🌌`（星系），用于 Weave 相关日志标识和 Canvas 空状态水印。

---

## 三、色彩系统

### 背景色层次（带蓝紫色温，从深到浅）

```css
--bg-base:     #0a0d14   /* 极深蓝黑，原 #070b10 */
--bg-surface:  #111520   /* 面板底色，原 #0d1117 */
--bg-raised:   #181d2e   /* 卡片提升层，原 #161b22 */
--bg-overlay:  #1e2438   /* 编辑器区，原 #1c2128 */
```

**玻璃态变量（新增）**：
```css
--glass-bg:     rgba(17, 21, 32, 0.72)
--glass-border: rgba(255, 255, 255, 0.07)
--glass-blur:   20px
--glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.45)
```

### 文字层次（降低亮度，防光晕）

```css
--text-primary:   rgba(221, 230, 240, 0.92)  /* 降低亮度+蓝灰色温 */
--text-secondary: #8fa3bc                     /* 加蓝色倾向 */
--text-muted:     #5a6b82
--text-accent:    #a8c4f0                     /* 渐变文字专用 */
```

### 节点品牌色

```css
--color-llm:       #b48aff   /* 紫 */
--color-tool:      #5aadff   /* 蓝 */
--color-gate:      #ffab5e   /* 橙金 */
--color-final:     #3dc653   /* 绿 */
--color-input:     #38d8f8   /* 青 */
--color-system:    #6e7a90   /* 蓝灰 */
--color-repair:    #ff6057   /* 红 */
--color-condition: #7ec8ff   /* 蓝紫 */
```

**P3 广色域增强**（现代高端屏幕）：
```css
@supports (color: color(display-p3 1 1 1)) {
  :root {
    --color-llm:    color(display-p3 0.7 0.45 1.0);
    --color-tool:   color(display-p3 0.25 0.65 1.0);
    --color-repair: color(display-p3 1.0 0.35 0.3);
  }
}
```

### 动画时序变量

```css
--ease-spring:    cubic-bezier(0.175, 0.885, 0.32, 1.275)  /* 弹性，用于 Scale 变换 */
--ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1)            /* 平滑，用于高度变化 */
--duration-fast:   120ms
--duration-normal: 220ms
--duration-slow:   380ms
```

**关键规则**：
- Scale 变换（节点出现、hover）→ 用 `--ease-spring`（带回弹）
- **高度变化（Accordion 展开）→ 绝对不用带回弹曲线！** 用 `--ease-out-quart`

### 圆角系统

```css
--radius-sm: 6px   --radius-md: 10px   --radius-lg: 14px   --radius-xl: 18px
```

---

## 四、玻璃态边框规范

### 工业级 1px 描边（取代简单 border）

**问题**：`box-shadow: inset 0 0 0 1px rgba(...)` 在 1080P 屏幕因抗锯齿变成 2px 模糊线。

**正确做法**：真实 `border` + `background-clip: padding-box`：

```css
.semantic-node-card,
.inspector-node-header,
.approval-panel {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background-clip: padding-box;   /* 防止半透明背景渗入边框 */
  box-shadow:
    inset 0 1px 1px rgba(255, 255, 255, 0.12),   /* 顶部高光（玻璃感） */
    0 8px 32px rgba(0, 0, 0, 0.4);               /* 外部深阴影 */
}
```

### 外阴影脏渗透修复

**问题**：半透明玻璃背景 + `box-shadow` 外阴影会向内渗透，导致卡片内部发暗。

**修复**：外阴影改用 `filter: drop-shadow()`（不影响内部）：

```css
.semantic-node-card {
  /* 内阴影保留在 box-shadow */
  box-shadow:
    inset 0 1px 1px rgba(255, 255, 255, 0.12);
  /* 外阴影用 filter（与内部隔离） */
  filter: drop-shadow(0 6px 20px rgba(0, 0, 0, 0.5));
}
```

### Safari 毛玻璃圆角溢出 Bug 修复

**问题**：`border-radius + backdrop-filter` 在 Safari 下毛玻璃从直角溢出（WebKit 多年 Bug）。

```css
.semantic-node-card, .approval-panel {
  -webkit-mask-image: -webkit-radial-gradient(white, black);
  transform: translateZ(0);
}
```

---

## 五、节点卡片（SemanticNode）规范

### 尺寸与形态

```
宽度: 248px（原 240px）
border-radius: 16px（原 10px）
顶部颜色条: 3px 渐变（原 2px 纯色）
  → linear-gradient(90deg, {kindColor}, {kindColor}60)
左侧竖线: 4px（原 3px），border-radius: 0 3px 3px 0
```

### 状态光晕（零重绘方案）

**绝对不要**用 `box-shadow` transition 来做光晕动画（触发 Repaint）。

**正确做法**：用伪元素 `opacity` 切换（GPU 合成，零开销）：

```css
.semantic-node-card::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: 0 0 20px rgba(245, 166, 35, 0.25);
  opacity: 0;
  transition: opacity var(--duration-normal) var(--ease-out-quart);
  pointer-events: none;
}
.semantic-node-card[data-status="running"]::after { opacity: 1; }
.semantic-node-card[data-status="retrying"]::after {
  box-shadow: 0 0 20px rgba(232, 135, 42, 0.3);
  opacity: 1;
}
```

### 文本渐变消隐（取代省略号）

```css
.text-fade-out {
  position: relative;
  overflow: hidden;
  white-space: nowrap;
}
.text-fade-out::after {
  content: "";
  position: absolute;
  top: 0; right: 0;
  width: 48px; height: 100%;
  background: linear-gradient(to right, rgba(17,21,32,0), rgba(17,21,32,1));
  pointer-events: none;
}
```

应用场景：节点标题、Inspector 端口名称、ChatPanel 用户输入摘要。

---

## 六、React Flow 连线（Edges）规范

### 状态颜色系统

| 目标节点状态 | 线条颜色 | 效果 |
|-------------|---------|------|
| pending | `rgba(255,255,255,0.08)` | 极弱白线，几乎不可见 |
| running / retrying | SVG linearGradient 紫→蓝 | 彗星流光动画 |
| success | `rgba(63,198,83,0.6)` | 暗绿色 |
| fail | `rgba(255,96,87,0.7)` + dasharray | 暗红虚线 |
| skipped | `rgba(90,102,120,0.35)` | 淡灰 |

### 渐变线（消除 RGB 泥潭色）

**必须插入中间锚点**，否则紫→蓝中间出现灰扑扑的泥泞色：

```xml
<linearGradient id="flow-gradient-{id}" x1="0%" y1="0%" x2="100%" y2="0%">
  <stop offset="0%"   stopColor="#b48aff" stopOpacity="0.9"/>
  <stop offset="50%"  stopColor="#3b82f6" stopOpacity="0.95"/>  <!-- 必须有中间锚点 -->
  <stop offset="100%" stopColor="#5aadff" stopOpacity="0.9"/>
</linearGradient>
```

### 彗星流光效果（GPU 优化双层方案）

**绝对不要**在动画路径上加 `filter: drop-shadow()`（15 条线同跑时 60fps 暴跌 20fps）。

**正确做法**：底层静态发光 + 顶层纯净彗星：

```css
/* 底层：静态发光轨道，GPU 零负担 */
.edge-track {
  stroke: rgba(180, 138, 255, 0.2);
  filter: drop-shadow(0 0 4px rgba(180, 138, 255, 0.4));
  /* filter 在静态元素上无性能损耗 */
}

/* 顶层：彗星动线，绝对不加 filter */
.edge-comet {
  stroke: #b48aff;
  stroke-dasharray: 10 100;
  stroke-linecap: round;
  animation: comet-flow 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

@keyframes comet-flow {
  0%   { stroke-dashoffset: 110; opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 1; }
  100% { stroke-dashoffset: 0; opacity: 0; }
}
```

### SVG 亚像素精度

```css
.react-flow__edges svg {
  shape-rendering: geometricPrecision;  /* 节点在非整数坐标时消灭曲线虚边 */
}
```

---

## 七、Inspector 垂直重构规范

### 布局：取消 Tab，改为纵向滚动卡片流

```
┌─ Sticky Header（position: sticky; top: 0）
│   🧠 节点标题  ✅ DONE  45ms
│
├─ Accordion: 🔢 输入 ↓（默认展开）
│   port 数据（JSON/args/system prompt）
│
├─ Accordion: 📤 输出 ↓（默认展开）
│   result / 生成文本
│
└─ Accordion: 📊 指标与日志 ↓（默认折叠）
    Token 消耗 / 报错堆栈 / durationMs
```

### Sticky Header（关键体验）

```css
.inspector-sticky-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border-glass);
}
```

### 幽灵滚动条

```css
.inspector-panel::-webkit-scrollbar { width: 4px; background: transparent; }
.inspector-panel::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.08); border-radius: 4px;
}
.inspector-panel:hover::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.18);
}
```

### 防滚动穿透 + 布局坍塌

```css
body { overscroll-behavior-y: none; }
.inspector-panel {
  overscroll-behavior: contain;
  scrollbar-gutter: stable;  /* Accordion 展开时布局宽度永不跳动 */
}
```

---

## 八、字体系统（双字体规范）

### 引入

在 `index.html`：
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### CSS 变量

```css
--font-ui:   'Inter', 'SF Pro Display', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
```

### 精确应用规则

| 字体类型 | 应用场景 |
|---------|---------|
| `--font-ui` | 按钮、标题、标签、状态文字、自然语言输出、System Prompt 大段描述 |
| `--font-mono` | JSON 树、代码片段、Token 数值、耗时数字、HTTP 参数、报错堆栈、参数编辑器 |

**自然语言输出绝对不用等宽字体**（大段 LLM 输出用等宽会引发视觉疲劳）。

### 全局渲染优化

```css
body {
  font-family: var(--font-ui);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-variant-ligatures: contextual;  /* 开启 Fira Code 的 => === 等连字 */
}
```

### 数字等宽（消灭"跳舞"现象）

LLM 流式输出时数字 `1` 比 `8` 窄，导致数字串宽度不断伸缩，周围文字"跳舞"：

```css
.stat-card-value, .duration-ms, .token-count, .metrics-num {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;  /* 强制所有数字物理宽度相同 */
  letter-spacing: -0.02em;
}
```

### 暗黑模式字重修正（光晕发胖问题）

纯黑背景下白色文字产生"光晕"，同字重看起来比浅色模式粗一整圈：

```css
.inspector-panel, .semantic-node-card {
  font-variation-settings: "wght" 380;  /* 暗黑下视感 400≈浅色 500，用 380 修正 */
}
```

---

## 九、Emoji 容器规范（跨平台对齐）

不同系统（Mac/Windows）渲染 Emoji 大小不一，必须统一处理：

```css
.emoji-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji";
  line-height: 1;
  vertical-align: middle;
  position: relative;
  top: -1px;                         /* 光学修正：大多数 emoji 需上移 1px 才视觉居中 */
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));  /* 融入暗黑背景 */
  user-select: none;
}
```

---

## 十、微交互与触觉反馈

### 按钮物理下压感（:active）

```css
.approval-btn:active {
  transform: translateY(0) scale(0.96) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.6) !important;
  transition-duration: 50ms !important;  /* 按下必须极迅速 */
}
```

### One-Click Copy 动效（InspectorTextBlock.tsx）

点击复制后：
1. 图标变为 `✅`（150ms 后恢复）
2. 代码块背景闪过极弱绿光（`rgba(63,198,83,0.08)`，150ms）
3. 实现：`useCallback + setTimeout`，无外部依赖

### 文本选择颜色

```css
::selection {
  background: rgba(180, 138, 255, 0.3);
  color: #fff;
}
```

### 输入光标品牌化

```css
input, textarea, [contenteditable="true"] {
  caret-color: var(--color-llm);  /* 赛博紫闪烁光标 */
}
```

### 键盘聚焦环（品牌化）

```css
*:focus { outline: none; }
*:focus-visible {
  outline: 2px solid rgba(180, 138, 255, 0.6);
  outline-offset: 2px;
  border-radius: inherit;
  box-shadow: 0 0 0 4px rgba(180, 138, 255, 0.1);
}
```

---

## 十一、性能规范

### 拖拽时平滑降级毛玻璃（防帧率下降 + 防闪烁）

```css
/* 基础：加过渡让降级平滑 */
.semantic-node-card {
  transition:
    transform var(--duration-fast) var(--ease-out-quart),
    box-shadow var(--duration-fast) var(--ease-out-quart),
    backdrop-filter 150ms ease,
    background-color 150ms ease;
}

/* 拖拽时：150ms 内平滑失去玻璃质感（不是瞬间闪变） */
.react-flow.is-panning .semantic-node-card {
  backdrop-filter: none !important;
  background: var(--bg-surface) !important;
}
```

---

## 十二、Canvas 空状态（赛博朋克仪式感）

当 `nodes.length === 0` 时，在画布正中央展示：

```jsx
<div style={{
  position: "absolute", inset: 0,
  display: "flex", flexDirection: "column",
  alignItems: "center", justifyContent: "center",
  pointerEvents: "none", zIndex: 1
}}>
  <div style={{ fontSize: 120, opacity: 0.025, userSelect: "none" }}>🌌</div>
  <div style={{
    fontFamily: "var(--font-mono)", fontSize: 13,
    color: "rgba(255,255,255,0.15)",
    marginTop: 16, letterSpacing: "0.1em"
  }}>
    AWAITING_INITIAL_PROMPT<span className="cursor-blink">_</span>
  </div>
</div>
```

```css
@keyframes cursor-blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
.cursor-blink { animation: cursor-blink 1.2s step-end infinite; }
```

---

## 十三、React Flow 原生控件融合

覆盖 `<MiniMap />` 和 `<Controls />` 的默认白灰色：

```css
.react-flow__panel.react-flow__controls {
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  border: 1px solid rgba(255,255,255,0.08);
  background-clip: padding-box;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}
.react-flow__controls-button {
  background: transparent;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  fill: var(--text-secondary);
}
.react-flow__controls-button:hover {
  background: rgba(255,255,255,0.05);
  fill: var(--text-primary);
}
.react-flow__minimap {
  background: var(--bg-surface);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 8px;
}
```

---

## 十四、修改文件清单

| 优先级 | 文件 | 主要变更 |
|--------|------|---------|
| P0 | `src/app.css` | CSS 变量系统全面重写、所有动画改造、组件基础样式 |
| P0 | `src/icons/*.tsx`（8个） | 全部替换为 emoji span，接口兼容 |
| P0 | `src/nodes/semantic-node.tsx` | 圆角/内高光/emoji/伪元素光晕 |
| P0 | `src/App.tsx` | Header、Inspector 垂直重构、Canvas 空状态 |
| P1 | `src/components/ChatPanel.tsx` | 气泡样式、emoji 状态行、空状态 |
| P1 | `src/components/ApprovalPanel.tsx` | 审美全面提升、emoji、按钮触觉 |
| P1 | `src/components/InspectorTextBlock.tsx` | Copy 动效、字体精准控制 |
| P2 | `src/edges/FlowEdge.tsx` | 彗星流光双层、渐变三锚点、状态色系 |
| P2 | `index.html` | 引入 Inter + JetBrains Mono |

---

## 十五、功能完整性红线

以下逻辑**绝对不修改**：
- `store/graph-store.ts`（Zustand 状态）
- WebSocket 连接和消息处理
- Step Gate 审批回调 `onAction`
- Dagre 布局引擎
- Blob 懒加载
- JSON 验证逻辑
- React Flow 节点/边事件处理

图标接口**向后兼容**：所有调用方 `<IconComp size={x} color={y} />` 无需修改。
