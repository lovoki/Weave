import React from 'react';
import { StarCanvas } from './StarCanvas';
import { usePerformance } from '../hooks/usePerformance';

export const CosmicBackground: React.FC = () => {
  const tier = usePerformance();
  
  // 北斗七星 - 精确对齐中置位 (以左起第三颗星 Alioth 为中心点 500, 500)
  // 原始坐标偏移量: dx = 20, dy = 140
  const stars = [
    { x: 300, y: 440, id: 0 }, // 摇光
    { x: 400, y: 460, id: 1 }, // 开阳
    { x: 500, y: 520, id: 2 }, // 玉衡 - 正中心
    { x: 600, y: 560, id: 3 }, // 天权
    { x: 580, y: 690, id: 4 }, // 天玑
    { x: 720, y: 720, id: 5 }, // 天璇
    { x: 780, y: 590, id: 6 }  // 天枢
  ];

  // 路径：重新计算偏移后的矢量路径
  const linePath = "M 300 440 L 400 460 L 500 520 L 600 560 L 580 690 L 720 720 L 780 590 L 600 560";

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
      {/* 1. 核心背景渐变 - 对齐屏幕中心 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 50% 50%, rgba(45, 20, 80, 0.18) 0%, transparent 50%),
                       radial-gradient(circle at 20% 80%, rgba(20, 30, 70, 0.08) 0%, transparent 50%)`,
          zIndex: 1,
        }}
      />

      {/* 2. 北斗七星图腾层 */}
      <div style={{ 
        position: 'absolute', 
        inset: 0, 
        zIndex: 2,
        filter: 'drop-shadow(0 0 15px rgba(180, 138, 255, 0.15))' 
      }}>
        <svg width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          {/* 基础连线 */}
          <path
            className="constellation-path"
            d={linePath}
            fill="none"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth="0.6"
            strokeDasharray="2 6"
          />
          
          {/* 交互流光连线 */}
          <path
            className="constellation-active-line"
            d={linePath}
            fill="none"
            stroke="rgba(180, 138, 255, 0.35)"
            strokeWidth="1.0"
            strokeDasharray="5 10"
          />

          {/* 实体星点 */}
          {stars.map((s, i) => (
            <g key={i} className="constellation-star" style={{ "--star-index": i } as React.CSSProperties}>
              {/* 核心亮点 */}
              <circle cx={s.x} cy={s.y} r="1.5" fill="rgba(255, 255, 255, 0.9)" />
              {/* 晕染层 */}
              <circle cx={s.x} cy={s.y} r="5" fill="rgba(180, 138, 255, 0.1)" />
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
