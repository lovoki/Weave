import React, { useState } from "react";

export function Incarnation({ onSummon }: { onSummon: (text: string) => void }) {
  const [inputValue, setInputValue] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleSummon = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isTransitioning) return;
    
    // 幽灵光标防范 (Ghost Cursor)
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    document.body.classList.remove('input-focused');
    
    setIsTransitioning(true);
    
    // 等待拉伸动画完成再真正进入DAG画布 (800ms)
    setTimeout(() => {
      onSummon(inputValue);
    }, 800);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 物理防误触 (Double Submit)
    if (e.key === "Enter" && inputValue.trim() && !isTransitioning) {
      e.preventDefault();
      handleSummon();
    }
  };

  return (
    <div className={`incarnation-container ${isTransitioning ? 'is-transitioning' : ''}`}>
      <div className="incarnation-logo">🌌</div>
      <div className="incarnation-title">WEAVE</div>
      <div className="incarnation-slogan">Visualizing Agent Workflows.</div>
      
      <div className="magic-input-wrapper">
        <div className="magic-input-inner">
          <input 
            type="text" 
            className="magic-input" 
            placeholder="给 Weave 输入一个指令..." 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => document.body.classList.add('input-focused')}
            onBlur={() => document.body.classList.remove('input-focused')}
            disabled={isTransitioning}
          />
          <button className="magic-send-btn" onClick={handleSummon} disabled={!inputValue.trim() || isTransitioning}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 16 8 12 22 8 8 12 2" fill="rgba(139, 92, 246, 0.15)"></polygon>
              <polygon points="12 2 20 8 16 8 12 2"></polygon>
              <polygon points="12 2 4 8 8 8 12 2"></polygon>
              <polygon points="16 8 20 8 12 22 16 8"></polygon>
              <polygon points="8 8 4 8 12 22 8 8"></polygon>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
