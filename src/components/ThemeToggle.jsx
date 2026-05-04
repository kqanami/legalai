import { Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
        isDark
          ? 'bg-obsidian-700 border border-obsidian-600'
          : 'bg-blue-100 border border-blue-200'
      } ${className}`}
      aria-label="Toggle theme"
    >
      <motion.div
        className={`absolute top-0.5 w-6 h-6 rounded-full flex items-center justify-center shadow-md ${
          isDark ? 'bg-obsidian-500' : 'bg-white'
        }`}
        animate={{ x: isDark ? 2 : 26 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      >
        {isDark ? (
          <Moon size={14} className="text-blue-300" />
        ) : (
          <Sun size={14} className="text-amber-500" />
        )}
      </motion.div>
    </button>
  );
}
