import { Component } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

/**
 * Global Error Boundary — catches any runtime React error and shows a premium fallback UI.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-obsidian-950 px-6">
          <motion.div
            className="max-w-lg w-full text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Error icon */}
            <motion.div
              className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <AlertTriangle className="text-red-400" size={36} strokeWidth={1.5} />
            </motion.div>

            <h1 className="text-2xl font-bold text-white mb-3 tracking-tight">
              Что-то пошло не так
            </h1>
            <p className="text-steel-400 text-sm mb-8 leading-relaxed">
              Произошла непредвиденная ошибка. Попробуйте обновить страницу
              или вернуться на главную.
            </p>

            {/* Error details (dev only) */}
            {this.state.error && (
              <div className="mb-8 p-4 rounded-xl bg-obsidian-900/80 border border-obsidian-700/60 text-left">
                <p className="text-xs text-red-400/80 font-mono break-all">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4 justify-center">
              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 px-6 py-3 rounded-xl chrome-gradient text-obsidian-950 font-bold text-sm
                  hover:shadow-[0_8px_32px_rgba(255,255,255,0.15)] transition-all"
              >
                <RefreshCw size={16} />
                Обновить
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex items-center gap-2 px-6 py-3 rounded-xl border border-obsidian-600/50 text-steel-300 font-semibold text-sm
                  hover:border-chrome-500/40 hover:bg-obsidian-800/50 transition-all"
              >
                <Home size={16} />
                На главную
              </button>
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
