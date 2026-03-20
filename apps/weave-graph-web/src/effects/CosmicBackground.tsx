import React from 'react';
import { StarCanvas } from './StarCanvas';
import { usePerformance } from '../hooks/usePerformance';

export const CosmicBackground: React.FC = () => {
  const tier = usePerformance();
  const isLow = tier === 'low';

  // CPU 模式下减小模糊半径，显著提升渲染速度
  const blurRadius = isLow ? '40px' : '80px';
  const nebulaOpacity = isLow ? 0.06 : 0.1;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        transition: 'opacity 0.4s ease',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        zIndex: 0, // 改为 0，确保在所有透明容器之下，但在渲染层之上
        background: '#09090b', // 显式设置曜石黑底色
      }}
      className="cosmic-bg"
    >
      {/* 恢复三团星云 */}
      <div
        style={{
          position: 'absolute',
          width: 500, height: 500,
          background: `radial-gradient(circle, rgba(139, 92, 246, ${nebulaOpacity}), transparent 70%)`,
          top: -150, right: -100,
          borderRadius: '50%',
          filter: `blur(${blurRadius})`,
          animation: 'nebula-drift 25s ease-in-out infinite',
          willChange: 'transform',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 400, height: 400,
          background: `radial-gradient(circle, rgba(99, 102, 241, ${nebulaOpacity * 0.8}), transparent 70%)`,
          bottom: -100, left: -100,
          borderRadius: '50%',
          filter: `blur(${blurRadius})`,
          animation: 'nebula-drift 25s ease-in-out infinite',
          animationDelay: '-10s',
          willChange: 'transform',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 300, height: 300,
          background: `radial-gradient(circle, rgba(168, 85, 247, ${nebulaOpacity * 0.6}), transparent 70%)`,
          top: '50%', left: '40%',
          borderRadius: '50%',
          filter: `blur(${blurRadius})`,
          animation: 'nebula-drift 25s ease-in-out infinite',
          animationDelay: '-18s',
          willChange: 'transform',
        }}
      />
      
      {/* 宇宙网格 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px',
          opacity: isLow ? 0.5 : 1,
        }}
      />
      <StarCanvas tier={tier} />
    </div>
  );
};