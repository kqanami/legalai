import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Inbox, CheckCircle, XCircle, Clock, MapPin, AlertCircle, MessageSquare, Briefcase, ChevronRight } from 'lucide-react';
import { escalationApi } from '../services/api';
import { useToast } from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';

const urgencyConfig = {
  normal: { color: 'text-chrome-400', bg: 'bg-chrome-400/10', border: 'border-chrome-400/20', label: 'Обычная' },
  high: { color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20', label: 'Высокая' },
  critical: { color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20', label: 'Критическая' }
};

function LeadCard({ lead, onRespond }) {
  const [loading, setLoading] = useState(false);

  const handleAction = async (action) => {
    setLoading(true);
    await onRespond(lead.id, action);
    setLoading(false);
  };

  const urgency = urgencyConfig[lead.urgency] || urgencyConfig.normal;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="glass-card p-6 border border-white/[0.06] hover:border-white/[0.1] transition-all relative overflow-hidden group"
    >
      {/* Background glow for high urgency */}
      {lead.urgency === 'critical' && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-3xl rounded-full" />
      )}

      <div className="flex items-start justify-between mb-4 relative z-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-bold text-white">{lead.user_name}</h3>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wider uppercase border ${urgency.bg} ${urgency.color} ${urgency.border}`}>
              {urgency.label}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-steel-400">
            <span className="flex items-center gap-1"><Briefcase size={12} /> {lead.category}</span>
            {lead.city && <span className="flex items-center gap-1"><MapPin size={12} /> {lead.city}</span>}
            <span className="flex items-center gap-1"><Clock size={12} /> {new Date(lead.created_at).toLocaleDateString('ru-RU')}</span>
          </div>
        </div>
      </div>

      <div className="bg-obsidian-900/50 rounded-xl p-4 border border-white/[0.04] mb-5 relative z-10">
        <p className="text-sm text-steel-300 leading-relaxed whitespace-pre-wrap">{lead.description}</p>
        
        {lead.ai_analysis && (
          <div className="mt-4 pt-4 border-t border-white/[0.04]">
            <p className="text-xs font-bold text-chrome-400 mb-1 flex items-center gap-1">
              <AlertCircle size={12} /> AI-Анализ
            </p>
            <p className="text-xs text-steel-400 leading-relaxed">{lead.ai_analysis}</p>
          </div>
        )}
      </div>

      {lead.status === 'pending' ? (
        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={() => handleAction('accept')}
            disabled={loading}
            className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2 text-sm bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 hover:border-emerald-500/50"
          >
            <CheckCircle size={16} /> Принять в работу
          </button>
          <button
            onClick={() => handleAction('decline')}
            disabled={loading}
            className="flex-1 btn-secondary py-2.5 flex items-center justify-center gap-2 text-sm hover:text-red-400 hover:border-red-400/30"
          >
            <XCircle size={16} /> Отклонить
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between text-xs font-medium relative z-10">
          <span className={lead.status === 'accepted' ? 'text-emerald-400' : 'text-red-400'}>
            {lead.status === 'accepted' ? '✅ Вы приняли эту заявку' : '❌ Вы отклонили заявку'}
          </span>
          <span className="text-steel-500">
            {lead.responded_at ? new Date(lead.responded_at).toLocaleDateString('ru-RU') : ''}
          </span>
        </div>
      )}
    </motion.div>
  );
}

export default function LawyerLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  const [filter, setFilter] = useState('pending'); // pending, accepted, declined

  useEffect(() => {
    loadLeads();
  }, [filter]);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const data = await escalationApi.getLeads(filter !== 'all' ? filter : null);
      setLeads(data);
    } catch (e) {
      console.error('Failed to load leads:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (id, action) => {
    try {
      await escalationApi.respondToLead(id, action);
      // Remove from pending list if we are viewing pending
      if (filter === 'pending') {
        setLeads(leads.filter(l => l.id !== id));
      } else {
        // Update status visually
        setLeads(leads.map(l => l.id === id ? { ...l, status: action === 'accept' ? 'accepted' : 'declined', responded_at: new Date().toISOString() } : l));
      }
    } catch (e) {
      console.error('Failed to respond:', e);
      addToast('Ошибка при обработке заявки', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-obsidian-950 p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl chrome-gradient flex items-center justify-center shadow-lg">
            <Inbox size={24} className="text-obsidian-950" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Входящие <span className="metal-text">заявки</span></h1>
            <p className="text-sm text-steel-400">Лиды от ИИ и пользователей портала</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-6 border-b border-white/[0.04] pb-px">
          {[
            { id: 'pending', label: 'Новые' },
            { id: 'accepted', label: 'Принятые' },
            { id: 'declined', label: 'Отклоненные' },
            { id: 'all', label: 'Все' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                filter === tab.id 
                  ? 'border-chrome-400 text-chrome-200' 
                  : 'border-transparent text-steel-500 hover:text-steel-300'
              }`}
            >
              {tab.label}
              {tab.id === 'pending' && filter === 'pending' && leads.length > 0 && (
                <span className="ml-2 bg-chrome-500 text-obsidian-950 text-[10px] px-1.5 py-0.5 rounded-full">
                  {leads.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Leads List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass-card p-6 h-48 animate-pulse border border-white/[0.02]" />
            ))}
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-20 glass-card border border-white/[0.02] border-dashed">
            <div className="w-16 h-16 rounded-2xl bg-obsidian-800/50 flex items-center justify-center mx-auto mb-4">
              <MessageSquare size={24} className="text-steel-600" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Нет заявок</h3>
            <p className="text-steel-400 text-sm">У вас нет {filter === 'pending' ? 'новых' : ''} заявок в этой категории</p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {leads.map(lead => (
                <LeadCard key={lead.id} lead={lead} onRespond={handleRespond} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
