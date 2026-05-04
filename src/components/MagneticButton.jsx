import { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

/**
 * MagneticButton — element "magnetizes" toward cursor when hovering nearby.
 * Creates a physical, tactile feel. Includes shimmer light sweep on hover.
 */
import { Link } from 'react-router-dom';
const MotionLink = motion(Link);

export default function MagneticButton({
  children,
  className = '',
  onClick,
  as = 'button',
  href,
  target,
  rel,
  disabled = false,
  strength = 0.3,
  shimmer = true,
  ...props
}) {
  const ref = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springX = useSpring(x, { damping: 15, stiffness: 150 });
  const springY = useSpring(y, { damping: 15, stiffness: 150 });

  const handleMouse = (e) => {
    if (!ref.current || disabled) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set((e.clientX - centerX) * strength);
    y.set((e.clientY - centerY) * strength);
  };

  const handleLeave = () => {
    x.set(0);
    y.set(0);
    setIsHovered(false);
  };

  const MotionComponent = as === Link ? MotionLink : as === 'a' ? motion.a : motion.button;

  return (
    <MotionComponent
      ref={ref}
      href={href}
      target={target}
      rel={rel}
      onClick={onClick}
      disabled={disabled}
      className={`relative overflow-hidden ${className}`}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouse}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleLeave}
      whileTap={{ scale: 0.97 }}
      {...props}
    >
      {children}

      {/* Shimmer sweep */}
      {shimmer && (
        <span
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 45%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.15) 55%, transparent 60%)',
            transform: isHovered ? 'translateX(100%)' : 'translateX(-100%)',
            transition: 'transform 0.6s ease',
          }}
        />
      )}
    </MotionComponent>
  );
}
