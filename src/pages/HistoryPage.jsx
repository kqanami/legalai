import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../i18n/LanguageContext';
import { useChat } from '../contexts/ChatContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { History, MessageSquare, Home, Building2, ChevronRight, Clock, Search, X, Trash2, Zap } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } }
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
    <div className="max-w-6xl mx-auto p-4 sm:p-8 mt-4 pb-20">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
        
        {/* Header */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                <History className="text-white" size={20} />
              </div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">
                {t('history_title')}
              </h1>
            </div>
            <p className="text-neutral-400 text-sm tracking-wide">Архив ваших сессий и документов. AI Engine 3.1.</p>
          </div>

          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('common_search')}
              className="w-full bg-neutral-900/50 border border-white/10 rounded-2xl pl-11 pr-10 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 focus:bg-neutral-900 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors">
                <X size={16} />
              </button>
            )}
          </div>
        </motion.div>

        {chatHistory.length === 0 ? (
          <motion.div variants={itemVariants} className="bg-neutral-900/20 backdrop-blur-xl rounded-[2rem] border border-white/5 p-16 text-center flex flex-col items-center justify-center shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent opacity-50 pointer-events-none" />
            <div className="w-20 h-20 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-center text-neutral-500 mb-6 shadow-[0_0_30px_rgba(255,255,255,0.02)]">
              <Clock size={32} />
            </div>
            <p className="text-white text-xl font-bold mb-3 tracking-wide">{t('history_empty')}</p>
            <p className="text-neutral-500 text-sm font-medium mb-8 max-w-sm leading-relaxed">Задайте первый вопрос в чате, и он будет сохранен в вашей истории сессий.</p>
            <button onClick={() => navigate('/dashboard')} className="px-8 py-3 bg-white text-black font-bold text-sm rounded-xl hover:bg-neutral-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.2)]">
              {t('new_chat')} →
            </button>
          </motion.div>
        ) : (
          Object.entries(grouped).map(([date, items]) => (
            <motion.div variants={itemVariants} key={date} className="relative mb-12">
              <div className="flex items-center gap-4 mb-6 relative z-10">
                <span className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase bg-black border border-white/10 px-4 py-1.5 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.03)]">
                  {date}
                </span>
                <span className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
              </div>

              <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {items.map((item) => (
                  <motion.div 
                    variants={itemVariants} 
                    key={item.id} 
                    className="relative group bg-neutral-900/30 hover:bg-neutral-800/50 backdrop-blur-xl border border-white/5 hover:border-white/20 rounded-2xl p-5 flex flex-col justify-between cursor-pointer transition-all shadow-lg hover:shadow-[0_10px_40px_rgba(255,255,255,0.03)] h-40 overflow-hidden" 
                    onClick={async () => { await loadSession(item.id); navigate('/dashboard'); }}
                  >
                    {/* Hover Glow Effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                    <div className="flex items-start justify-between relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-black border border-white/10 flex items-center justify-center flex-shrink-0 text-white shadow-[0_0_15px_rgba(255,255,255,0.02)]">
                          <MessageSquare size={16} />
                        </div>
                        <div className="flex gap-2">
                          {/* AI Model Badge */}
                          <div className="px-2 py-0.5 rounded-md border border-white/10 bg-white/5 flex items-center gap-1">
                            <Zap size={10} className="text-white" />
                            <span className="text-[9px] font-bold text-white uppercase tracking-widest">Opus 3</span>
                          </div>
                          {/* Segment Badge */}
                          <div className={`px-2 py-0.5 rounded-md border flex items-center gap-1 ${item.segment === 'b2c' ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'}`}>
                            {item.segment === 'b2c' ? <Home size={10} /> : <Building2 size={10} />}
                            <span className="text-[9px] font-bold uppercase tracking-widest">{item.segment === 'b2c' ? 'B2C' : 'B2B'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(item.id);
                          addToast('Чат удален', 'info');
                        }}
                        className="p-2 -mr-2 -mt-2 opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-400 transition-all z-20"
                        title="Удалить чат"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    
                    {/* Topic */}
                    <div className="mt-4 flex-1 relative z-10">
                      <p className="text-white font-medium text-sm leading-snug line-clamp-2">
                        {item.preview || 'Пустой чат'}
                      </p>
                    </div>

                    {/* Metadata */}
                    <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 relative z-10">
                      <span className="text-[10px] text-neutral-500 font-mono flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(item.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div className="text-neutral-500 group-hover:text-white transition-colors transform group-hover:translate-x-1 duration-300">
                        <ChevronRight size={14} />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          ))
        )}
      </motion.div>
    </div>
  );
}
