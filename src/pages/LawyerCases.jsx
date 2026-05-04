import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { lawyerApi } from '../services/api';
import { Briefcase, Plus, X, Search, ChevronRight, User, Trophy, AlertCircle } from 'lucide-react';
import MagneticButton from '../components/MagneticButton';

export default function LawyerCases() {
  const [cases, setCases] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
      await lawyerApi.updateCase(caseId, { status: newStatus });
      fetchData();
    } catch (e) {
      console.error(e);
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

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {loading ? (
          <div className="text-steel-400 text-center py-10">Загрузка дел...</div>
        ) : filteredCases.length > 0 ? (
          <div className="space-y-4">
            {filteredCases.map((c, i) => (
              <motion.div 
                key={c.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-6 flex flex-col md:flex-row md:items-center justify-between hover:border-chrome-500/50 transition-colors group relative overflow-hidden gap-4"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-chrome-400 to-obsidian-800 opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full border ${getStatusColor(c.status)} transition-colors`}>
                      {getStatusText(c.status)}
                    </span>
                    <span className="text-xs font-medium text-steel-500 px-2 py-0.5 bg-obsidian-800 rounded-md border border-obsidian-700">
                      {c.category || 'Без категории'}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-bold text-white mb-2">{c.title}</h3>
                  <p className="text-sm text-steel-400 line-clamp-2 max-w-2xl">{c.description || 'Нет описания'}</p>
                </div>
                
                <div className="flex flex-col md:items-end gap-3 min-w-[200px]">
                  <div className="flex items-center gap-2 text-sm text-chrome-200 bg-obsidian-800/50 px-3 py-1.5 rounded-lg border border-obsidian-700/50 w-fit">
                    <User size={14} className="text-steel-400" />
                    <span className="font-medium truncate max-w-[150px]">{c.client?.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-2">
                    {c.status !== 'won' && (
                      <button 
                        onClick={() => updateCaseStatus(c.id, 'won')}
                        className="p-2 text-steel-400 hover:text-yellow-500 hover:bg-yellow-500/10 rounded-lg transition-all border border-transparent hover:border-yellow-500/20"
                        title="Отметить как выигранное"
                      >
                        <Trophy size={18} />
                      </button>
                    )}
                    {c.status !== 'closed' && c.status !== 'won' && (
                      <button 
                        onClick={() => updateCaseStatus(c.id, 'closed')}
                        className="p-2 text-steel-400 hover:text-white hover:bg-obsidian-700 rounded-lg transition-colors border border-transparent hover:border-obsidian-600"
                        title="Закрыть дело"
                      >
                        <X size={18} />
                      </button>
                    )}
                    <button className="flex items-center gap-1 text-sm text-chrome-400 hover:text-chrome-300 font-medium group-hover:translate-x-1 transition-transform ml-2">
                      Подробнее <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-steel-500 text-center py-20 border border-dashed border-obsidian-700 rounded-2xl flex flex-col items-center gap-4">
            <AlertCircle size={48} className="text-obsidian-600" />
            <p>{searchQuery ? 'Дела не найдены' : 'У вас пока нет активных дел. Создайте новое!'}</p>
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
                    <select required value={formData.client_id} onChange={e => setFormData({...formData, client_id: e.target.value})} className="input-field shadow-inner appearance-none bg-obsidian-800 text-white border border-obsidian-600 focus:border-chrome-400 rounded-xl px-4 py-3 w-full outline-none">
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-steel-400 mb-1">Название дела <span className="text-red-500">*</span></label>
                    <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="input-field shadow-inner" placeholder="Иск о взыскании долга..." />
                  </div>
                  <div>
                    <label className="block text-sm text-steel-400 mb-1">Категория</label>
                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="input-field shadow-inner appearance-none bg-obsidian-800 text-white border border-obsidian-600 focus:border-chrome-400 rounded-xl px-4 py-3 w-full outline-none">
                      <option>Гражданское право</option>
                      <option>Уголовное право</option>
                      <option>Корпоративное право</option>
                      <option>Семейное право</option>
                      <option>Административное право</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-steel-400 mb-1">Описание / Суть</label>
                    <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="input-field shadow-inner h-24 resize-none" placeholder="Подробности дела..." />
                  </div>
                  <div>
                    <label className="block text-sm text-steel-400 mb-1">Статус</label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="input-field shadow-inner appearance-none bg-obsidian-800 text-white border border-obsidian-600 focus:border-chrome-400 rounded-xl px-4 py-3 w-full outline-none">
                      <option value="active">В работе</option>
                      <option value="pending">Ожидание</option>
                      <option value="closed">Закрыто</option>
                      <option value="won">Выиграно</option>
                    </select>
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
