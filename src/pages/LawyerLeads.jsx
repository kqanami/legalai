import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Inbox, CheckCircle, XCircle, Clock, MapPin, AlertCircle, MessageSquare, Briefcase, ChevronRight, GripVertical, ArrowRight, Columns3 } from 'lucide-react';
import { escalationApi } from '../services/api';
import { useToast } from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';

const urgencyConfig = {
  normal: { color: 'text-chrome-400', bg: 'bg-chrome-400/10', border: 'border-chrome-400/20', label: 'Обычная', glow: '' },
  high: { color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20', label: 'Высокая', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.1)]' },
  critical: { color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20', label: 'Критическая', glow: 'shadow-[0_0_20px_rgba(239,68,68,0.15)]' }
};

const COLUMNS = [
  { id: 'pending', title: 'Новые заявки', color: 'amber', icon: <Inbox size={16} />, emptyText: 'Нет новых заявок' },
  { id: 'accepted', title: 'В работе', color: 'emerald', icon: <CheckCircle size={16} />, emptyText: 'Перетащите заявку сюда' },
  { id: 'declined', title: 'Отклонённые', color: 'red', icon: <XCircle size={16} />, emptyText: 'Нет отклонённых' },
];

function KanbanCard({ lead, onDragStart, onRespond }) {
  const urgency = urgencyConfig[lead.urgency] || urgencyConfig.normal;
  const [loading, setLoading] = useState(false);

  const handleAction = async (action) => {
    setLoading(true);
    await onRespond(lead.id, action);
    setLoading(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      draggable
      onDragStart={(e) => {
        // Use native event from the DOM
        const nativeEvent = e.nativeEvent || e;
        if (nativeEvent.dataTransfer) {
          nativeEvent.dataTransfer.setData('text/plain', JSON.stringify({ id: lead.id, status: lead.status }));
          nativeEvent.dataTransfer.effectAllowed = 'move';
        }
        if (onDragStart) onDragStart(lead);
      }}
      className={`group relative bg-obsidian-900/80 border border-white/[0.06] hover:border-white/[0.12] rounded-xl p-4 cursor-grab active:cursor-grabbing transition-all hover:shadow-lg ${urgency.glow}`}
    >
      {/* Drag handle indicator */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-40 transition-opacity">
        <GripVertical size={14} className="text-steel-500" />
      </div>

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h4 className="text-sm font-bold text-white truncate">{lead.user_name}</h4>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold tracking-wider uppercase border ${urgency.bg} ${urgency.color} ${urgency.border}`}>
              {urgency.label}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-steel-500">
            <span className="flex items-center gap-1"><Briefcase size={10} /> {lead.category}</span>
            {lead.city && <span className="flex items-center gap-1"><MapPin size={10} /> {lead.city}</span>}
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="bg-obsidian-950/50 rounded-lg p-3 border border-white/[0.03] mb-3">
        <p className="text-xs text-steel-300 leading-relaxed line-clamp-3">{lead.description}</p>
      </div>

      {lead.ai_analysis && (
        <div className="mb-3 px-2">
          <p className="text-[10px] text-chrome-400 flex items-center gap-1 mb-0.5">
            <AlertCircle size={10} /> AI-Анализ
          </p>
          <p className="text-[10px] text-steel-500 leading-relaxed line-clamp-2">{lead.ai_analysis}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
        <span className="text-[10px] text-steel-600 flex items-center gap-1">
          <Clock size={10} /> {new Date(lead.created_at).toLocaleDateString('ru-RU')}
        </span>

        {lead.status === 'pending' && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleAction('accept')}
              disabled={loading}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/20 text-[10px] font-bold transition-all disabled:opacity-50"
            >
              Принять
            </button>
            <button
              onClick={() => handleAction('decline')}
              disabled={loading}
              className="px-2.5 py-1 rounded-lg bg-white/[0.04] text-steel-400 hover:text-red-400 hover:bg-red-500/10 border border-white/[0.06] text-[10px] font-bold transition-all disabled:opacity-50"
            >
              ✕
            </button>
          </div>
        )}

        {lead.status === 'accepted' && (
          <span className="text-[10px] text-emerald-400 font-bold">✓ В работе</span>
        )}
        {lead.status === 'declined' && (
          <span className="text-[10px] text-red-400 font-bold">✕ Отклонено</span>
        )}
      </div>
    </motion.div>
  );
}

function KanbanColumn({ column, leads, onDrop, onRespond }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const colorMap = {
    amber: { border: 'border-amber-500/40', bg: 'bg-amber-500/5', text: 'text-amber-400', dot: 'bg-amber-500' },
    emerald: { border: 'border-emerald-500/40', bg: 'bg-emerald-500/5', text: 'text-emerald-400', dot: 'bg-emerald-500' },
    red: { border: 'border-red-500/40', bg: 'bg-red-500/5', text: 'text-red-400', dot: 'bg-red-500' },
  };
  const colors = colorMap[column.color] || colorMap.amber;

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (data.status !== column.id) {
        onDrop(data.id, column.id);
      }
    } catch (err) {
      console.error('Drop parse error:', err);
    }
  };

  return (
    <div
      className={`flex flex-col min-h-[60vh] rounded-2xl border transition-all duration-200 ${
        isDragOver
          ? `${colors.border} ${colors.bg} shadow-[0_0_30px_rgba(255,255,255,0.03)]`
          : 'border-white/[0.04] bg-obsidian-950/30'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/[0.04]">
        <div className="flex items-center gap-2.5">
          <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
          <span className={`text-xs font-bold uppercase tracking-wider ${colors.text}`}>{column.title}</span>
        </div>
        <span className="text-[10px] font-mono text-steel-500 bg-obsidian-900 px-2 py-0.5 rounded-lg border border-white/[0.04]">
          {leads.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto custom-scrollbar">
        <AnimatePresence>
          {leads.length > 0 ? (
            leads.map(lead => (
              <KanbanCard key={lead.id} lead={lead} onRespond={onRespond} />
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-40 text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-obsidian-900/50 flex items-center justify-center mb-3">
                <MessageSquare size={18} className="text-steel-600" />
              </div>
              <p className="text-xs text-steel-600">{column.emptyText}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function LawyerLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'list'

  useEffect(() => {
    loadAllLeads();
  }, []);

  const loadAllLeads = async () => {
    setLoading(true);
    try {
      const data = await escalationApi.getLeads(null); // Load ALL statuses
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
      setLeads(prev =>
        prev.map(l =>
          l.id === id
            ? { ...l, status: action === 'accept' ? 'accepted' : 'declined', responded_at: new Date().toISOString() }
            : l
        )
      );
      addToast(action === 'accept' ? 'Заявка принята в работу' : 'Заявка отклонена', action === 'accept' ? 'success' : 'info');
    } catch (e) {
      console.error('Failed to respond:', e);
      addToast('Ошибка при обработке заявки', 'error');
    }
  };

  const handleDrop = async (leadId, targetStatus) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    // Map column ID to action
    if (targetStatus === 'accepted' && lead.status === 'pending') {
      await handleRespond(leadId, 'accept');
    } else if (targetStatus === 'declined' && lead.status === 'pending') {
      await handleRespond(leadId, 'decline');
    } else {
      // Visual-only reorder (moving between accepted/declined doesn't call API)
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: targetStatus } : l));
    }
  };

  const getLeadsForColumn = (columnId) => leads.filter(l => l.status === columnId);

  return (
    <div className="min-h-screen bg-obsidian-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl chrome-gradient flex items-center justify-center shadow-lg">
              <Inbox size={24} className="text-obsidian-950" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">Входящие <span className="metal-text">заявки</span></h1>
              <p className="text-sm text-steel-400">Канбан-доска лидов от ИИ и пользователей портала</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-2.5 rounded-lg transition-all ${viewMode === 'kanban' ? 'bg-chrome-500/20 text-chrome-300 border border-chrome-500/30' : 'text-steel-500 hover:text-steel-300'}`}
            >
              <Columns3 size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-chrome-500/20 text-chrome-300 border border-chrome-500/30' : 'text-steel-500 hover:text-steel-300'}`}
            >
              <Briefcase size={18} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-[60vh] rounded-2xl bg-obsidian-900/20 border border-white/[0.02] animate-pulse" />
            ))}
          </div>
        ) : viewMode === 'kanban' ? (
          /* ── KANBAN VIEW ── */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {COLUMNS.map(col => (
              <KanbanColumn
                key={col.id}
                column={col}
                leads={getLeadsForColumn(col.id)}
                onDrop={handleDrop}
                onRespond={handleRespond}
              />
            ))}
          </div>
        ) : (
          /* ── LIST VIEW (fallback) ── */
          <div className="space-y-4">
            <AnimatePresence>
              {leads.length > 0 ? (
                leads.map(lead => (
                  <KanbanCard key={lead.id} lead={lead} onRespond={handleRespond} />
                ))
              ) : (
                <div className="text-center py-20 glass-card border border-white/[0.02] border-dashed">
                  <div className="w-16 h-16 rounded-2xl bg-obsidian-800/50 flex items-center justify-center mx-auto mb-4">
                    <MessageSquare size={24} className="text-steel-600" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">Нет заявок</h3>
                  <p className="text-steel-400 text-sm">У вас пока нет входящих заявок от клиентов</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
