import React, { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  size: number;
  alpha: number;
  speed: number;
}

interface ShootingStar {
  x: number;
  y: number;
  length: number;
  speed: number;
  active: boolean;
  delay: number;
}

export const StarCanvas: React.FC<{ tier?: 'high' | 'low' }> = ({ tier = 'high' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener('resize', handleResize);

    const starCount = tier === 'high' ? 150 : 100;
    const stars: Star[] = Array.from({ length: starCount }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() < 0.7 ? 0.8 : Math.random() < 0.9 ? 1.5 : 2.5,
      alpha: Math.random(),
      speed: (0.005 + Math.random() * 0.015) * (tier === 'high' ? 1 : 0.7),
    }));

    const shootingStarCount = tier === 'high' ? 3 : 2;
    const shootingStars: ShootingStar[] = Array.from({ length: shootingStarCount }).map(() => ({
      x: 0,
      y: 0,
      length: 80 + Math.random() * 50,
      speed: 15 + Math.random() * 10,
      active: false,
      delay: Math.random() * 200,
    }));

    let animationId: number;
    let lastTime = 0;
    const fpsLimit = tier === 'high' ? 0 : 1000 / 30;

    const render = (time: number) => {
      // 性能核心：如果正在拖拽节点或调整面板，暂停背景渲染，释放 CPU
      if (document.body.classList.contains('is-dragging-node') || document.body.classList.contains('is-resizing')) {
        animationId = requestAnimationFrame(render);
        return;
      }

      const currentWidth = window.innerWidth;
      const currentHeight = window.innerHeight;
      
      if (canvas.width !== currentWidth || canvas.height !== currentHeight) {
        canvas.width = currentWidth;
        canvas.height = currentHeight;
      }

      if (fpsLimit > 0) {
        const delta = time - lastTime;
        if (delta < fpsLimit) {
          animationId = requestAnimationFrame(render);
          return;
        }
        lastTime = time - (delta % fpsLimit);
      }

      ctx.clearRect(0, 0, currentWidth, currentHeight);

      // 绘制星星
      for (const star of stars) {
        star.alpha += star.speed;
        if (star.alpha > 1 || star.alpha < 0) {
          star.speed = -star.speed;
        }

        ctx.beginPath();
        ctx.arc(star.x % currentWidth, star.y % currentHeight, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, Math.min(1, star.alpha))})`;
        ctx.fill();
        
        if (tier === 'high' && star.size > 2) {
          ctx.shadowBlur = 6;
          ctx.shadowColor = "rgba(255,255,255,0.5)";
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // 绘制流星
      for (const ss of shootingStars) {
        if (!ss.active) {
          ss.delay--;
          if (ss.delay <= 0) {
            ss.active = true;
            ss.x = Math.random() * currentWidth;
            ss.y = Math.random() * (currentHeight / 2);
            ss.speed = 15 + Math.random() * 10;
          }
        } else {
          ss.x += ss.speed;
          ss.y += ss.speed;
          
          const grad = ctx.createLinearGradient(ss.x, ss.y, ss.x - ss.length, ss.y - ss.length);
          grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
          grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

          ctx.beginPath();
          ctx.moveTo(ss.x, ss.y);
          ctx.lineTo(ss.x - ss.length, ss.y - ss.length);
          ctx.lineWidth = tier === 'high' ? 1.5 : 1;
          ctx.strokeStyle = grad;
          ctx.stroke();

          if (ss.x > currentWidth + ss.length || ss.y > currentHeight + ss.length) {
            ss.active = false;
            ss.delay = 100 + Math.random() * 300;
          }
        }
      }

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, [tier]);

  return (
    <canvas 
      ref={canvasRef} 
      style={{ 
        display: 'block', 
        width: '100%', 
        height: '100%',
        background: 'transparent'
      }} 
    />
  );
};