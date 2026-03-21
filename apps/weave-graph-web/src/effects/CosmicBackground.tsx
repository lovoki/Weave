import React from 'react';
import { StarCanvas } from './StarCanvas';
import { usePerformance } from '../hooks/usePerformance';

export const CosmicBackground: React.FC = () => {
  const tier = usePerformance();
  
  // 北斗七星 - 黄金中置位 (X: 300-800, Y: 250-600)
  const stars = [
    { x: 300, y: 420, id: 0 }, 
    { x: 400, y: 440, id: 1 }, 
    { x: 500, y: 500, id: 2 }, 
    { x: 600, y: 540, id: 3 }, 
    { x: 580, y: 670, id: 4 }, 
    { x: 720, y: 700, id: 5 }, 
    { x: 780, y: 570, id: 6 }  
  ];

  const linePath = "M 300 420 L 400 440 L 500 500 L 600 540 L 580 670 L 720 700 L 780 570 L 600 540";

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
        background: '#09090b', 
      }}
      className="cosmic-bg"
    >
      {/* 1. 核心背景渐变 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 50% 50%, rgba(45, 20, 80, 0.18) 0%, transparent 50%),
                       radial-gradient(circle at 20% 80%, rgba(20, 30, 70, 0.08) 0%, transparent 50%)`,
          zIndex: 1,
        }}
      />

      {/* 2. 北斗七星图腾层 (SVG Mask 实现生长动画) */}
      <div style={{ 
        position: 'absolute', 
        inset: 0, 
        zIndex: 2,
        filter: 'drop-shadow(0 0 15px rgba(180, 138, 255, 0.15))' 
      }}>
        <svg width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <mask id="draw-mask">
              <path
                className="constellation-draw-mask"
                d={linePath}
                fill="none"
                stroke="white"
                strokeWidth="20"
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength="100"
              />
            </mask>
          </defs>

          {/* 基础连线 & 交互流光连线被 Mask 遮罩控制可见性 */}
          <g mask="url(#draw-mask)">
            <path
              d={linePath}
              fill="none"
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth="0.6"
              strokeDasharray="2 6"
            />
            <path
              className="constellation-active-line"
              d={linePath}
              fill="none"
              stroke="rgba(180, 138, 255, 0.35)"
              strokeWidth="1.0"
              strokeDasharray="5 10"
            />
          </g>

          {/* 实体星点，各自带有独立的进场动画类 */}
          {stars.map((s, i) => (
            <g key={i} className="constellation-star-node" style={{ "--star-index": i } as React.CSSProperties}>
              <g className="constellation-star">
                <circle cx={s.x} cy={s.y} r="1.5" fill="rgba(255, 255, 255, 0.9)" />
                <circle cx={s.x} cy={s.y} r="5" fill="rgba(180, 138, 255, 0.1)" />
              </g>
            </g>
          ))}
        </svg>
      </div>

      {/* 3. 宇宙网格 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.015) 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px',
          zIndex: 1,
        }}
      />
      
      <StarCanvas tier={tier} />
    </div>
  );
};
