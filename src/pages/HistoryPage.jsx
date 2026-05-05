import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../i18n/LanguageContext';
import { useChat } from '../contexts/ChatContext';
import { useNavigate } from 'react-router-dom';
import { History, MessageSquare, Home, Building2, ChevronRight, Clock, Search, X } from 'lucide-react';

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
  const { chatHistory, loadSession } = useChat();
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
    <div className="max-w-4xl mx-auto p-4 sm:p-8 mt-4 pb-20">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
        
        {/* Header */}
        <motion.div variants={itemVariants} className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                <History className="text-chrome-400" />
                {t('history_title')}
              </h1>
              <p className="text-steel-400 text-sm mt-1 tracking-wide">Ваши прошлые правовые консультации и анализ документов.</p>
            </div>
          </div>
          {/* Search */}
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-steel-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('common_search')}
              className="input-field pl-11 pr-10"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-steel-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="text-steel-500 text-xs">Найдено: {filteredHistory.length} из {chatHistory.length}</p>
          )}
        </motion.div>

        {chatHistory.length === 0 ? (
          <motion.div variants={itemVariants} className="glass-card p-16 text-center border-dashed border-obsidian-600/50 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-obsidian-800 flex items-center justify-center text-steel-500 mb-6 drop-shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-obsidian-600">
              <Clock size={32} />
            </div>
            <p className="text-white text-lg font-medium mb-2 tracking-wide">{t('history_empty')}</p>
            <p className="text-steel-500 text-sm font-light mb-8 max-w-sm">Задайте первый вопрос в чате, и он будет бережно сохранен в вашей локальной истории.</p>
            <button onClick={() => navigate('/dashboard')} className="btn-primary px-8 py-3 text-sm shadow-[0_0_20px_rgba(255,255,255,0.1)]">
              {t('landing_cta')} →
            </button>
          </motion.div>
        ) : (
          Object.entries(grouped).map(([date, items], idx) => (
            <motion.div variants={itemVariants} key={date} className="relative mb-8 pt-4">
              <div className="flex items-center gap-4 mb-6 relative z-10">
                <span className="text-[11px] font-mono tracking-widest text-steel-400 uppercase bg-obsidian-900 border border-obsidian-700/50 px-3 py-1 rounded-full shadow-inner">{date}</span>
                <span className="flex-1 h-px bg-obsidian-700/50" />
              </div>
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="glass-card p-5 flex items-center gap-5 cursor-pointer group bg-obsidian-900/40 hover:bg-obsidian-800 border border-obsidian-700 transition-all shadow-md hover:shadow-[0_5px_20px_rgba(0,0,0,0.5)]" onClick={() => { loadSession(item.id); navigate('/dashboard'); }}>
                    {/* Icon Box */}
                    <div className="w-12 h-12 rounded-xl chrome-gradient flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.05)] text-obsidian-950">
                      <MessageSquare size={20} className="opacity-80 group-hover:opacity-100 transition-opacity" />
                    </div>
                    
                    {/* Topic */}
                    <div className="flex-1 min-w-0 pr-4 border-r border-obsidian-700/50 mr-2">
                      <p className="text-white font-medium truncate group-hover:text-chrome-300 transition-colors text-sm tracking-wide leading-relaxed">
                        {item.preview}
                      </p>
                    </div>

                    {/* Metadata */}
                    <div className="flex flex-col items-end gap-2 w-24 flex-shrink-0">
                      <span className={item.segment === 'b2c' ? 'segment-b2c flex gap-1 items-center justify-center w-full' : 'segment-b2b flex gap-1 items-center justify-center w-full'} style={{ fontSize: '10px', padding: '4px 8px' }}>
                        {item.segment === 'b2c' ? <><Home size={10} /> B2C</> : <><Building2 size={10} /> B2B</>}
                      </span>
                      <span className="text-[10px] text-steel-500 font-mono flex items-center gap-1 group-hover:text-chrome-400 transition-colors">
                        <Clock size={10} />
                        {new Date(item.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Arrow Next */}
                    <div className="text-obsidian-600 group-hover:text-chrome-300 transition-colors transform group-hover:translate-x-1 duration-300">
                      <ChevronRight size={20} />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))
        )}
      </motion.div>
    </div>
  );
}
