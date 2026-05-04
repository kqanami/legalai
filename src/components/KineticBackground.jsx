import { useEffect, useRef, memo } from 'react';

/**
 * KineticBackground — Mercury/liquid-metal metaball field + subtle grid.
 * Premium, strict, 60fps canvas animation.
 */
const KineticBackground = memo(function KineticBackground({ variant = 'landing' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height, animId;
    let mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    let time = 0;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    resize();
    window.addEventListener('resize', resize);

    const onMouseMove = (e) => { mouse.tx = e.clientX; mouse.ty = e.clientY; };
    window.addEventListener('mousemove', onMouseMove);

    // Mercury blobs
    const blobCount = variant === 'landing' ? 6 : 3;
    const blobs = Array.from({ length: blobCount }, (_, i) => ({
      x: Math.random() * (width || 1920),
      y: Math.random() * (height || 1080),
      r: 80 + Math.random() * 120,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      phase: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.4,
    }));

    // Grid params
    const gridSize = 60;
    const gridOpacity = variant === 'landing' ? 0.025 : 0.015;

    const draw = () => {
      time += 0.008;
      ctx.clearRect(0, 0, width, height);

      // Smooth mouse
      mouse.x += (mouse.tx - mouse.x) * 0.03;
      mouse.y += (mouse.ty - mouse.y) * 0.03;

      // ── Grid ──
      ctx.strokeStyle = `rgba(255, 255, 255, ${gridOpacity})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let x = 0; x < width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // ── Mercury blobs ──
      const mouseInfluence = 0.015;
      for (const b of blobs) {
        // Float + drift
        b.x += b.vx + Math.sin(time * b.speed + b.phase) * 0.3;
        b.y += b.vy + Math.cos(time * b.speed * 0.7 + b.phase) * 0.3;

        // Mouse repulsion
        const dx = b.x - mouse.x;
        const dy = b.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 300) {
          const force = (300 - dist) * mouseInfluence;
          b.x += (dx / dist) * force;
          b.y += (dy / dist) * force;
        }

        // Wrap
        if (b.x < -b.r * 2) b.x = width + b.r;
        if (b.x > width + b.r * 2) b.x = -b.r;
        if (b.y < -b.r * 2) b.y = height + b.r;
        if (b.y > height + b.r * 2) b.y = -b.r;

        // Pulsating radius
        const pulseR = b.r + Math.sin(time * 1.5 + b.phase) * 15;

        // Mercury gradient — metallic chrome
        const grad = ctx.createRadialGradient(
          b.x - pulseR * 0.2, b.y - pulseR * 0.3, pulseR * 0.05,
          b.x, b.y, pulseR
        );
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
        grad.addColorStop(0.3, 'rgba(203, 213, 225, 0.04)');
        grad.addColorStop(0.6, 'rgba(148, 163, 184, 0.02)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.beginPath();
        ctx.arc(b.x, b.y, pulseR, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Inner mercury highlight — bright core
        const highlightGrad = ctx.createRadialGradient(
          b.x - pulseR * 0.25, b.y - pulseR * 0.25, 0,
          b.x - pulseR * 0.1, b.y - pulseR * 0.1, pulseR * 0.4
        );
        highlightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
        highlightGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.beginPath();
        ctx.arc(b.x, b.y, pulseR * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = highlightGrad;
        ctx.fill();
      }

      // ── Connection lines between nearby blobs ──
      for (let i = 0; i < blobs.length; i++) {
        for (let j = i + 1; j < blobs.length; j++) {
          const a = blobs[i], b = blobs[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 400;
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.06;
            ctx.strokeStyle = `rgba(203, 213, 225, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            // Curved line through midpoint offset
            const mx = (a.x + b.x) / 2 + Math.sin(time + i) * 20;
            const my = (a.y + b.y) / 2 + Math.cos(time + j) * 20;
            ctx.quadraticCurveTo(mx, my, b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // ── Subtle scanline ──
      if (variant === 'landing') {
        const scanY = (time * 80) % (height + 200) - 100;
        const scanGrad = ctx.createLinearGradient(0, scanY - 50, 0, scanY + 50);
        scanGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        scanGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.012)');
        scanGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = scanGrad;
        ctx.fillRect(0, scanY - 50, width, 100);
      }

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(animId);
    };
  }, [variant]);

  return (
    <div className="absolute inset-0 bg-obsidian-950 pointer-events-none">
      <canvas ref={canvasRef} className="block w-full h-full" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#050508_85%)]" />
    </div>
  );
});

export default KineticBackground;
