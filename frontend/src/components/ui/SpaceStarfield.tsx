import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  size: number;
  alpha: number;
  baseAlpha: number;
  twinkleSpeed: number;
  phase: number;
}

interface Spark {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export function SpaceStarfield({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.offsetWidth || window.innerWidth);
    let height = (canvas.height = canvas.offsetHeight || window.innerHeight);

    // 1. Generate Star Collection
    const starCount = Math.min(100, Math.floor((width * height) / 12000));
    const stars: Star[] = Array.from({ length: starCount }, () => {
      const baseAlpha = 0.15 + Math.random() * 0.45;
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        size: 0.6 + Math.random() * 1.2,
        alpha: baseAlpha,
        baseAlpha,
        twinkleSpeed: 0.01 + Math.random() * 0.02,
        phase: Math.random() * Math.PI * 2,
      };
    });

    // 2. Generate Ambient Thermal Sparks
    const sparkColors = ['rgba(249, 115, 22, ', 'rgba(239, 68, 68, ', 'rgba(34, 211, 238, '];
    const sparkCount = 24;
    const sparks: Spark[] = Array.from({ length: sparkCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 1.0 + Math.random() * 2.0,
      speedY: 0.15 + Math.random() * 0.35,
      speedX: (Math.random() - 0.5) * 0.2,
      color: sparkColors[Math.floor(Math.random() * sparkColors.length)],
      alpha: 0.2 + Math.random() * 0.4,
      life: Math.random() * 200,
      maxLife: 150 + Math.random() * 200,
    }));

    const onResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth || window.innerWidth;
      height = canvas.height = canvas.offsetHeight || window.innerHeight;
      stars.forEach((s) => {
        s.x = Math.random() * width;
        s.y = Math.random() * height;
      });
    };
    window.addEventListener('resize', onResize);

    // 3. Animation Loop
    let time = 0;
    const render = () => {
      animId = requestAnimationFrame(render);
      time += 1;
      ctx.clearRect(0, 0, width, height);

      // Draw Twinkling Stars
      stars.forEach((s) => {
        s.phase += s.twinkleSpeed;
        s.alpha = s.baseAlpha + Math.sin(s.phase) * (s.baseAlpha * 0.5);

        ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.05, s.alpha)})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Drifting Thermal Sparks
      sparks.forEach((sp) => {
        sp.y -= sp.speedY;
        sp.x += Math.sin(time * 0.02 + sp.life) * sp.speedX;
        sp.life += 1;

        if (sp.y < -10 || sp.life >= sp.maxLife) {
          sp.y = height + 10;
          sp.x = Math.random() * width;
          sp.life = 0;
        }

        const lifeRatio = sp.life / sp.maxLife;
        const fade = Math.sin(lifeRatio * Math.PI) * sp.alpha;

        // Subtle glow halo
        ctx.fillStyle = `${sp.color}${Math.max(0, fade)})`;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className || 'pointer-events-none absolute inset-0 h-full w-full contain-strict opacity-80'}
    />
  );
}
