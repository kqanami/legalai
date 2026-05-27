import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-obsidian-950 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(148,163,184,0.06)_0%,transparent_70%)]" />
      </div>

      <motion.div
        className="text-center relative z-10 max-w-md"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Logo */}
        <Link to="/" className="inline-flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center font-black text-xl shadow-[0_0_20px_rgba(255,255,255,0.3)]">
            L
          </div>
          <div className="text-left">
            <span className="text-white font-bold text-xl tracking-tighter">Legal</span>
            <span className="text-neutral-500 font-bold text-xl tracking-tighter">Ai</span>
          </div>
        </Link>

        {/* 404 Number */}
        <motion.h1 
          className="text-[8rem] font-black metal-text leading-none mb-2 tracking-tighter"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
        >
          404
        </motion.h1>

        <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">
          Страница не найдена
        </h2>
        <p className="text-steel-400 mb-8 leading-relaxed">
          Запрашиваемая страница не существует или была перемещена. Вернитесь на главную страницу.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Link
            to="/"
            className="btn-primary px-6 py-3 text-sm font-bold flex items-center gap-2"
          >
            <Home size={16} />
            На главную
          </Link>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 text-sm font-bold text-steel-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Назад
          </button>
        </div>
      </motion.div>
    </div>
  );
}
