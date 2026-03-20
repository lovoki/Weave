import { useCallback, useEffect, useRef, useState } from 'react';

export function useResizer(side: 'left' | 'right', defaultWidth: number, min: number, max: number) {
  const [isDragging, setIsDragging] = useState(false);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    document.documentElement.style.setProperty(`--panel-${side}-width`, `${defaultWidth}px`);
  }, [side, defaultWidth]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    document.body.classList.add('is-resizing');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (rafRef.current !== undefined) return;

    rafRef.current = requestAnimationFrame(() => {
      let newWidth = side === 'left' ? e.clientX : window.innerWidth - e.clientX;
      newWidth = Math.min(max, Math.max(min, newWidth));
      
      document.documentElement.style.setProperty(`--panel-${side}-width`, `${newWidth}px`);
      rafRef.current = undefined;
    });
  }, [side, min, max]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    document.body.classList.remove('is-resizing');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    if (rafRef.current !== undefined) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = undefined;
    }
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    } else {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  return { isDragging, handlePointerDown };
}