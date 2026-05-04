import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

/**
 * AIWaveform — Strict metallic pulsating waveform indicator during AI response.
 * Futuristic and minimal.
 */
export default function AIWaveform({ label = 'ИИ анализирует правовую базу...' }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = 200;
    const H = 40;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr);

    let t = 0;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      t += 0.08; // slightly faster for more "cpu/computing" feel

      const mid = H / 2;
      const barCount = 30; // More bars for a precise frequency analyzer look
      const barWidth = 2;
      const gap = (W - barCount * barWidth) / (barCount + 1);

      for (let i = 0; i < barCount; i++) {
        const x = gap + i * (barWidth + gap);
        const freq1 = Math.sin(t + i * 0.5) * 0.5 + 0.5;
        const freq2 = Math.sin(t * 1.7 + i * 0.2) * 0.3 + 0.3;
        const freq3 = Math.sin(t * 0.9 + i * 0.8) * 0.2 + 0.2;
        const amplitude = (freq1 + freq2 + freq3) / 3;
        const h = 2 + amplitude * 14;

        // Strict metallic gradient per bar (chrome/white/steel)
        const grad = ctx.createLinearGradient(x, mid - h, x, mid + h);
        grad.addColorStop(0, `rgba(148, 163, 184, ${0.4 + amplitude * 0.6})`); // steel-400
        grad.addColorStop(0.5, `rgba(255, 255, 255, ${0.7 + amplitude * 0.3})`);   // white core
        grad.addColorStop(1, `rgba(148, 163, 184, ${0.4 + amplitude * 0.6})`); // steel-400

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, mid - h, barWidth, h * 2, 1);
        ctx.fill();
      }

      // Center orb glow - cold blue/white
      const orbGrad = ctx.createRadialGradient(W / 2, mid, 0, W / 2, mid, 60);
      orbGrad.addColorStop(0, `rgba(255, 255, 255, ${0.08 + Math.sin(t) * 0.04})`);
      orbGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = orbGrad;
      ctx.beginPath();
      ctx.arc(W / 2, mid, 60, 0, Math.PI * 2);
      ctx.fill();

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <motion.div
      className="flex items-center gap-5 px-1 py-1"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex flex-col gap-1 tracking-widest uppercase">
        <canvas ref={canvasRef} className="opacity-95" />
        <motion.span
          className="text-[9px] text-chrome-400 font-bold ml-2"
          animate={{ opacity: [0.4, 0.9, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        >
          {label}
        </motion.span>
      </div>
    </motion.div>
  );
}
