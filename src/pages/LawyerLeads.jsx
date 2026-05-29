import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Inbox, CheckCircle, XCircle, Clock, MapPin, AlertCircle, MessageSquare, Briefcase, GripVertical, Columns3 } from 'lucide-react';
import { escalationApi } from '../services/api';
import { useToast } from '../components/Toast';

const urgencyConfig = {
  normal: { color: 'text-white/60', bg: 'bg-white/[0.05]', border: 'border-white/10', label: 'Обычная' },
  high: { color: 'text-white', bg: 'bg-white/10', border: 'border-white/20', label: 'Высокая' },
  critical: { color: 'text-black', bg: 'bg-white', border: 'border-white', label: 'Критическая' }
};

const COLUMNS = [
  { id: 'pending', title: 'Новые заявки', icon: <Inbox size={14} />, emptyText: 'Нет новых заявок', dotColor: 'bg-white' },
  { id: 'accepted', title: 'В работе', icon: <CheckCircle size={14} />, emptyText: 'Перетащите заявку сюда', dotColor: 'bg-white/60' },
  { id: 'declined', title: 'Отклонённые', icon: <XCircle size={14} />, emptyText: 'Нет отклонённых', dotColor: 'bg-white/20' },
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
        const nativeEvent = e.nativeEvent || e;
        if (nativeEvent.dataTransfer) {
          nativeEvent.dataTransfer.setData('text/plain', JSON.stringify({ id: lead.id, status: lead.status }));
          nativeEvent.dataTransfer.effectAllowed = 'move';
        }
        if (onDragStart) onDragStart(lead);
      }}
      className={`group relative bg-[#050505] border border-white/5 hover:border-white/20 hover:bg-white/[0.02] rounded-[1.5rem] p-5 cursor-grab active:cursor-grabbing transition-all`}
    >
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical size={14} className="text-white/40" />
      </div>

      <div className="flex items-start gap-3 mb-4 pr-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h4 className="text-sm font-bold text-white truncate">{lead.user_name}</h4>
            <span className={`text-[9px] px-2 py-0.5 rounded-md font-black tracking-widest uppercase border ${urgency.bg} ${urgency.color} ${urgency.border}`}>
              {urgency.label}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest text-white/40">
            <span className="flex items-center gap-1.5"><Briefcase size={10} /> {lead.category}</span>
            {lead.city && <span className="flex items-center gap-1.5"><MapPin size={10} /> {lead.city}</span>}
          </div>
        </div>
      </div>

      <div className="bg-white/[0.02] rounded-xl p-4 border border-white/5 mb-4">
        <p className="text-xs text-white/60 leading-relaxed line-clamp-3">{lead.description}</p>
      </div>

      {lead.ai_analysis && (
        <div className="mb-4">
          <p className="text-[9px] font-black uppercase tracking-widest text-white flex items-center gap-1.5 mb-2">
            <AlertCircle size={10} /> AI-Анализ
          </p>
          <p className="text-[10px] text-white/40 leading-relaxed line-clamp-2">{lead.ai_analysis}</p>
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-white/5">
        <span className="text-[9px] font-black uppercase tracking-widest text-white/40 flex items-center gap-1.5">
          <Clock size={10} /> {new Date(lead.created_at).toLocaleDateString('ru-RU')}
        </span>

        {lead.status === 'pending' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAction('accept')}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg bg-white text-black hover:bg-neutral-200 text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
            >
              Принять
            </button>
            <button
              onClick={() => handleAction('decline')}
              disabled={loading}
              className="w-7 h-7 rounded-lg bg-white/[0.05] text-white/60 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all disabled:opacity-50"
            >
              <XCircle size={12} />
            </button>
          </div>
        )}

        {lead.status === 'accepted' && (
          <span className="text-[9px] font-black uppercase tracking-widest text-white flex items-center gap-1">
            <CheckCircle size={10} /> В работе
          </span>
        )}
        {lead.status === 'declined' && (
          <span className="text-[9px] font-black uppercase tracking-widest text-white/40 flex items-center gap-1">
            <XCircle size={10} /> Отклонено
          </span>
        )}
      </div>
    </motion.div>
  );
}

function KanbanColumn({ column, leads, onDrop, onRespond }) {
  const [isDragOver, setIsDragOver] = useState(false);

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
      className={`flex flex-col min-h-[60vh] rounded-[2rem] transition-all duration-200 overflow-hidden ${
        isDragOver
          ? 'border border-white/20 bg-white/[0.03]'
          : 'border border-white/5 bg-white/[0.01]'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between p-5 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2.5">
          <div className={`w-2 h-2 rounded-full ${column.dotColor}`} />
          <span className="text-[10px] font-black uppercase tracking-widest text-white/60">{column.title}</span>
        </div>
        <span className="text-[9px] font-black text-white/40 bg-[#050505] px-2.5 py-1 rounded-full border border-white/5">
          {leads.length}
        </span>
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar relative">
        <AnimatePresence>
          {leads.length > 0 ? (
            leads.map(lead => (
              <KanbanCard key={lead.id} lead={lead} onRespond={onRespond} />
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/[0.02] flex items-center justify-center mb-3">
                <MessageSquare size={16} className="text-white/20" />
              </div>
              <p className="text-[9px] font-black uppercase tracking-widest text-white/40">{column.emptyText}</p>
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
      const data = await escalationApi.getLeads(null);
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

    if (targetStatus === 'accepted' && lead.status === 'pending') {
      await handleRespond(leadId, 'accept');
    } else if (targetStatus === 'declined' && lead.status === 'pending') {
      await handleRespond(leadId, 'decline');
    } else {
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: targetStatus } : l));
    }
  };

  const getLeadsForColumn = (columnId) => leads.filter(l => l.status === columnId);

  return (
    <div className="flex flex-col h-full bg-[#050505] text-white overflow-hidden p-6 lg:p-10 selection:bg-white/20 font-sans">
      <div className="flex justify-between items-center mb-6 shrink-0 gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-black tracking-tight flex items-center gap-3">
            <Inbox size={28} />
            Входящие заявки
          </h1>
          <p className="text-white/40 font-bold tracking-widest text-[10px] uppercase mt-1">Канбан-доска лидов от ИИ и пользователей портала</p>
        </div>

        <div className="flex items-center bg-white/[0.02] p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setViewMode('kanban')}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${viewMode === 'kanban' ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}
          >
            <Columns3 size={16} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${viewMode === 'list' ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}
          >
            <Briefcase size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar relative pr-2">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="min-h-[60vh] rounded-[2rem] bg-white/[0.01] border border-white/5 animate-pulse" />
            ))}
          </div>
        ) : viewMode === 'kanban' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-8 h-full">
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
          <div className="space-y-4 pb-8 max-w-4xl mx-auto w-full">
            <AnimatePresence>
              {leads.length > 0 ? (
                leads.map(lead => (
                  <KanbanCard key={lead.id} lead={lead} onRespond={handleRespond} />
                ))
              ) : (
                <div className="text-center py-20 bg-white/[0.01] rounded-[2rem] border border-dashed border-white/5">
                  <div className="w-16 h-16 rounded-3xl bg-white/[0.02] flex items-center justify-center mx-auto mb-4">
                    <MessageSquare size={24} className="text-white/20" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-2">Нет заявок</h3>
                  <p className="text-white/40 font-black tracking-widest uppercase text-[9px]">У вас пока нет входящих заявок от клиентов</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
