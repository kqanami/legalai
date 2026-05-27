import { motion } from 'framer-motion';

/**
 * Skeleton shimmer loader component.
 * Use instead of spinners for perceived performance.
 */
export function Skeleton({ className = '', variant = 'text', width, height, rounded = 'xl' }) {
  const baseClasses = `relative overflow-hidden bg-obsidian-800/60 rounded-${rounded}`;
  
  const variantStyles = {
    text: 'h-4 w-full',
    title: 'h-6 w-3/4',
    avatar: 'h-10 w-10 rounded-full',
    card: 'h-32 w-full',
    button: 'h-10 w-24',
    image: 'h-48 w-full',
  };

  const style = {};
  if (width) style.width = width;
  if (height) style.height = height;

  return (
    <div 
      className={`${baseClasses} ${variantStyles[variant] || ''} ${className}`}
      style={style}
    >
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
          backgroundSize: '200% 100%',
        }}
        animate={{
          backgroundPosition: ['200% 0', '-200% 0'],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </div>
  );
}

/**
 * Skeleton loader for chat messages.
 */
export function ChatMessageSkeleton({ count = 3 }) {
  return (
    <div className="space-y-6 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`flex gap-3 ${i % 2 === 0 ? '' : 'flex-row-reverse'}`}>
          <Skeleton variant="avatar" />
          <div className={`flex-1 max-w-[70%] space-y-2 ${i % 2 === 0 ? '' : 'flex flex-col items-end'}`}>
            <Skeleton variant="title" className={i % 2 === 0 ? 'w-2/3' : 'w-1/3'} />
            <Skeleton variant="text" className={i % 2 === 0 ? 'w-full' : 'w-2/3'} />
            <Skeleton variant="text" className={i % 2 === 0 ? 'w-4/5' : 'w-1/2'} />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton loader for document cards.
 */
export function DocumentCardSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card p-5 border border-obsidian-700/80 bg-obsidian-900/60 space-y-4">
          <div className="flex items-start justify-between">
            <Skeleton variant="avatar" className="rounded-xl" width={48} height={48} />
            <Skeleton variant="button" width={60} height={24} rounded="full" />
          </div>
          <Skeleton variant="title" />
          <Skeleton variant="text" className="w-2/3" />
          <div className="flex justify-between pt-3 border-t border-obsidian-700/50">
            <Skeleton variant="text" className="w-20" />
            <Skeleton variant="text" className="w-16" />
          </div>
          <Skeleton variant="button" className="w-full" height={40} />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton loader for stats cards.
 */
export function StatsCardSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card p-5 border border-obsidian-700/80 bg-obsidian-900/60 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton variant="avatar" className="rounded-xl" width={40} height={40} />
            <Skeleton variant="text" width={50} height={12} />
          </div>
          <Skeleton variant="title" width="60%" height={32} />
          <Skeleton variant="text" className="w-4/5" />
        </div>
      ))}
    </div>
  );
}

export default Skeleton;
