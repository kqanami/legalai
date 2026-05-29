import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { lawyerApi } from '../services/api';
import { Briefcase, Plus, X, Search, ChevronRight, User, Trophy, AlertCircle } from 'lucide-react';
import MagneticButton from '../components/MagneticButton';
import CustomSelect from '../components/CustomSelect';
import { useToast } from '../components/Toast';

export default function LawyerCases() {
  const [cases, setCases] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { addToast } = useToast();

  const [formData, setFormData] = useState({ 
    title: '', 
    description: '', 
    status: 'active', 
    category: 'Гражданское право', 
    client_id: '' 
  });

  const fetchData = async () => {
    try {
      const [casesData, clientsData] = await Promise.all([
        lawyerApi.listCases(),
        lawyerApi.listClients()
      ]);
      setCases(casesData);
      setClients(clientsData);
      if (clientsData.length > 0 && !formData.client_id) {
        setFormData(prev => ({ ...prev, client_id: clientsData[0].id.toString() }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await lawyerApi.createCase({
        ...formData,
        client_id: parseInt(formData.client_id)
      });
      setIsModalOpen(false);
      setFormData({ 
        title: '', 
        description: '', 
        status: 'active', 
        category: 'Гражданское право', 
        client_id: clients.length > 0 ? clients[0].id.toString() : '' 
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const updateCaseStatus = async (caseId, newStatus) => {
    try {
      if (newStatus === 'won' || newStatus === 'closed') {
        await lawyerApi.setCaseOutcome(caseId, { result: newStatus });
      } else {
        await lawyerApi.updateCase(caseId, { status: newStatus });
      }
      fetchData();
      addToast(`Статус обновлен: ${getStatusText(newStatus)}`, 'success');
    } catch (e) {
      console.error(e);
      addToast('Ошибка при обновлении статуса', 'error');
    }
  };

  const filteredCases = cases.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.client?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return 'bg-white/10 text-white border-white/20';
      case 'won': return 'bg-white text-black border-white';
      case 'closed': return 'bg-white/5 text-white/40 border-white/10';
      case 'pending': return 'bg-white/10 text-white/60 border-white/20';
      default: return 'bg-[#050505] text-white/40 border-white/5';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'active': return 'В работе';
      case 'won': return 'Выиграно';
      case 'closed': return 'Закрыто';
      case 'pending': return 'Ожидание';
      default: return status;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] text-white overflow-hidden p-6 lg:p-10 selection:bg-white/20 font-sans">
      <div className="flex justify-between items-center mb-6 shrink-0 gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-black tracking-tight flex items-center gap-3">
            <Briefcase size={28} />
            Истории дел
          </h1>
          <p className="text-white/40 font-bold tracking-widest text-[10px] uppercase mt-1">Управление процессами и задачами по клиентам</p>
        </div>
        
        <button onClick={() => setIsModalOpen(true)} className="h-12 px-6 rounded-2xl bg-white text-black font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-neutral-200 transition-colors whitespace-nowrap shrink-0">
          <Plus size={16} />
          <span>Новое дело</span>
        </button>
      </div>

      <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-3 mb-6 shrink-0 flex items-center gap-3">
        <Search className="text-white/40 ml-2" size={18} />
        <input 
          type="text" 
          placeholder="Поиск по названию дела или имени клиента..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent border-none outline-none text-sm text-white w-full placeholder:text-white/30"
        />
      </div>


      <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar pb-4 pr-4">
        {loading ? (
          <div className="text-white/40 text-center py-20 font-bold tracking-widest uppercase text-[10px]">Загрузка дел...</div>
        ) : (
          <div className="flex gap-6 h-full min-w-max">
            {['pending', 'active', 'won', 'closed'].map(colStatus => {
              const colCases = filteredCases.filter(c => c.status === colStatus);
              return (
                <div 
                  key={colStatus} 
                  className="w-80 flex flex-col bg-white/[0.01] rounded-[2rem] border border-white/5 overflow-hidden transition-colors"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('bg-white/[0.03]');
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove('bg-white/[0.03]');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('bg-white/[0.03]');
                    const caseIdStr = e.dataTransfer.getData('caseId');
                    if (caseIdStr) {
                      updateCaseStatus(parseInt(caseIdStr), colStatus);
                    }
                  }}
                >
                  <div className="p-5 border-b border-white/5 flex items-center justify-between shrink-0 bg-white/[0.02]">
                    <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${getStatusColor(colStatus).split(' ')[0]}`} />
                      {getStatusText(colStatus)}
                    </h3>
                    <span className="text-[10px] font-black text-white/40 bg-white/[0.05] px-2.5 py-1 rounded-full border border-white/10">{colCases.length}</span>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar relative">
                    {colCases.map((c, i) => (
                      <motion.div 
                        key={c.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('caseId', c.id.toString());
                          e.currentTarget.classList.add('opacity-50');
                        }}
                        onDragEnd={(e) => {
                          e.currentTarget.classList.remove('opacity-50');
                        }}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-[#050505] p-5 flex flex-col rounded-[1.5rem] border border-white/5 hover:border-white/20 transition-all group relative cursor-grab active:cursor-grabbing hover:bg-white/[0.02]"
                      >
                        <div className="flex items-center justify-between mb-3">
                           <span className="text-[9px] font-black uppercase tracking-widest text-white/40 px-2 py-1 bg-white/[0.05] rounded-md border border-white/5 truncate max-w-[120px]">
                             {c.category || 'Без категории'}
                           </span>
                           {c.client && (
                             <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-white/60">
                               <User size={10} />
                               <span className="truncate max-w-[80px]">{c.client.name}</span>
                             </div>
                           )}
                        </div>
                        <h4 className="text-sm font-bold text-white mb-2 leading-snug">{c.title}</h4>
                        <p className="text-xs text-white/40 line-clamp-2 mb-4 leading-relaxed">{c.description || 'Нет описания'}</p>
                        
                        <div className="flex items-center gap-2 mt-auto pt-3 border-t border-white/5">
                           <button className="text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white flex items-center gap-1 transition-colors">
                             Подробнее <ChevronRight size={10} />
                           </button>
                        </div>
                      </motion.div>
                    ))}
                    {colCases.length === 0 && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white/20">
                        <Briefcase size={24} className="mb-2 opacity-20" />
                        <p className="text-[10px] uppercase font-black tracking-widest">Пусто</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div 
              className="w-full max-w-lg p-8 relative max-h-[90vh] overflow-y-auto custom-scrollbar bg-[#050505] rounded-[2rem] border border-white/10 shadow-2xl"
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors">
                <X size={20} />
              </button>
              
              <h2 className="text-3xl font-black mb-8">Новое дело</h2>
              
              {clients.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-white/40 text-sm mb-6">Сначала необходимо добавить клиента в базу.</p>
                  <button onClick={() => setIsModalOpen(false)} className="h-12 w-full rounded-2xl bg-white text-black font-bold text-sm hover:bg-neutral-200 transition-colors">Закрыть</button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Клиент <span className="text-red-500">*</span></label>
                    <CustomSelect 
                      value={formData.client_id} 
                      onChange={e => setFormData({...formData, client_id: e.target.value})} 
                      options={clients.map(c => ({ value: c.id.toString(), label: c.name }))}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Название дела <span className="text-red-500">*</span></label>
                    <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full h-12 bg-white/[0.02] border border-white/10 rounded-2xl px-4 text-sm text-white placeholder:text-white/30 focus:border-white/30 outline-none transition-colors" placeholder="Иск о взыскании долга..." />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Категория</label>
                    <CustomSelect 
                      value={formData.category} 
                      onChange={e => setFormData({...formData, category: e.target.value})} 
                      options={['Гражданское право', 'Уголовное право', 'Корпоративное право', 'Семейное право', 'Административное право']}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Описание / Суть</label>
                    <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full h-24 resize-none bg-white/[0.02] border border-white/10 rounded-2xl p-4 text-sm text-white placeholder:text-white/30 focus:border-white/30 outline-none transition-colors" placeholder="Подробности дела..." />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Статус</label>
                    <CustomSelect 
                      value={formData.status} 
                      onChange={e => setFormData({...formData, status: e.target.value})} 
                      options={[
                        { value: 'active', label: 'В работе' },
                        { value: 'pending', label: 'Ожидание' },
                        { value: 'closed', label: 'Закрыто' },
                        { value: 'won', label: 'Выиграно' }
                      ]}
                    />
                  </div>
                  
                  <button type="submit" className="h-14 w-full rounded-2xl bg-white text-black font-bold text-sm hover:bg-neutral-200 transition-colors mt-8">
                    Создать дело
                  </button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
