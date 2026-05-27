import { memo } from 'react';
import { motion } from 'framer-motion';

export default memo(function AIWaveform({ label = 'Анализ запроса...' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      className="flex items-center gap-3 py-2 px-1"
    >
      <div className="flex gap-1.5 items-center">
        <motion.div 
          className="w-1.5 h-1.5 rounded-full bg-white/70" 
          animate={{ scale: [1, 1.4, 1], opacity: [0.3, 1, 0.3] }} 
          transition={{ duration: 1, repeat: Infinity, ease: "easeInOut", delay: 0 }} 
        />
        <motion.div 
          className="w-1.5 h-1.5 rounded-full bg-white/70" 
          animate={{ scale: [1, 1.4, 1], opacity: [0.3, 1, 0.3] }} 
          transition={{ duration: 1, repeat: Infinity, ease: "easeInOut", delay: 0.2 }} 
        />
        <motion.div 
          className="w-1.5 h-1.5 rounded-full bg-white/70" 
          animate={{ scale: [1, 1.4, 1], opacity: [0.3, 1, 0.3] }} 
          transition={{ duration: 1, repeat: Infinity, ease: "easeInOut", delay: 0.4 }} 
        />
      </div>
      <span className="text-[13px] font-medium text-white/50 tracking-wide">{label}</span>
    </motion.div>
  );
});
