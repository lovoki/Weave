# 🤖 AI Implementation Prompt Templates for Weave

> Use these prompts when asking AI (Claude, GPT-4, etc.) to implement the Weave design system

---

## 📋 Master Prompt Template

Copy and paste this complete prompt to get the best results:

```markdown
# Task: Implement Weave DAG Visualization Interface

## Project Overview
Weave is an AI Agent execution observability layer that visualizes agent workflows as a directed acyclic graph (DAG). The interface needs:
- Real-time generative DAG that grows as the Agent executes
- Step Gate for human intervention and parameter modification
- Theme switching between Light and Dark (Obsidian) modes
- Cosmic visual effects (stars, nebulas) in dark mode

## Design Language
- **Style**: Apple/Linear inspired - elegant minimalism
- **Logo**: 🌌 (Galaxy emoji with purple glow in dark mode)
- **Feel**: Professional yet cosmic, technical yet approachable

## Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│ HEADER (56px)                                           │
│ [🌌 Weave BETA] [task-pill] [theme-toggle]              │
├────────────┬─────────────────────────┬──────────────────┤
│ LEFT PANEL │      DAG CANVAS         │   DETAIL PANEL   │
│ (280px)    │      (flexible)         │     (320px)      │
│            │                         │                  │
│ Task List  │   [Nodes & Edges]       │  Node Inspector  │
│            │   [Minimap]             │  Gate Actions    │
│            │   [Toolbar]             │                  │
│            │                         │                  │
│ [Input]    │                         │                  │
└────────────┴─────────────────────────┴──────────────────┘
```

## Color System (CSS Variables)

### Dark Theme (Default)
```css
--bg-base: #09090b;
--bg-elevated: rgba(15, 15, 18, 0.85);
--bg-card: rgba(24, 24, 27, 0.85);
--text-primary: #fafafa;
--text-secondary: #a1a1aa;
--purple: #8b5cf6;  /* LLM, Running */
--green: #10b981;   /* Complete */
--amber: #f59e0b;   /* Gate */
--blue: #3b82f6;    /* Tool, Selected */
```

### Light Theme
```css
--bg-base: #f8f9fa;
--bg-elevated: #ffffff;
--text-primary: #1a1a2e;
--text-secondary: #6b7280;
```

## Node Types
| Type | Emoji | Color | Usage |
|------|-------|-------|-------|
| LLM | 🧠 | Purple | AI decision nodes |
| Tool | ⚡ | Blue | External service calls |
| Gate | 🛡️ | Amber | Human checkpoints |
| Input | 📥 | Green | Entry points |
| Output | ✨ | Pink | Results |

## Node States
| State | Visual Treatment |
|-------|------------------|
| Complete | Green border, checkmark |
| Running | Purple border, float animation (±3px, 2.5s), spinner |
| Gated | Amber border, glow pulse, "GATE" badge |
| Pending | 45% opacity, dashed border |
| Selected | Blue border, ripple effect |

## Required Animations
1. **Node Enter**: scale(0.85) → scale(1), opacity 0→1, duration 0.4s
2. **Float**: translateY(0) → translateY(-3px), 2.5s loop (running nodes)
3. **Edge Stars**: particles flow along bezier path using offset-path
4. **Twinkle**: opacity 0.2↔1, scale 0.8↔1.2, staggered timing
5. **Panel Slide**: translateX(20px) → translateX(0), 0.4s

## Cosmic Background (Dark Mode Only)
- 60+ star particles (small/medium/large sizes)
- 3 shooting stars with staggered delays
- 3 nebula blobs (purple gradient, blur 80px)
- Subtle grid lines (opacity 0.03)

## Edge Styling
- Use SVG bezier curves (C command) for natural paths
- Star particles animate along edge paths
- Active edges: purple gradient + glow filter
- Complete edges: solid green + subtle glow
- Gated edges: amber dashed + animation

## Interactions
1. Click node → Select + show detail panel (slide in)
2. Hover node → Scale 1.02 + brightness 1.1
3. Theme toggle → Smooth 0.4s transition
4. Minimap drag → Pan viewport
5. Gate buttons → Approve / Edit / Skip

## Technical Requirements
- Framework: [React/Vue/Svelte - specify your preference]
- Use CSS variables for theming
- SVG for DAG rendering
- CSS offset-path for edge particles
- No external animation libraries required
- Support dynamic node addition

## Output Format
Please provide:
1. Component structure with proper separation
2. Complete CSS following the design system
3. Animation implementations
4. Theme toggle logic with localStorage persistence
5. Comments explaining key decisions

## Quality Checklist
- [ ] Smooth theme transitions (no flash)
- [ ] Animations respect prefers-reduced-motion
- [ ] Proper z-index layering
- [ ] Consistent spacing using variables
- [ ] All interactive elements have hover states
```

---

## 🎯 Task-Specific Prompts

### Prompt: Create Theme System

```markdown
Create a theme switching system for Weave with these requirements:

1. CSS Variables for both themes:
   - Dark (Obsidian): #09090b base, rgba panels, purple accents
   - Light: #f8f9fa base, white panels, same accent colors

2. Toggle component:
   - Pill-shaped (44x26px)
   - Sliding circle with emoji (☀️/🌙)
   - Smooth 0.3s transition

3. Implementation:
   - Toggle .light-theme class on root element
   - Persist to localStorage
   - All color transitions should be 0.4s

4. Special handling:
   - Logo glow only in dark mode
   - Cosmic background fades out in light mode
   - Reduce glow effects in light mode

Provide the complete CSS variables and toggle component code.
```

### Prompt: Create Cosmic Background

```markdown
Create the cosmic background effect for Weave dark mode:

1. Stars Layer:
   - Generate 60+ star elements dynamically
   - 3 sizes: small (1px), medium (2px), large (3px with glow)
   - Twinkle animation with staggered delays
   - Random positioning across the canvas

2. Nebula Layer:
   - 3 gradient blobs with blur(80px)
   - Purple/indigo color palette
   - Slow drift animation (25s cycle)
   - Positioned at corners and center

3. Shooting Stars:
   - 3 shooting stars
   - Diagonal movement (translateX + translateY)
   - Fade out at end
   - Staggered 4s delays

4. Grid:
   - Subtle 32px grid lines
   - Opacity 0.03
   - Pulse animation (optional)

The entire layer should:
- Be pointer-events: none
- Fade out when switching to light theme
- Use CSS variables for colors

Provide HTML structure and complete CSS.
```

### Prompt: Create DAG Node Component

```markdown
Create the DAG node component for Weave:

## Node Structure (SVG)
```svg
<g class="node [state-class]">
  <ellipse class="node-glow"/>
  <rect class="node-card"/>
  <rect class="node-icon-bg"/>
  <text class="node-emoji"/>
  <text class="node-title"/>
  <text class="node-sub"/>
  <g class="node-status"/>
</g>
```

## Dimensions
- Card: 160x60px, border-radius 14px
- Icon bg: 32x32px, border-radius 10px
- Glow: ellipse rx=80 ry=32

## States
1. Complete: green border, checkmark icon
2. Running: purple border, float animation, spinner
3. Gated: amber border, glow pulse, "GATE" badge
4. Pending: 45% opacity, dashed border
5. Selected: blue border, ripple on click

## Interactions
- Hover: scale(1.02), brightness(1.1)
- Click: select state, trigger ripple, emit event

## Props Interface
```typescript
interface NodeProps {
  id: string;
  type: 'llm' | 'tool' | 'gate' | 'input' | 'output';
  status: 'complete' | 'running' | 'gated' | 'pending';
  title: string;
  subtitle?: string;
  position: { x: number; y: number };
  isSelected?: boolean;
  onClick?: (id: string) => void;
}
```

Provide React/Vue component with SVG rendering and all CSS.
```

### Prompt: Create Edge with Star Particles

```markdown
Create the DAG edge component with flowing star particles:

## Edge Path
- Use SVG bezier curves (C command)
- Example: `M 300,100 C 300,150 200,150 200,200`
- Stroke width: 2.5px, round linecap

## Edge States
1. Base: border-primary color
2. Complete: green + drop-shadow glow
3. Active: purple gradient + glow + particles
4. Gated: amber + dash animation
5. Pending: 40% opacity, dashed

## Star Particles (for active edges)
- 2-4 particles per edge
- Use CSS offset-path to follow the bezier
- Animation: 2-3s linear infinite
- Fade in at start, fade out at end
- White color with glow filter

## Implementation
```css
.star-particle {
  offset-path: path('M 300,100 C 300,150 200,150 200,200');
  animation: starPath 2.5s linear infinite;
}

@keyframes starPath {
  0% { offset-distance: 0%; opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { offset-distance: 100%; opacity: 0; }
}
```

Provide SVG structure and complete CSS for all edge states.
```

### Prompt: Create Detail Panel

```markdown
Create the right-side detail panel for Weave:

## Layout
- Width: 320px
- Header: icon + title + type + status tag + close button
- Body: scrollable sections
- Footer: Gate actions (conditional)

## Sections
1. Node Info Header
   - 50x50px icon with gradient background
   - Node name (16px semibold)
   - Node type (11px muted)
   - Status tag (pill shape)

2. Input Parameters
   - Code block with syntax highlighting
   - Keys in purple, strings in green

3. Execution Info
   - 2x2 grid of info cards
   - Label + value layout

4. Gate Actions (if gated node)
   - Warning background gradient
   - Title with 🚦 emoji
   - Description text
   - 3 buttons: Approve (green), Edit, Skip (red)

## Animations
- Panel slides in from right (0.4s)
- Sections animate in with stagger (0.1s delay each)
- Close hides panel smoothly

## Props
```typescript
interface DetailPanelProps {
  node: NodeData | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove?: () => void;
  onModify?: () => void;
  onSkip?: () => void;
}
```

Provide component with complete styling.
```

---

## 📐 Quick Reference for AI

```
WEAVE DESIGN QUICK REFERENCE
============================

COLORS
------
Purple: #8b5cf6  │ LLM, Running, Active
Green:  #10b981  │ Complete, Success
Amber:  #f59e0b  │ Gate, Warning
Blue:   #3b82f6  │ Tool, Selected

ANIMATIONS
----------
Float:     2.5s ease-in-out  │ ±3px vertical
Enter:     0.4s ease-out     │ scale 0.85→1
Glow:      2s ease-in-out    │ shadow pulse
Stars:     2-3s linear       │ offset-path flow
Theme:     0.4s ease         │ all transitions

SPACING
-------
Panel padding:  20px
Card padding:   14px
Gap small:      10px
Gap medium:     16px
Border radius:  14px (cards), 10px (buttons)

NODE DIMENSIONS
---------------
Width:      150-160px
Height:     52-60px
Icon:       30-32px
Radius:     14px

FONTS
-----
Sans: -apple-system, BlinkMacSystemFont, 'SF Pro Display'
Mono: 'SF Mono', 'Fira Code', monospace

Logo:        16px / 600
Panel title: 13px / 600
Node title:  12px / 600
Node sub:    10px / 400
Label:       10px / 600 / uppercase
Code:        11px / 400
```

---

## ✅ Implementation Checklist

Use this checklist when reviewing AI output:

```markdown
## Foundation
- [ ] CSS variables defined for both themes
- [ ] Base layout structure (header + 3-column)
- [ ] Theme toggle functional with persistence
- [ ] Backdrop blur on elevated surfaces

## DAG Canvas
- [ ] SVG viewBox set correctly
- [ ] Nodes render with correct dimensions
- [ ] Edges use bezier curves
- [ ] States styled (complete/running/gated/pending)

## Cosmic Effects (Dark Mode)
- [ ] 60+ stars generated dynamically
- [ ] Stars have varied sizes and timings
- [ ] 3 nebula blobs with blur
- [ ] Shooting stars with staggered delays
- [ ] Effects fade in light mode

## Edge Starlight
- [ ] Paths defined for offset-path
- [ ] Star particles follow edge paths
- [ ] Particles fade in/out at ends
- [ ] Active edges have glow

## Interactions
- [ ] Node click → select + detail panel
- [ ] Node hover → scale + brightness
- [ ] Minimap viewport is draggable
- [ ] Gate actions work

## Animations
- [ ] Node enter (staggered timing)
- [ ] Float for running nodes
- [ ] Pulse for status indicators
- [ ] Panel slide in
- [ ] Respects prefers-reduced-motion

## Polish
- [ ] Smooth theme transitions (no flash)
- [ ] Consistent hover states
- [ ] Proper z-index layering
- [ ] Scrollbar styled
```

---

*Use these prompts to get consistent, high-quality implementations of the Weave design system.*
