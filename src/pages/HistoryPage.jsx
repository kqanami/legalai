import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../i18n/LanguageContext';
import { useChat } from '../contexts/ChatContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { History, MessageSquare, Home, Building2, ChevronRight, Clock, Search, X, Trash2, Zap } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
};

export default function HistoryPage() {
  const { t } = useLanguage();
  const { chatHistory, loadSession, deleteSession } = useChat();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return chatHistory;
    const q = searchQuery.toLowerCase();
    return chatHistory.filter(item =>
      (item.preview || '').toLowerCase().includes(q) ||
      (item.question || '').toLowerCase().includes(q)
    );
  }, [chatHistory, searchQuery]);

  const groupByDate = (items) => {
    const groups = {};
    items.forEach((item) => {
      const date = new Date(item.timestamp).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
    });
    return groups;
  };

  const grouped = groupByDate(filteredHistory);

  return (
    <div className="flex flex-col h-full bg-[#050505] text-white overflow-hidden p-6 lg:p-10 selection:bg-white/20 font-sans">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col h-full gap-8 max-w-6xl mx-auto w-full">
        
        {/* ── Header ── */}
        <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 shrink-0">
          <div>
            <h1 className="text-4xl lg:text-5xl font-black tracking-tight mb-2">
              {t('history_title')}
            </h1>
            <p className="text-white/40 text-sm max-w-xl">
              Архив ваших сессий и документов. AI Engine 3.1.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('common_search')}
                className="w-full h-12 bg-white/[0.02] border border-white/5 rounded-2xl pl-11 pr-10 text-sm text-white placeholder:text-white/30 focus:bg-white/[0.05] focus:border-white/20 outline-none transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors">
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── List Area ── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative pr-2">
          {chatHistory.length === 0 ? (
            <motion.div variants={itemVariants} className="py-20 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-3xl bg-white/[0.02] border border-white/5 flex items-center justify-center mb-4">
                <Clock size={24} className="text-white/20" />
              </div>
              <p className="text-lg font-bold text-white/50 mb-1">{t('history_empty')}</p>
              <p className="text-sm text-white/30 max-w-sm mb-6">Задайте первый вопрос в чате, и он будет сохранен в вашей истории сессий.</p>
              <button onClick={() => navigate('/dashboard')} className="h-12 px-8 rounded-2xl bg-white text-black font-bold text-sm hover:bg-neutral-200 transition-colors">
                {t('new_chat')}
              </button>
            </motion.div>
          ) : (
            <motion.div variants={containerVariants} className="flex flex-col gap-8 pb-8">
              {Object.entries(grouped).map(([date, items]) => (
                <motion.div variants={itemVariants} key={date} className="flex flex-col gap-3">
                  <div className="flex items-center gap-4 mb-2">
                    <span className="text-[10px] font-black tracking-widest text-white/40 uppercase bg-[#050505] pr-4">
                      {date}
                    </span>
                    <span className="flex-1 h-px bg-white/5" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {items.map((item) => (
                      <motion.div 
                        variants={itemVariants} 
                        key={item.id} 
                        className="group flex flex-col p-6 lg:p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all cursor-pointer relative overflow-hidden" 
                        onClick={async () => { await loadSession(item.id); navigate('/dashboard'); }}
                      >
                        <div className="flex items-start justify-between relative z-10">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center flex-shrink-0 text-white">
                              <MessageSquare size={16} />
                            </div>
                            <div className="flex gap-2">
                              <div className="px-2 py-0.5 rounded-full border border-white/10 bg-white/5 flex items-center gap-1">
                                <Zap size={10} className="text-white" />
                                <span className="text-[9px] font-black text-white uppercase tracking-widest">Opus 3</span>
                              </div>
                              <div className={`px-2 py-0.5 rounded-full border flex items-center gap-1 ${item.segment === 'b2c' ? 'border-white/10 bg-white/5 text-white/70' : 'border-white/10 bg-white text-black'}`}>
                                {item.segment === 'b2c' ? <Home size={10} /> : <Building2 size={10} />}
                                <span className="text-[9px] font-black uppercase tracking-widest">{item.segment === 'b2c' ? 'B2C' : 'B2B'}</span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSession(item.id);
                              addToast('Чат удален', 'info');
                            }}
                            className="w-8 h-8 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-20"
                            title="Удалить чат"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        
                        <div className="mt-8 flex-1 relative z-10 mb-8">
                          <p className="text-white font-bold text-xl leading-snug line-clamp-3">
                            {item.preview || 'Пустой чат'}
                          </p>
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-5 relative z-10">
                          <span className="text-[10px] uppercase tracking-widest text-white/30 font-bold flex items-center gap-2">
                            <Clock size={12} />
                            {new Date(item.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <div className="text-white/30 group-hover:text-white transition-colors">
                            <ChevronRight size={14} />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
