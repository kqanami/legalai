import { useEffect, useRef, memo } from 'react';

/**
 * Premium Abstract Canvas Background
 * Renders vibrant, elegant, glowing abstract waves/aurora and ambient particles.
 */
const LandingCanvas = memo(function LandingCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    let W, H, raf;
    let t = 0;
    
    // Mouse tracking for subtle parallax
    let mx = 0.5, my = 0.5;
    let tmx = 0.5, tmy = 0.5;

    const resize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const onMove = e => {
      tmx = e.clientX / W;
      tmy = e.clientY / H;
    };
    window.addEventListener('mousemove', onMove, { passive: true });

    // Particles for ambient dust
    const pCount = 120;
    const particles = Array.from({ length: pCount }, () => ({
      x: Math.random() * 2 - 0.5,
      y: Math.random() * 2 - 0.5,
      z: Math.random() * 0.8 + 0.2, // Depth
      vx: (Math.random() - 0.5) * 0.001,
      vy: (Math.random() - 0.5) * 0.001,
      size: Math.random() * 2 + 0.5,
      phase: Math.random() * Math.PI * 2,
      color: Math.random() > 0.5 ? [147, 197, 253] : [110, 231, 183], // blue or emerald hints
    }));

    // Wave parameters - MORE VIBRANT
    const waves = [
      { color: [79, 70, 229], amp: 0.35, freq: 1.2, speed: 0.001, yOff: 0.4 }, // Indigo
      { color: [16, 185, 129], amp: 0.25, freq: 2.0, speed: 0.0015, yOff: 0.5 }, // Emerald
      { color: [59, 130, 246], amp: 0.4, freq: 1.5, speed: 0.0008, yOff: 0.65 }, // Blue
      { color: [139, 92, 246], amp: 0.2, freq: 2.5, speed: 0.002, yOff: 0.8 }, // Purple
    ];

    const draw = () => {
      t += 1;
      mx += (tmx - mx) * 0.05;
      my += (tmy - my) * 0.05;

      // Base background (obsidian-950)
      ctx.fillStyle = '#050508';
      ctx.fillRect(0, 0, W, H);

      // Draw subtle aurora waves
      ctx.globalCompositeOperation = 'screen';
      
      const mouseOffset = (mx - 0.5) * 150;

      waves.forEach((w, idx) => {
        ctx.beginPath();
        ctx.moveTo(0, H);
        
        for (let x = 0; x <= W; x += 50) {
          const nx = x / W;
          // Complex sine wave generation
          const y = H * w.yOff 
            + Math.sin(nx * w.freq + t * w.speed + idx) * H * w.amp
            + Math.sin(nx * w.freq * 3 - t * w.speed * 1.5) * H * (w.amp * 0.4)
            + mouseOffset * (idx * 0.25); // Parallax effect
          
          ctx.lineTo(x, y);
        }
        
        ctx.lineTo(W, H);
        ctx.lineTo(0, H);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, `rgba(${w.color[0]}, ${w.color[1]}, ${w.color[2]}, 0)`);
        grad.addColorStop(w.yOff, `rgba(${w.color[0]}, ${w.color[1]}, ${w.color[2]}, 0.05)`);
        grad.addColorStop(1, `rgba(${w.color[0]}, ${w.color[1]}, ${w.color[2]}, 0.15)`);
        
        ctx.fillStyle = grad;
        ctx.fill();
      });

      // Draw ambient glowing particles
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around
        if (p.x < -0.5) p.x = 1.5;
        if (p.x > 1.5) p.x = -0.5;
        if (p.y < -0.5) p.y = 1.5;
        if (p.y > 1.5) p.y = -0.5;

        // Calculate screen position with parallax
        const px = (p.x + (mx - 0.5) * p.z * 0.6) * W;
        const py = (p.y + (my - 0.5) * p.z * 0.6) * H;
        
        // Only draw if on screen
        if (px > -20 && px < W + 20 && py > -20 && py < H + 20) {
          const alpha = (Math.sin(t * 0.02 + p.phase) * 0.5 + 0.5) * 0.6 * p.z;
          
          ctx.beginPath();
          ctx.arc(px, py, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, ${alpha})`;
          ctx.fill();
          
          // Stronger glow for larger particles
          if (p.size > 1.0) {
             const glow = ctx.createRadialGradient(px, py, 0, px, py, p.size * 6);
             glow.addColorStop(0, `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, ${alpha * 0.6})`);
             glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
             ctx.globalCompositeOperation = 'screen';
             ctx.fillStyle = glow;
             ctx.beginPath();
             ctx.arc(px, py, p.size * 6, 0, Math.PI * 2);
             ctx.fill();
             ctx.globalCompositeOperation = 'source-over';
          }
        }
      });
      
      // Radial vignette to darken edges and focus center
      ctx.globalCompositeOperation = 'source-over';
      const vig = ctx.createRadialGradient(W / 2, H / 2, W * 0.2, W / 2, H / 2, W * 0.85);
      vig.addColorStop(0, 'rgba(5, 5, 8, 0)');
      vig.addColorStop(1, 'rgba(5, 5, 8, 0.9)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);

      raf = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
    };
  }, []);

  return (
    <div className="absolute inset-0 bg-[#050508] pointer-events-none">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
});

export default LandingCanvas;
