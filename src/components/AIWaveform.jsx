import { useEffect, useState, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DB_DOCS = [
  'ГК РК — статья 147 (Сделки)',
  'ТК РК — статья 33 (Трудовой договор)',
  'НК РК — статья 683 (Спец. режимы)',
  'Закон о ТОО — статья 39 (Устав)',
  'ГК РК — статья 378 (Договор)',
  'УК РК — статья 248 (Коммерч. тайна)',
  'КоАП РК — статья 272 (Штрафы)',
  'Закон о браке и семье — статья 21',
  'ГПК РК — статья 152 (Исковое заявление)',
  'ТК РК — статья 52 (Увольнение по инициативе)',
  'Конституция — статья 12 (Права человека)',
  'НК РК — статья 687 (Упрощенная декларация)'
];

export default memo(function AIWaveform({ label = 'Анализ правовой базы...' }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [activeLaw, setActiveLaw] = useState(DB_DOCS[0]);
  const lawIndexRef = useRef(0);

  // Lightning-fast and snappy RAG progress timeline
  useEffect(() => {
    const timer1 = setTimeout(() => setCurrentStep(2), 650);
    const timer2 = setTimeout(() => setCurrentStep(3), 1350);
    const timer3 = setTimeout(() => setCurrentStep(4), 2200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  // Sequential database crawler simulation (avoids random jank from repeated identical picks)
  useEffect(() => {
    const interval = setInterval(() => {
      lawIndexRef.current = (lawIndexRef.current + 1) % DB_DOCS.length;
      setActiveLaw(DB_DOCS[lawIndexRef.current]);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Siri/Apple-Intelligence inspired Fluid Waveform Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = 80;
    const height = 80;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);

    let time = 0;
    let lastTime = performance.now();
    let isActive = true;
    
    // Glowing database particles
    const particles = Array.from({ length: 12 }, () => ({
      x: Math.random() * width,
      y: height + Math.random() * 20,
      speedY: 0.35 + Math.random() * 0.45,
      size: 0.6 + Math.random() * 1.1,
      opacity: 0.3 + Math.random() * 0.5,
      wiggleFreq: 0.02 + Math.random() * 0.025
    }));

    const draw = (now) => {
      if (!isActive) return;
      
      ctx.clearRect(0, 0, width, height);
      
      const dt = Math.min((now - lastTime) / 1000, 0.05); // Clamp dt to 50ms max to prevent jumps
      lastTime = now;
      
      const fpsScale = dt * 60;
      time += dt * 110;

      // 1. Solid dark background space
      ctx.fillStyle = '#0a0a0a';
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, width / 2 - 2, 0, Math.PI * 2);
      ctx.fill();

      // Clip drawings to the circular fluid orb
      ctx.save();
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, width / 2 - 2, 0, Math.PI * 2);
      ctx.clip();

      // 2. Draw Floating Data Particles
      particles.forEach((p) => {
        p.y -= p.speedY * fpsScale;
        p.x += Math.sin(p.y * p.wiggleFreq) * 0.3 * fpsScale;
        
        if (p.y < 0) {
          p.y = height + Math.random() * 15;
          p.x = Math.random() * width;
        }

        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // 3. Draw Overlapping Liquid Sine Waves
      const drawWave = (offset, amplitude, frequency, speed, color1, color2) => {
        ctx.beginPath();
        const grad = ctx.createLinearGradient(0, 0, width, 0);
        grad.addColorStop(0, color1);
        grad.addColorStop(0.5, color2);
        grad.addColorStop(1, color1);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;

        for (let x = 0; x <= width; x++) {
          const y = Math.sin(x * frequency + (time * speed) + offset) * 
                    Math.cos(x * 0.015 + (time * 0.004)) * 
                    amplitude + (height / 2);
          
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      };

      // Wave 1: Base
      const amp1 = 8 + 3 * Math.sin(time * 0.01);
      drawWave(0, amp1, 0.055, 0.008, 'rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.3)');

      // Wave 2: Midlayer
      const amp2 = 6 + 2 * Math.cos(time * 0.015);
      drawWave(Math.PI / 2, amp2, 0.075, -0.012, 'rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.5)');

      // Wave 3: Forefront
      const amp3 = 4 + 1.2 * Math.sin(time * 0.02);
      drawWave(Math.PI, amp3, 0.095, 0.016, 'rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.8)');

      ctx.restore();

      // 4. Double Rings
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, width / 2 - 1, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, width / 2 - 3, 0, Math.PI * 2);
      ctx.stroke();

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => {
      isActive = false;
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  const steps = [
    { id: 1, label: 'Подготовка к анализу' },
    { id: 2, label: 'Поиск по кодексам Республики Казахстан' },
    { id: 3, label: 'Оценка и сопоставление законов' },
    { id: 4, label: 'Формирование юридического ответа' }
  ];

  return (
    <motion.div
      className="p-5 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden bg-neutral-900 shadow-xl relative"
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 8 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      layout={false}
    >
      {/* Header Accent */}
      <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
        <span className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
          {label}
        </span>
        <span className="text-[9px] font-mono text-neutral-500 bg-neutral-800 px-2 py-0.5 rounded">
          СИСТЕМА АКТИВНА
        </span>
      </div>

      <div className="flex items-center gap-6">
        {/* Visualizer Orb Container */}
        <div className="relative shrink-0 flex items-center justify-center p-0.5 rounded-full bg-gradient-to-tr from-neutral-800 via-white/20 to-neutral-800 border border-white/10 shadow-lg">
          <div className="relative rounded-full overflow-hidden bg-black flex items-center justify-center">
            <canvas ref={canvasRef} className="rounded-full" />
          </div>
          
          {/* Subtle breathing glow behind orb */}
          <div className="absolute -inset-2 rounded-full bg-white/5 blur-xl pointer-events-none" />
        </div>

        {/* Legal Progress Stepper Checklist */}
        <div className="flex-1 min-w-0 relative flex flex-col gap-3.5 pl-5">
          
          {/* Vertical stepper line */}
          <div className="absolute left-[7px] top-[7px] bottom-[7px] w-[1.5px] bg-neutral-800 rounded-full overflow-hidden">
            <motion.div 
              className="w-full bg-white h-full"
              style={{ transformOrigin: 'top' }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: (currentStep - 1) / 3 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>

          {steps.map((step) => {
            const isCompleted = currentStep > step.id;
            const isActive = currentStep === step.id;
            
            return (
              <div 
                key={step.id} 
                className="flex items-center gap-3 relative z-10"
              >
                {/* Stepper Bullet */}
                <div className="shrink-0 flex items-center justify-center w-4 h-4 bg-neutral-900 rounded-full">
                  {isCompleted ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      className="w-4 h-4 rounded-full bg-white flex items-center justify-center text-black"
                    >
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </motion.div>
                  ) : isActive ? (
                    <div
                      className="w-3.5 h-3.5 rounded-full border border-white"
                      style={{ borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }}
                    />
                  ) : (
                    <div className="w-2.5 h-2.5 rounded-full border border-neutral-700 bg-neutral-800" />
                  )}
                </div>

                {/* Step text */}
                <span 
                  className={`text-[11px] font-medium tracking-wide truncate transition-all duration-300 ${
                    isActive 
                      ? 'text-white font-semibold' 
                      : isCompleted 
                      ? 'text-neutral-500 line-through' 
                      : 'text-neutral-600'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Database Crawler Log with smooth transition */}
      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] font-mono">
        <span className="text-neutral-400 flex items-center gap-2 truncate max-w-[280px]">
          <span className="text-white font-bold" style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>▶</span>
          <span className="inline-flex items-center min-w-0 truncate">
            <span className="text-neutral-500 mr-1.5 shrink-0">Проверка:</span>
            <span className="h-4 flex items-center overflow-hidden">
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={activeLaw}
                  initial={{ opacity: 0, y: 8, filter: 'blur(2px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -8, filter: 'blur(2px)' }}
                  transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                  className="truncate text-white"
                  style={{ position: 'absolute' }}
                >
                  {activeLaw}
                </motion.span>
              </AnimatePresence>
            </span>
          </span>
        </span>
        <span className="text-neutral-600 shrink-0 font-medium tracking-wider">
          ДОСТУП ОТКРЫТ
        </span>
      </div>
    </motion.div>
  );
});
