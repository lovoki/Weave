import React from 'react';
import { useResizer } from '../../hooks/useResizer';

interface ResizerProps {
  side: 'left' | 'right';
  defaultWidth: number;
  min?: number;
  max?: number;
  isCollapsed?: boolean;
}

export const Resizer: React.FC<ResizerProps> = ({ side, defaultWidth, min = 240, max = 600, isCollapsed }) => {
  const { isDragging, handlePointerDown } = useResizer(side, defaultWidth, min, max);

  if (isCollapsed) return null;

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      onPointerDown={handlePointerDown}
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        [side === 'left' ? 'right' : 'left']: -3,
        width: 6,
        cursor: 'col-resize',
        zIndex: 50,
        backgroundColor: isDragging ? 'var(--border-active)' : 'transparent',
        transition: 'background-color var(--duration-fast)',
      }}
      onMouseEnter={(e) => {
        if (!isDragging) e.currentTarget.style.backgroundColor = 'var(--border-muted)';
      }}
      onMouseLeave={(e) => {
        if (!isDragging) e.currentTarget.style.backgroundColor = 'transparent';
      }}
    />
  );
};