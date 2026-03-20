import { useState, useEffect } from 'react';

export type PerformanceTier = 'high' | 'low';

export function usePerformance() {
  const [tier, setTier] = useState<PerformanceTier>('high');

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setTier('low');
        return;
      }

      const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();
        // 检测常见的软件渲染器（无 GPU 环境）
        if (
          renderer.includes('swiftshader') || 
          renderer.includes('llvmpipe') || 
          renderer.includes('software') ||
          renderer.includes('virtualbox')
        ) {
          setTier('low');
          return;
        }
      }
      
      // 如果没有扩展信息，通过尝试渲染简单场景来简单评估（此处暂略，默认为高）
      setTier('high');
    } catch (e) {
      setTier('low');
    }
  }, []);

  useEffect(() => {
    if (tier === 'low') {
      document.documentElement.classList.add('perf-low');
    } else {
      document.documentElement.classList.remove('perf-low');
    }
  }, [tier]);

  return tier;
}