# 🌌 Weave Design System

> AI Agent DAG Observability Layer - Complete Design Specification

---

## 📋 Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Theme System](#theme-system)
3. [Color Palette](#color-palette)
4. [Typography](#typography)
5. [Spacing & Layout](#spacing--layout)
6. [Component Specifications](#component-specifications)
7. [Animation System](#animation-system)
8. [AI Implementation Guide](#ai-implementation-guide)

---

## Design Philosophy

### Core Principles

| Principle | Description |
|-----------|-------------|
| **Elegant Minimalism** | Apple/Linear inspired - soft shadows, no heavy borders |
| **Cosmic Breathing** | Animations mimic natural breathing rhythm (2-3s cycles) |
| **Information Hierarchy** | Show essential info only, details on interaction |
| **Seamless Transitions** | All state changes use smooth CSS transitions |

### Visual Identity

- **Logo**: 🌌 Galaxy emoji with purple glow
- **Mood**: Professional yet cosmic, technical yet approachable
- **Density**: Medium - balanced whitespace

---

## Theme System

### CSS Variables - Dark Theme (Default)

```css
:root {
  /* ===== BACKGROUND COLORS ===== */
  --bg-base: #09090b;                    /* Pure obsidian black */
  --bg-elevated: rgba(15, 15, 18, 0.85); /* Panels with blur */
  --bg-card: rgba(24, 24, 27, 0.85);     /* Node cards */
  --bg-hover: rgba(255, 255, 255, 0.04); /* Hover states */
  --bg-active: rgba(255, 255, 255, 0.08);/* Active states */
  
  /* ===== TEXT COLORS ===== */
  --text-primary: #fafafa;     /* Main text */
  --text-secondary: #a1a1aa;   /* Descriptions */
  --text-muted: #52525b;       /* Hints, labels */
  --text-disabled: #3f3f46;    /* Disabled state */
  
  /* ===== BORDER COLORS ===== */
  --border-primary: rgba(255, 255, 255, 0.1);
  --border-secondary: rgba(255, 255, 255, 0.06);
  --border-hover: rgba(255, 255, 255, 0.15);
  
  /* ===== SEMANTIC COLORS ===== */
  --purple: #8b5cf6;           /* LLM / AI / Running */
  --purple-light: #a78bfa;     /* Lighter variant */
  --purple-glow: rgba(139, 92, 246, 0.4);
  
  --green: #10b981;            /* Complete / Success */
  --green-light: #34d399;
  --green-glow: rgba(16, 185, 129, 0.4);
  
  --amber: #f59e0b;            /* Gate / Warning */
  --amber-light: #fbbf24;
  --amber-glow: rgba(245, 158, 11, 0.4);
  
  --blue: #3b82f6;             /* Tool / Selected */
  --blue-light: #60a5fa;
  --blue-glow: rgba(59, 130, 246, 0.4);
  
  --red: #ef4444;              /* Error */
  --red-light: #f87171;
  --red-glow: rgba(239, 68, 68, 0.4);
  
  /* ===== COSMIC EFFECTS ===== */
  --nebula-1: rgba(139, 92, 246, 0.1);
  --nebula-2: rgba(99, 102, 241, 0.08);
  --nebula-3: rgba(168, 85, 247, 0.06);
  --star-opacity: 1;
  --grid-opacity: 0.03;
  
  /* ===== SHADOWS ===== */
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.4);
  --shadow-glow-purple: 0 0 20px var(--purple-glow);
  --shadow-glow-green: 0 0 20px var(--green-glow);
  --shadow-glow-amber: 0 0 20px var(--amber-glow);
  
  /* ===== TRANSITIONS ===== */
  --transition-fast: 0.15s ease;
  --transition-normal: 0.3s ease;
  --transition-slow: 0.5s ease;
  --transition-theme: 0.4s ease;
}
```

### CSS Variables - Light Theme

```css
.light-theme {
  /* ===== BACKGROUND COLORS ===== */
  --bg-base: #f8f9fa;
  --bg-elevated: #ffffff;
  --bg-card: #ffffff;
  --bg-hover: rgba(0, 0, 0, 0.02);
  --bg-active: rgba(0, 0, 0, 0.04);
  
  /* ===== TEXT COLORS ===== */
  --text-primary: #1a1a2e;
  --text-secondary: #6b7280;
  --text-muted: #9ca3af;
  --text-disabled: #d1d5db;
  
  /* ===== BORDER COLORS ===== */
  --border-primary: #e5e7eb;
  --border-secondary: #f0f0f0;
  --border-hover: #d1d5db;
  
  /* ===== GLOW EFFECTS (reduced in light mode) ===== */
  --purple-glow: rgba(139, 92, 246, 0.15);
  --green-glow: rgba(16, 185, 129, 0.15);
  --amber-glow: rgba(245, 158, 11, 0.15);
  --blue-glow: rgba(59, 130, 246, 0.15);
  
  /* ===== COSMIC (disabled in light mode) ===== */
  --nebula-1: transparent;
  --nebula-2: transparent;
  --nebula-3: transparent;
  --star-opacity: 0;
  --grid-opacity: 0;
  
  /* ===== SHADOWS ===== */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.06), 0 0 1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.08);
}
```

---

## Color Palette

### Semantic Color Usage

| Color | Variable | HEX | Usage |
|-------|----------|-----|-------|
| 🟣 Purple | `--purple` | #8B5CF6 | LLM nodes, Running state, Active edges |
| 🟢 Green | `--green` | #10B981 | Complete state, Success, Input nodes |
| 🟠 Amber | `--amber` | #F59E0B | Gate nodes, Warning, Pause state |
| 🔵 Blue | `--blue` | #3B82F6 | Tool nodes, Selected state |
| 🔴 Red | `--red` | #EF4444 | Error state |
| ⚪ Gray | `--text-muted` | #52525B | Pending, Disabled |

### Gradient Definitions

```css
/* Node Icon Backgrounds */
.icon-llm {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(99, 102, 241, 0.25));
  border: 1px solid rgba(139, 92, 246, 0.3);
}

.icon-tool {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(99, 102, 241, 0.25));
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.icon-gate {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(234, 179, 8, 0.25));
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.icon-input {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(52, 211, 153, 0.25));
  border: 1px solid rgba(16, 185, 129, 0.3);
}

/* Edge Gradient */
.edge-active-gradient {
  background: linear-gradient(90deg, #8b5cf6, #a78bfa, #6366f1);
}
```

---

## Typography

### Font Stack

```css
:root {
  --font-sans: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', 
               'Segoe UI', system-ui, sans-serif;
  --font-mono: 'SF Mono', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace;
}
```

### Type Scale

| Element | Size | Weight | Line Height | Letter Spacing |
|---------|------|--------|-------------|----------------|
| **Logo** | 16px | 600 | 1.2 | -0.02em |
| **Panel Title** | 13px | 600 | 1.3 | 0 |
| **Node Title** | 12px | 600 | 1.3 | 0 |
| **Node Subtitle** | 10px | 400 | 1.4 | 0 |
| **Body Text** | 12px | 400 | 1.5 | 0 |
| **Label** | 10px | 600 | 1.2 | 0.5px |
| **Badge** | 9px | 600 | 1.2 | 0.3px |
| **Code** | 11px | 400 | 1.6 | 0 |

### Typography CSS

```css
/* Logo */
.logo-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

/* In dark theme, logo has gradient */
.dark-theme .logo-text {
  background: linear-gradient(135deg, #fff 0%, #c4b5fd 50%, #a78bfa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Panel Title */
.panel-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

/* Node Title (SVG) */
.node-title {
  font-size: 12px;
  font-weight: 600;
  fill: var(--text-primary);
  font-family: var(--font-sans);
}

/* Node Subtitle (SVG) */
.node-sub {
  font-size: 10px;
  fill: var(--text-secondary);
  font-family: var(--font-sans);
}

/* Section Label */
.section-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

/* Code Block */
.code-block {
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1.7;
  color: var(--text-secondary);
}

.code-key { color: var(--purple); }
.code-str { color: var(--green); }
.code-num { color: var(--blue); }
```

---

## Spacing & Layout

### Spacing Scale

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
}
```

### Border Radius

```css
:root {
  --radius-sm: 8px;
  --radius-md: 10px;
  --radius-lg: 12px;
  --radius-xl: 14px;
  --radius-2xl: 16px;
  --radius-full: 9999px;
}
```

### Main Layout Structure

```css
/* App Container */
.weave-app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-base);
  border-radius: var(--radius-2xl);
  overflow: hidden;
  position: relative;
}

/* Header */
.weave-header {
  height: 56px;
  background: var(--bg-elevated);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border-secondary);
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 16px;
  position: relative;
  z-index: 100;
}

/* Main Content */
.weave-main {
  flex: 1;
  display: grid;
  grid-template-columns: 280px 1fr 320px;
  overflow: hidden;
  position: relative;
  z-index: 1;
}

/* Left Panel (Tasks) */
.panel-left {
  width: 280px;
  background: var(--bg-elevated);
  backdrop-filter: blur(20px);
  border-right: 1px solid var(--border-secondary);
}

/* Center (DAG Canvas) */
.dag-panel {
  flex: 1;
  position: relative;
  overflow: hidden;
}

/* Right Panel (Details) */
.panel-right {
  width: 320px;
  background: var(--bg-elevated);
  backdrop-filter: blur(20px);
  border-left: 1px solid var(--border-secondary);
}
```

---

## Component Specifications

### 1. Theme Toggle

```css
.theme-toggle {
  width: 44px;
  height: 26px;
  background: var(--bg-card);
  border-radius: 13px;
  border: 1px solid var(--border-primary);
  cursor: pointer;
  position: relative;
  transition: all var(--transition-normal);
}

.theme-toggle::after {
  content: '☀️';
  position: absolute;
  left: 3px;
  top: 2px;
  width: 20px;
  height: 20px;
  background: var(--bg-elevated);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: all var(--transition-normal);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.theme-toggle.dark::after {
  content: '🌙';
  left: 21px;
}
```

### 2. Cosmic Background (Stars & Nebula)

```css
/* Container */
.cosmic-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  transition: opacity var(--transition-theme);
}

/* Nebula Clouds */
.nebula {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  animation: nebulaDrift 25s ease-in-out infinite;
}

.nebula-1 {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, var(--nebula-1), transparent 70%);
  top: -150px;
  right: -100px;
}

.nebula-2 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, var(--nebula-2), transparent 70%);
  bottom: -100px;
  left: -100px;
  animation-delay: -10s;
}

.nebula-3 {
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, var(--nebula-3), transparent 70%);
  top: 50%;
  left: 40%;
  animation-delay: -18s;
}

/* Stars */
.stars {
  position: absolute;
  inset: 0;
  opacity: var(--star-opacity);
  transition: opacity var(--transition-theme);
}

.star {
  position: absolute;
  background: #fff;
  border-radius: 50%;
}

.star-s {
  width: 1px;
  height: 1px;
  animation: twinkle 3s ease-in-out infinite;
}

.star-m {
  width: 2px;
  height: 2px;
  animation: twinkle2 4s ease-in-out infinite;
}

.star-l {
  width: 3px;
  height: 3px;
  box-shadow: 0 0 6px 1px rgba(255, 255, 255, 0.5);
  animation: twinkle 5s ease-in-out infinite;
}

/* Shooting Star */
.shooting-star {
  position: absolute;
  width: 2px;
  height: 2px;
  background: linear-gradient(45deg, #fff, transparent);
  box-shadow: 0 0 4px #fff;
  animation: shootingStar 2s ease-out infinite;
}

/* Cosmic Grid */
.cosmic-grid {
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(rgba(255, 255, 255, var(--grid-opacity)) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, var(--grid-opacity)) 1px, transparent 1px);
  background-size: 32px 32px;
}
```

### 3. DAG Nodes

```css
/* Node Base */
.node {
  cursor: pointer;
  transition: transform 0.2s, filter 0.2s;
}

.node:hover {
  transform: scale(1.02);
}

.node:hover .node-card {
  filter: brightness(1.1);
}

/* Node Card (SVG rect) */
.node-card {
  fill: var(--bg-card);
  stroke: var(--border-primary);
  stroke-width: 1.5;
  rx: 14;
  transition: fill var(--transition-theme), stroke var(--transition-theme);
}

/* Node Glow Effect (SVG ellipse) */
.node-glow {
  fill: none;
  stroke-width: 30;
  opacity: 0;
  filter: blur(15px);
  transition: opacity 0.3s;
}

.node:hover .node-glow {
  opacity: 0.15;
}

/* Node Icon Background */
.node-icon-bg {
  rx: 10;
}

/* Node States */
.node-complete .node-card { stroke: var(--green); }
.node-complete .node-glow { stroke: var(--green); }

.node-running {
  animation: float 2.5s ease-in-out infinite;
}
.node-running .node-card { stroke: var(--purple); }
.node-running .node-glow { stroke: var(--purple); opacity: 0.2; }

.node-gated .node-card { stroke: var(--amber); }
.node-gated .node-glow { stroke: var(--amber); }

.node-pending {
  opacity: 0.45;
}
.node-pending .node-card { stroke-dasharray: 5 4; }

.node-selected .node-card {
  stroke: var(--blue);
  stroke-width: 2;
}
.node-selected .node-glow {
  stroke: var(--blue);
  opacity: 0.25;
}

/* Status Indicators */
.status-ring {
  fill: none;
  stroke-width: 2;
  stroke-linecap: round;
}

.ring-complete { stroke: var(--green); }
.ring-running {
  stroke: var(--purple);
  stroke-dasharray: 16 50;
  transform-origin: center;
  animation: spin 1.2s linear infinite;
}
.ring-gated { stroke: var(--amber); }

/* Check Icon */
.check-icon {
  fill: none;
  stroke: var(--green);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* Gate Badge */
.gate-badge {
  fill: rgba(245, 158, 11, 0.15);
  stroke: var(--amber);
  stroke-width: 1;
  rx: 5;
}

.gate-text {
  font-size: 8px;
  fill: var(--amber);
  font-weight: 700;
  font-family: var(--font-sans);
}
```

### 4. DAG Edges with Starlight

```css
/* Edge Base */
.edge {
  fill: none;
  stroke-width: 2.5;
  stroke-linecap: round;
  transition: stroke var(--transition-theme);
}

/* Edge States */
.edge-base {
  stroke: var(--border-primary);
}

.edge-complete {
  stroke: var(--green);
  filter: drop-shadow(0 0 4px var(--green-glow));
}

.edge-active {
  stroke: url(#activeGrad);
  filter: drop-shadow(0 0 6px var(--purple-glow));
  animation: edgeGlow 2s ease-in-out infinite;
}

.edge-gated {
  stroke: var(--amber);
  stroke-dasharray: 8 6;
  filter: drop-shadow(0 0 4px var(--amber-glow));
}

.edge-pending {
  stroke: var(--border-primary);
  stroke-dasharray: 4 4;
  stroke-opacity: 0.4;
}

/* Star Particles on Edges */
.star-particle {
  fill: #fff;
  filter: drop-shadow(0 0 3px #fff) drop-shadow(0 0 6px rgba(255, 255, 255, 0.5));
}

.edge-star {
  offset-rotate: 0deg;
  animation: starPath 2.5s linear infinite;
}

/* SVG Gradient Definition */
/*
<linearGradient id="activeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
  <stop offset="0%" stop-color="#8b5cf6"/>
  <stop offset="50%" stop-color="#a78bfa"/>
  <stop offset="100%" stop-color="#6366f1"/>
</linearGradient>
*/
```

### 5. Minimap

```css
.minimap {
  position: absolute;
  bottom: 20px;
  left: 20px;
  width: 140px;
  height: 100px;
  background: var(--bg-card);
  backdrop-filter: blur(20px);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-primary);
  padding: 10px;
  cursor: pointer;
  transition: all var(--transition-normal), background var(--transition-theme);
}

.minimap:hover {
  transform: scale(1.05);
  box-shadow: var(--shadow-lg);
}

.minimap-label {
  position: absolute;
  bottom: 100%;
  left: 0;
  font-size: 9px;
  color: var(--text-muted);
  margin-bottom: 6px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.minimap-node {
  rx: 2;
  transition: fill 0.2s;
}

.minimap-node.active { fill: var(--purple); }
.minimap-node.complete { fill: var(--green); }
.minimap-node.gated { fill: var(--amber); }
.minimap-node.pending { fill: var(--text-muted); opacity: 0.4; }

.minimap-viewport {
  fill: rgba(139, 92, 246, 0.1);
  stroke: var(--purple);
  stroke-width: 1.5;
  rx: 3;
  cursor: move;
}
```

### 6. Toolbar

```css
.toolbar {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 4px;
  padding: 6px;
  background: var(--bg-card);
  backdrop-filter: blur(20px);
  border-radius: var(--radius-xl);
  border: 1px solid var(--border-primary);
  transition: background var(--transition-theme);
}

.toolbar-btn {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.toolbar-btn:hover {
  background: var(--border-primary);
  color: var(--text-primary);
}

.toolbar-btn.active {
  background: rgba(139, 92, 246, 0.15);
  color: var(--purple);
}

.toolbar-divider {
  width: 1px;
  background: var(--border-primary);
  margin: 6px 4px;
}
```

### 7. Detail Panel

```css
.detail-panel {
  background: var(--bg-elevated);
  backdrop-filter: blur(20px);
  border-left: 1px solid var(--border-secondary);
  display: flex;
  flex-direction: column;
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), 
              opacity 0.3s, 
              background var(--transition-theme);
}

/* Slide out animation */
.detail-panel.hidden {
  transform: translateX(100%);
  opacity: 0;
}

.detail-header {
  padding: 20px;
  border-bottom: 1px solid var(--border-secondary);
  display: flex;
  align-items: flex-start;
  gap: 14px;
  animation: expandIn 0.4s ease-out;
}

.detail-icon {
  width: 50px;
  height: 50px;
  border-radius: var(--radius-xl);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  border: 1px solid var(--border-primary);
}

.detail-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.detail-type {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.detail-close {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 18px;
  color: var(--text-muted);
  transition: all 0.2s;
}

.detail-close:hover {
  background: var(--border-primary);
  color: var(--text-primary);
}

/* Status Tags */
.detail-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: var(--radius-full);
  font-size: 10px;
  font-weight: 600;
}

.status-running {
  background: rgba(139, 92, 246, 0.15);
  color: var(--purple);
}

.status-gated {
  background: rgba(245, 158, 11, 0.15);
  color: var(--amber);
}

.status-complete {
  background: rgba(16, 185, 129, 0.15);
  color: var(--green);
}

/* Detail Sections */
.detail-section {
  padding: 20px;
  border-bottom: 1px solid var(--border-secondary);
  animation: expandIn 0.4s ease-out backwards;
}

.detail-section:nth-child(2) { animation-delay: 0.1s; }
.detail-section:nth-child(3) { animation-delay: 0.2s; }

.section-card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 14px;
  border: 1px solid var(--border-primary);
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.info-item {
  background: var(--bg-card);
  border-radius: var(--radius-md);
  padding: 12px;
  border: 1px solid var(--border-primary);
}

.info-label {
  font-size: 9px;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.info-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}
```

### 8. Gate Actions

```css
.gate-actions {
  padding: 24px;
  background: linear-gradient(180deg, 
    rgba(245, 158, 11, 0.08), 
    rgba(234, 179, 8, 0.04)
  );
  border-top: 1px solid rgba(245, 158, 11, 0.2);
  animation: expandIn 0.4s ease-out 0.3s backwards;
}

.gate-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--amber);
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.gate-desc {
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 14px;
  line-height: 1.5;
}

.gate-btns {
  display: flex;
  gap: 10px;
}

.gate-btn {
  flex: 1;
  padding: 12px;
  border-radius: var(--radius-md);
  font-size: 11px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-approve {
  background: linear-gradient(135deg, var(--green), #059669);
  color: #fff;
}

.btn-approve:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.btn-modify {
  background: var(--bg-card);
  color: var(--text-primary);
  border: 1px solid var(--border-primary);
}

.btn-modify:hover {
  background: var(--bg-hover);
}

.btn-reject {
  background: rgba(239, 68, 68, 0.1);
  color: var(--red-light);
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.btn-reject:hover {
  background: rgba(239, 68, 68, 0.15);
}
```

---

## Animation System

### Keyframes

```css
/* ===== NODE ANIMATIONS ===== */

/* Node Enter - Scale in */
@keyframes nodeEnter {
  from {
    opacity: 0;
    transform: scale(0.85);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Running State - Gentle float */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

/* Selected Ripple */
@keyframes ripple {
  0% {
    transform: scale(1);
    opacity: 0.5;
  }
  100% {
    transform: scale(2.5);
    opacity: 0;
  }
}

/* ===== EDGE ANIMATIONS ===== */

/* Edge Glow Pulse */
@keyframes edgeGlow {
  0%, 100% {
    stroke-opacity: 0.6;
    filter: drop-shadow(0 0 3px var(--glow-color));
  }
  50% {
    stroke-opacity: 1;
    filter: drop-shadow(0 0 8px var(--glow-color));
  }
}

/* Star Particle Flow */
@keyframes starPath {
  0% {
    offset-distance: 0%;
    opacity: 0;
  }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% {
    offset-distance: 100%;
    opacity: 0;
  }
}

/* ===== COSMIC ANIMATIONS ===== */

/* Star Twinkle */
@keyframes twinkle {
  0%, 100% {
    opacity: 0.2;
    transform: scale(0.8);
  }
  50% {
    opacity: 1;
    transform: scale(1.2);
  }
}

@keyframes twinkle2 {
  0%, 100% { opacity: 0.1; }
  30% { opacity: 0.8; }
  60% { opacity: 0.3; }
}

/* Nebula Drift */
@keyframes nebulaDrift {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(15px, -10px) scale(1.1);
  }
}

/* Shooting Star */
@keyframes shootingStar {
  0% {
    transform: translateX(0) translateY(0);
    opacity: 1;
  }
  100% {
    transform: translateX(80px) translateY(80px);
    opacity: 0;
  }
}

/* ===== UI ANIMATIONS ===== */

/* Spinner */
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Pulse */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Panel Expand */
@keyframes expandIn {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
```

### Animation Usage

| Animation | Duration | Easing | Usage |
|-----------|----------|--------|-------|
| `nodeEnter` | 0.4s | ease-out | Node appearance |
| `float` | 2.5s | ease-in-out | Running nodes |
| `twinkle` | 3-5s | ease-in-out | Star particles |
| `starPath` | 2-3s | linear | Edge particles |
| `edgeGlow` | 2s | ease-in-out | Active edges |
| `nebulaDrift` | 25s | ease-in-out | Nebula clouds |
| `spin` | 1.2s | linear | Loading spinners |
| `expandIn` | 0.4s | ease-out | Panel content |

---

## AI Implementation Guide

### 🤖 Prompt Template for AI Implementation

Use this prompt when asking AI to implement the Weave design:

```markdown
# Task: Implement Weave DAG Visualization Interface

## Context
Weave is an AI Agent DAG observability layer with:
- Real-time generative DAG visualization
- Step Gate human intervention
- Theme switching (Light/Dark)
- Cosmic visual effects in dark mode

## Design Requirements

### 1. Layout Structure
- Header (56px): Logo 🌌, task pill, theme toggle
- Three-column layout: Tasks (280px) | DAG Canvas (flex) | Details (320px)
- Panels use backdrop-filter: blur(20px)

### 2. Theme System
- CSS variables for all colors (see design system)
- Toggle via .light-theme class on root
- Smooth 0.4s transitions between themes

### 3. Node Types & States
Types: LLM (🧠), Tool (⚡), Gate (🛡️), Input (📥), Output (✨)
States: Complete (green), Running (purple + float), Gated (amber), Pending (dim)

### 4. Required Animations
- Node enter: scale 0.85→1, 0.4s
- Running: float ±3px, 2.5s loop
- Edges: star particles flow along path
- Stars: twinkle effect in dark mode

### 5. Key Interactions
- Click node → show details panel (slide in)
- Gate nodes → show Approve/Edit/Skip buttons
- Minimap → draggable viewport
- Theme toggle → switch with transition

## Technical Constraints
- Use SVG for DAG rendering
- CSS offset-path for edge particles
- No external animation libraries
- Support for dynamic node addition

## Output
Provide complete React/Vue component with:
1. Component structure
2. CSS/SCSS styles following the design system
3. Animation implementations
4. Theme toggle logic
```

### 📝 Step-by-Step Implementation Checklist

```markdown
## Phase 1: Foundation
- [ ] Set up CSS variables for both themes
- [ ] Create base layout structure (header, 3-column)
- [ ] Implement theme toggle with localStorage persistence
- [ ] Add backdrop-filter blur to panels

## Phase 2: DAG Canvas
- [ ] Create SVG viewBox with proper dimensions
- [ ] Implement node components (rect + icon + text)
- [ ] Add curved bezier edges between nodes
- [ ] Style nodes by state (complete/running/gated/pending)

## Phase 3: Cosmic Effects (Dark Mode Only)
- [ ] Generate 60+ star elements dynamically
- [ ] Add 3 nebula gradient blobs
- [ ] Implement shooting stars (3 with staggered delays)
- [ ] Add cosmic grid background

## Phase 4: Edge Starlight
- [ ] Define SVG path for each edge
- [ ] Create star particles with offset-path
- [ ] Animate particles along edge paths
- [ ] Add glow filter to active edges

## Phase 5: Interactions
- [ ] Node click → select + show details
- [ ] Node hover → scale + glow
- [ ] Minimap viewport drag
- [ ] Gate actions (approve/edit/skip)

## Phase 6: Animations
- [ ] Node enter animation (staggered)
- [ ] Float animation for running nodes
- [ ] Pulse animation for status indicators
- [ ] Panel slide-in animation

## Phase 7: Polish
- [ ] Smooth theme transitions
- [ ] Hover states for all interactive elements
- [ ] Loading states
- [ ] Error states
```

### 🎨 Quick Reference Card

```
┌─────────────────────────────────────────────────────────┐
│  WEAVE DESIGN QUICK REFERENCE                           │
├─────────────────────────────────────────────────────────┤
│  COLORS                                                 │
│  Purple: #8b5cf6  │  LLM, Running, Active              │
│  Green:  #10b981  │  Complete, Success                 │
│  Amber:  #f59e0b  │  Gate, Warning                     │
│  Blue:   #3b82f6  │  Tool, Selected                    │
├─────────────────────────────────────────────────────────┤
│  ANIMATIONS                                             │
│  Float:     2.5s ease-in-out  │  ±3px vertical         │
│  Enter:     0.4s ease-out     │  scale 0.85→1          │
│  Glow:      2s ease-in-out    │  shadow pulse          │
│  Stars:     2-3s linear       │  offset-path flow      │
├─────────────────────────────────────────────────────────┤
│  SPACING                                                │
│  Panel padding:  20px                                   │
│  Card padding:   14px                                   │
│  Gap small:      10px                                   │
│  Gap medium:     16px                                   │
│  Border radius:  14px (cards), 10px (buttons)          │
├─────────────────────────────────────────────────────────┤
│  NODE DIMENSIONS                                        │
│  Width:      150-160px                                  │
│  Height:     52-60px                                    │
│  Icon:       30-32px                                    │
│  Radius:     14px                                       │
└─────────────────────────────────────────────────────────┘
```

---

## File Structure Recommendation

```
weave/
├── src/
│   ├── styles/
│   │   ├── variables.css      # All CSS variables
│   │   ├── animations.css     # All @keyframes
│   │   ├── theme-light.css    # Light theme overrides
│   │   └── components/
│   │       ├── header.css
│   │       ├── dag-canvas.css
│   │       ├── node.css
│   │       ├── edge.css
│   │       ├── minimap.css
│   │       ├── toolbar.css
│   │       ├── detail-panel.css
│   │       └── cosmic-bg.css
│   │
│   ├── components/
│   │   ├── WeaveApp.tsx
│   │   ├── Header/
│   │   ├── DAGCanvas/
│   │   │   ├── Node.tsx
│   │   │   ├── Edge.tsx
│   │   │   └── StarParticle.tsx
│   │   ├── Minimap/
│   │   ├── Toolbar/
│   │   ├── DetailPanel/
│   │   └── CosmicBackground/
│   │
│   └── hooks/
│       ├── useTheme.ts
│       ├── useDAG.ts
│       └── useNodeSelection.ts
```

---

*Last Updated: 2024*
*Version: 1.0*
*Design System for Weave - AI Agent DAG Observability Layer*
