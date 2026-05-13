import { memo } from 'react';

/**
 * AnimatedText — Performance-optimized double-staggered animation.
 * 1. Uses Pure CSS animations for hardware acceleration.
 * 2. Tail-rendering: Only animates the last 400 characters to keep DOM light.
 * 3. Automatic cleanup: Returns to simple text when not active.
 */
const AnimatedText = memo(({ children, className = '', animate = true }) => {
  if (typeof children !== 'string') {
    return <div className={className}>{children}</div>;
  }

  // If message is finished and we are not in "animate" mode, render plain text.
  // This is a HUGE optimization for history.
  if (!animate) {
    return <span className={className}>{children}</span>;
  }

  const TEXT_THRESHOLD = 400; // Only animate the last 400 chars for streaming performance
  
  const textLength = children.length;
  const isLongText = textLength > TEXT_THRESHOLD;
  
  const staticPart = isLongText ? children.slice(0, textLength - TEXT_THRESHOLD) : '';
  const activePart = isLongText ? children.slice(textLength - TEXT_THRESHOLD) : children;

  const words = activePart.split(' ');
  let globalCharIndex = staticPart.length;

  return (
    <span className={className}>
      {/* Static part for long messages */}
      {staticPart && <span>{staticPart}</span>}
      
      {/* Animated active tail */}
      {words.map((word, wordIndex) => {
        const letters = word.split('');
        const wordDelay = Math.min(wordIndex * 0.05, 0.4);
        
        return (
          <span
            key={`w-${wordIndex}`}
            className="word-animate"
            style={{ 
              animationDelay: `${wordDelay}s`,
            }}
          >
            {letters.map((char, charIndex) => {
              const delay = Math.min((globalCharIndex++) * 0.005, 0.3);
              return (
                <span
                  key={`l-${charIndex}`}
                  className="letter-animate"
                  style={{ 
                    animationDelay: `${delay}s`,
                  }}
                >
                  {char}
                </span>
              );
            })}
            <span className="inline-block">&nbsp;</span>
          </span>
        );
      })}
    </span>
  );
});

export default AnimatedText;
