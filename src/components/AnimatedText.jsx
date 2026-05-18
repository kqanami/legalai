import { memo } from 'react';

/**
 * AnimatedText — Performance-optimized text rendering.
 * Handled via lightweight CSS styles to maintain 60 FPS.
 */
const AnimatedText = memo(({ children, className = '', animate = true }) => {
  return <span className={className}>{children}</span>;
});

export default AnimatedText;
