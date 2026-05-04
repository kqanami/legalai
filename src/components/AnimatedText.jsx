import { motion } from 'framer-motion';

/**
 * AnimatedText — Word-by-word fade & slide-in for AI responses.
 * Creates a luxury "appearing" effect like premium AI assistants.
 */
export default function AnimatedText({ children, className = '' }) {
  if (typeof children !== 'string') {
    return <div className={className}>{children}</div>;
  }

  const words = children.split(' ');

  return (
    <span className={className}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          className="inline-block"
          initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{
            duration: 0.35,
            delay: i * 0.03,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
        >
          {word}&nbsp;
        </motion.span>
      ))}
    </span>
  );
}
