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
    c.client.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'won': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.2)]';
      case 'closed': return 'bg-steel-500/10 text-steel-400 border-steel-500/20';
      case 'pending': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      default: return 'bg-obsidian-800 text-chrome-400 border-obsidian-600';
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
    <div className="h-full p-8 flex flex-col relative overflow-hidden">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Briefcase className="text-chrome-400" />
            Истории дел
          </h1>
          <p className="text-steel-400 mt-2 text-sm tracking-wide">Управление процессами и задачами по клиентам</p>
        </div>
        
        <MagneticButton onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center gap-2 px-5 py-2.5">
          <Plus size={18} />
          <span>Новое дело</span>
        </MagneticButton>
      </div>

      <div className="glass-card p-4 mb-6 flex items-center gap-3">
        <Search className="text-steel-500" size={20} />
        <input 
          type="text" 
          placeholder="Поиск по названию дела или имени клиента..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent border-none outline-none text-white w-full placeholder:text-steel-600"
        />
      </div>


      <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar pb-4 mt-4">
        {loading ? (
          <div className="text-steel-400 text-center py-10">Загрузка дел...</div>
        ) : (
          <div className="flex gap-6 h-full min-w-max">
            {['pending', 'active', 'won', 'closed'].map(colStatus => {
              const colCases = filteredCases.filter(c => c.status === colStatus);
              return (
                <div 
                  key={colStatus} 
                  className="w-80 flex flex-col bg-obsidian-900/20 rounded-2xl border border-obsidian-700/50"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('bg-obsidian-800/40');
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove('bg-obsidian-800/40');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('bg-obsidian-800/40');
                    const caseIdStr = e.dataTransfer.getData('caseId');
                    if (caseIdStr) {
                      updateCaseStatus(parseInt(caseIdStr), colStatus);
                    }
                  }}
                >
                  <div className="p-4 border-b border-obsidian-700/50 flex items-center justify-between">
                    <h3 className="text-white font-bold tracking-wide flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${getStatusColor(colStatus).split(' ')[0].replace('/10','')}`} />
                      {getStatusText(colStatus)}
                    </h3>
                    <span className="text-xs font-mono text-steel-500 bg-obsidian-800 px-2 py-0.5 rounded-md border border-obsidian-700">{colCases.length}</span>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
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
                        className="glass-card p-4 flex flex-col hover:border-chrome-500/50 transition-colors group relative cursor-grab active:cursor-grabbing bg-obsidian-900/60"
                      >
                        <div className="flex items-center justify-between mb-2">
                           <span className="text-[10px] font-medium text-steel-500 px-2 py-0.5 bg-obsidian-800 rounded-md border border-obsidian-700">
                             {c.category || 'Без категории'}
                           </span>
                           {c.client && (
                             <div className="flex items-center gap-1 text-[10px] text-chrome-200">
                               <User size={10} />
                               <span className="truncate max-w-[80px]">{c.client.name}</span>
                             </div>
                           )}
                        </div>
                        <h4 className="text-sm font-bold text-white mb-1 leading-snug">{c.title}</h4>
                        <p className="text-xs text-steel-400 line-clamp-2 mb-3">{c.description || 'Нет описания'}</p>
                        
                        <div className="flex items-center gap-2 mt-auto pt-2 border-t border-obsidian-800">
                           <button className="text-[10px] text-chrome-400 hover:text-chrome-300 font-medium flex items-center gap-1 transition-colors">
                             Подробнее <ChevronRight size={12} />
                           </button>
                        </div>
                      </motion.div>
                    ))}
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
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div 
              className="glass-card w-full max-w-lg p-8 relative max-h-[90vh] overflow-y-auto custom-scrollbar"
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
            >
              <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-steel-400 hover:text-white">
                <X size={24} />
              </button>
              
              <h2 className="text-2xl font-bold text-white mb-6">Новое дело</h2>
              
              {clients.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-steel-400 mb-4">Сначала необходимо добавить клиента в базу.</p>
                  <MagneticButton onClick={() => setIsModalOpen(false)} className="btn-primary w-full py-2">Закрыть</MagneticButton>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm text-steel-400 mb-1">Клиент <span className="text-red-500">*</span></label>
                    <CustomSelect 
                      value={formData.client_id} 
                      onChange={e => setFormData({...formData, client_id: e.target.value})} 
                      options={clients.map(c => ({ value: c.id.toString(), label: c.name }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-steel-400 mb-1">Название дела <span className="text-red-500">*</span></label>
                    <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="input-field shadow-inner" placeholder="Иск о взыскании долга..." />
                  </div>
                  <div>
                    <label className="block text-sm text-steel-400 mb-1">Категория</label>
                    <CustomSelect 
                      value={formData.category} 
                      onChange={e => setFormData({...formData, category: e.target.value})} 
                      options={['Гражданское право', 'Уголовное право', 'Корпоративное право', 'Семейное право', 'Административное право']}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-steel-400 mb-1">Описание / Суть</label>
                    <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="input-field shadow-inner h-24 resize-none" placeholder="Подробности дела..." />
                  </div>
                  <div>
                    <label className="block text-sm text-steel-400 mb-1">Статус</label>
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
                  
                  <MagneticButton type="submit" className="btn-primary w-full py-3 mt-6">
                    Создать дело
                  </MagneticButton>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
