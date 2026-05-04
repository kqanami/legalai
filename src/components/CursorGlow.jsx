import { useEffect, useState, useCallback, memo } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

/**
 * CursorGlow — A spotlight that follows the cursor.
 * Strict metallic variant: Cold white/silver light on interactive elements.
 */
const CursorGlow = memo(function CursorGlow({ segment = null }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  const springX = useSpring(mouseX, { damping: 25, stiffness: 300 }); // Faster response
  const springY = useSpring(mouseY, { damping: 25, stiffness: 300 });

  // Cold metallic glow
  const glowColor = segment === 'b2b'
    ? 'rgba(255, 255, 255, 0.08)' // white/chrome
    : segment === 'b2c'
      ? 'rgba(203, 213, 225, 0.08)' // steel blue
      : 'rgba(255, 255, 255, 0.05)';

  const checkInteractive = useCallback((target) => {
    if (!target) return false;
    const tag = target.tagName?.toLowerCase();
    if (['button', 'a', 'input', 'textarea', 'select'].includes(tag)) return true;
    if (target.closest('button, a, [role="button"], .glass-card-hover, .btn-primary, .btn-secondary, .sidebar-link')) return true;
    return false;
  }, []);

  useEffect(() => {
    // Detect touch device
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      setIsTouch(true);
      return;
    }

    const onMove = (e) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      setIsVisible(checkInteractive(e.target));
    };

    const onLeave = () => setIsVisible(false);

    window.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', onLeave);

    return () => {
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
    };
  }, [mouseX, mouseY, checkInteractive]);

  if (isTouch) return null;

  return (
    <motion.div
      className="fixed pointer-events-none z-[9999] rounded-full"
      style={{
        left: springX,
        top: springY,
        width: 300,
        height: 300,
        x: -150,
        y: -150,
        background: `radial-gradient(circle, ${glowColor} 0%, transparent 60%)`,
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.2s ease',
        mixBlendMode: 'screen', // adds a nice highlight to dark backgrounds
      }}
    />
  );
});

export default CursorGlow;
