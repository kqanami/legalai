import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { lawyerApi } from '../services/api';
import { Users, UserPlus, Mail, Phone, X, Search, Trash2, AlertTriangle } from 'lucide-react';
import MagneticButton from '../components/MagneticButton';
import { useToast } from '../components/Toast';

export default function LawyerClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { addToast } = useToast();

  const [formData, setFormData] = useState({ name: '', phone: '', email: '', notes: '' });

  const fetchClients = async () => {
    try {
      const data = await lawyerApi.listClients();
      setClients(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await lawyerApi.createClient(formData);
      setIsModalOpen(false);
      setFormData({ name: '', phone: '', email: '', notes: '' });
      fetchClients();
    } catch (e) {
      console.error(e);
    }
  };

  const confirmDeleteClient = async () => {
    if (!clientToDelete) return;
    try {
      await lawyerApi.deleteClient(clientToDelete);
      fetchClients();
      addToast('Клиент удален', 'success');
    } catch (e) {
      console.error(e);
      addToast('Не удалось удалить клиента', 'error');
    } finally {
      setClientToDelete(null);
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.phone && c.phone.includes(searchQuery))
  );

  return (
    <div className="flex flex-col h-full bg-[#050505] text-white overflow-hidden p-6 lg:p-10 selection:bg-white/20 font-sans">
      <div className="flex justify-between items-center mb-6 shrink-0 gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-black tracking-tight flex items-center gap-3">
            <Users size={28} />
            База клиентов
          </h1>
          <p className="text-white/40 font-bold tracking-widest text-[10px] uppercase mt-1">Управление профилями и контактными данными</p>
        </div>
        
        <button onClick={() => setIsModalOpen(true)} className="h-12 px-6 rounded-2xl bg-white text-black font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-neutral-200 transition-colors whitespace-nowrap shrink-0">
          <UserPlus size={16} />
          <span>Новый клиент</span>
        </button>
      </div>

      <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-3 mb-6 shrink-0 flex items-center gap-3">
        <Search className="text-white/40 ml-2" size={18} />
        <input 
          type="text" 
          placeholder="Поиск по имени или телефону..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent border-none outline-none text-sm text-white w-full placeholder:text-white/30"
        />
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar relative">
        {loading ? (
          <div className="text-white/40 text-center py-20 font-bold tracking-widest uppercase text-[10px]">Загрузка клиентов...</div>
        ) : filteredClients.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
            {filteredClients.map((client, i) => (
              <motion.div 
                key={client.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white/[0.01] border border-white/5 p-6 rounded-[2rem] flex flex-col hover:border-white/20 transition-all group relative overflow-hidden hover:bg-white/[0.02]"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setClientToDelete(client.id);
                  }}
                  className="absolute top-6 right-6 p-2 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors z-10 opacity-0 group-hover:opacity-100"
                  title="Удалить клиента"
                >
                  <Trash2 size={16} />
                </button>
                
                <h3 className="text-xl font-bold text-white mb-6 pr-10">{client.name}</h3>
                
                <div className="space-y-4 mt-auto">
                  <div className="flex items-center gap-3 text-white/60 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center">
                      <Phone size={14} className="text-white/40 group-hover:text-white transition-colors" />
                    </div>
                    <span className="font-bold tracking-widest text-[10px] uppercase">{client.phone || 'Не указан'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-white/60 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center">
                      <Mail size={14} className="text-white/40 group-hover:text-white transition-colors" />
                    </div>
                    <span className="truncate font-bold tracking-widest text-[10px] uppercase">{client.email || 'Не указан'}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-3xl bg-white/[0.02] border border-white/5 flex items-center justify-center mb-4">
               <Users size={24} className="text-white/20" />
            </div>
            <p className="text-[10px] uppercase font-black tracking-widest text-white/40 max-w-[200px]">
              {searchQuery ? 'Клиенты не найдены' : 'Нет клиентов. Добавьте первого.'}
            </p>
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
              className="w-full max-w-md p-8 relative bg-[#050505] rounded-[2rem] border border-white/10 shadow-2xl"
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors">
                <X size={20} />
              </button>
              
              <h2 className="text-3xl font-black mb-8">Новый клиент</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">ФИО / Название <span className="text-red-500">*</span></label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full h-12 bg-white/[0.02] border border-white/10 rounded-2xl px-4 text-sm text-white placeholder:text-white/30 focus:border-white/30 outline-none transition-colors" placeholder="Иван Иванов" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Телефон</label>
                  <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full h-12 bg-white/[0.02] border border-white/10 rounded-2xl px-4 text-sm text-white placeholder:text-white/30 focus:border-white/30 outline-none transition-colors" placeholder="+7 (700) 000-00-00" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Email</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full h-12 bg-white/[0.02] border border-white/10 rounded-2xl px-4 text-sm text-white placeholder:text-white/30 focus:border-white/30 outline-none transition-colors" placeholder="client@example.com" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Заметки</label>
                  <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full h-24 resize-none bg-white/[0.02] border border-white/10 rounded-2xl p-4 text-sm text-white placeholder:text-white/30 focus:border-white/30 outline-none transition-colors" placeholder="Дополнительная информация о клиенте..." />
                </div>
                
                <button type="submit" className="h-14 w-full rounded-2xl bg-white text-black font-bold text-sm hover:bg-neutral-200 transition-colors mt-8">
                  Сохранить клиента
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Delete Modal */}
      <AnimatePresence>
        {clientToDelete && (
          <motion.div 
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div 
              className="bg-[#050505] border border-red-500/20 w-full max-w-sm p-8 rounded-[2rem] text-center shadow-2xl"
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
            >
              <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={24} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Удалить клиента?</h2>
              <p className="text-sm text-white/40 mb-8">Это действие необратимо. Все связанные с ним дела также будут удалены.</p>
              
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setClientToDelete(null)}
                  className="flex-1 h-12 rounded-xl text-sm font-bold text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Отмена
                </button>
                <button 
                  onClick={confirmDeleteClient}
                  className="flex-1 h-12 rounded-xl text-sm font-bold bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                >
                  Удалить
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
