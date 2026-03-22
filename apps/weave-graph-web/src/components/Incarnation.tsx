import React, { useState } from "react";

export function Incarnation({ onSummon }: { onSummon: (text: string) => Promise<void> | void }) {
  const [inputValue, setInputValue] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSummon = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isTransitioning) return;
    setSubmitError(null);
    
    // 幽灵光标防范 (Ghost Cursor)
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    document.body.classList.remove('input-focused');
    
    setIsTransitioning(true);
    
    // 等待拉伸动画完成后再发起后端启动请求。
    await new Promise((resolve) => setTimeout(resolve, 800));
    try {
      await onSummon(inputValue);
    } catch (error) {
      setIsTransitioning(false);
      setSubmitError(error instanceof Error ? error.message : String(error));
    }
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
      <div className="incarnation-slogan">Observe. Intercept. Rewind.</div>
      
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
            <span className="comet-icon">☄️</span>
          </button>
        </div>
        {submitError ? (
          <div style={{ marginTop: 10, fontSize: 12, color: "#ff8f8f" }}>
            {submitError}
          </div>
        ) : null}
      </div>
    </div>
  );
}
