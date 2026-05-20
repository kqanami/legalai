import { motion } from 'framer-motion';

export default function Marquee({ items, direction = 'left', speed = 40 }) {
  const marqueeVariants = {
    animate: {
      x: direction === 'left' ? ['0%', '-50%'] : ['-50%', '0%'],
      transition: {
        x: {
          repeat: Infinity,
          repeatType: 'loop',
          duration: speed,
          ease: 'linear',
        },
      },
    },
  };

  return (
    <div className="relative w-full overflow-hidden bg-obsidian-900/50 py-4 border-y border-white/[0.04]">
      <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-r from-obsidian-950 via-transparent to-obsidian-950" />
      <motion.div
        className="flex whitespace-nowrap gap-8 items-center w-max"
        variants={marqueeVariants}
        animate="animate"
      >
        {/* Double the items for seamless loop */}
        {[...items, ...items].map((item, index) => (
          <div key={index} className="flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity duration-300">
            {item}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
