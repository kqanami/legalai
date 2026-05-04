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
    <div className="h-full p-8 flex flex-col relative overflow-hidden">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Users className="text-chrome-400" />
            База клиентов
          </h1>
          <p className="text-steel-400 mt-2 text-sm tracking-wide">Управление профилями и контактными данными</p>
        </div>
        
        <MagneticButton onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center gap-2 px-5 py-2.5">
          <UserPlus size={18} />
          <span>Новый клиент</span>
        </MagneticButton>
      </div>

      <div className="glass-card p-4 mb-6 flex items-center gap-3">
        <Search className="text-steel-500" size={20} />
        <input 
          type="text" 
          placeholder="Поиск по имени или телефону..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent border-none outline-none text-white w-full placeholder:text-steel-600"
        />
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {loading ? (
          <div className="text-steel-400 text-center py-10">Загрузка клиентов...</div>
        ) : filteredClients.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map((client, i) => (
              <motion.div 
                key={client.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-6 flex flex-col hover:border-chrome-500/50 transition-colors group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-chrome-500/5 rounded-bl-full pointer-events-none group-hover:bg-chrome-500/10 transition-colors" />
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setClientToDelete(client.id);
                  }}
                  className="absolute top-4 right-4 p-2 text-steel-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors z-10 opacity-0 group-hover:opacity-100"
                  title="Удалить клиента"
                >
                  <Trash2 size={18} />
                </button>
                
                <h3 className="text-xl font-bold text-white mb-4 pr-10">{client.name}</h3>
                
                <div className="space-y-3 mt-auto">
                  <div className="flex items-center gap-3 text-steel-400 text-sm">
                    <Phone size={16} className="text-obsidian-400 group-hover:text-chrome-400 transition-colors" />
                    <span>{client.phone || 'Не указан'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-steel-400 text-sm">
                    <Mail size={16} className="text-obsidian-400 group-hover:text-chrome-400 transition-colors" />
                    <span className="truncate">{client.email || 'Не указан'}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-steel-500 text-center py-20 border border-dashed border-obsidian-700 rounded-2xl">
            {searchQuery ? 'Клиенты не найдены' : 'У вас пока нет ни одного клиента. Добавьте первого!'}
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
              className="glass-card w-full max-w-md p-8 relative"
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
            >
              <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-steel-400 hover:text-white">
                <X size={24} />
              </button>
              
              <h2 className="text-2xl font-bold text-white mb-6">Новый клиент</h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-steel-400 mb-1">ФИО / Название компании <span className="text-red-500">*</span></label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input-field shadow-inner" placeholder="Иван Иванов" />
                </div>
                <div>
                  <label className="block text-sm text-steel-400 mb-1">Телефон</label>
                  <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="input-field shadow-inner" placeholder="+7 (700) 000-00-00" />
                </div>
                <div>
                  <label className="block text-sm text-steel-400 mb-1">Email</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="input-field shadow-inner" placeholder="client@example.com" />
                </div>
                <div>
                  <label className="block text-sm text-steel-400 mb-1">Заметки</label>
                  <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="input-field shadow-inner h-24 resize-none" placeholder="Дополнительная информация о клиенте..." />
                </div>
                
                <MagneticButton type="submit" className="btn-primary w-full py-3 mt-4">
                  Сохранить клиента
                </MagneticButton>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Delete Modal */}
      <AnimatePresence>
        {clientToDelete && (
          <motion.div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div 
              className="glass-card w-full max-w-sm p-6 text-center border-red-500/30"
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
            >
              <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Удалить клиента?</h2>
              <p className="text-sm text-steel-400 mb-6">Это действие необратимо. Все связанные с ним дела также будут удалены.</p>
              
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setClientToDelete(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-steel-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Отмена
                </button>
                <button 
                  onClick={confirmDeleteClient}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
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
