import { motion } from 'framer-motion';
import { MessageSquareText, FileText, FileClock, ShieldCheck, Search, User } from 'lucide-react';

const icons = {
  chat: {
    component: () => <MessageSquareText size={20} strokeWidth={1.5} />,
    hover: { scale: 1.1, rotate: [0, -10, 10, -5, 5, 0] },
    transition: { duration: 0.5 }
  },
  document: {
    component: () => <FileText size={20} strokeWidth={1.5} />,
    hover: { y: [0, -4, 0], scale: 1.05 },
    transition: { duration: 0.4 }
  },
  history: {
    component: () => <FileClock size={20} strokeWidth={1.5} />,
    hover: { rotate: -180 },
    transition: { duration: 0.6, ease: "backOut" }
  },
  audit: {
    component: () => <ShieldCheck size={20} strokeWidth={1.5} />,
    hover: { scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] },
    transition: { duration: 0.5 }
  },
  search: {
    component: () => <Search size={20} strokeWidth={1.5} />,
    hover: { x: [0, -3, 3, -2, 2, 0], y: [0, -2, 2, 0] },
    transition: { duration: 0.4 }
  },
  profile: {
    component: () => <User size={20} strokeWidth={1.5} />,
    hover: { scale: 1.1, y: [0, -2, 0] },
    transition: { duration: 0.4 }
  }
};

export default function AnimatedIcon({ type, children }) {
  const iconConfig = icons[type];

  if (!iconConfig) return <div className="text-chrome-300">{children}</div>;

  return (
    <motion.div
      className="inline-flex items-center justify-center text-chrome-400 group-hover:text-white transition-colors duration-300"
      whileHover={iconConfig.hover}
      transition={iconConfig.transition}
    >
      {iconConfig.component()}
    </motion.div>
  );
}
