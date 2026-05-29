import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Search, Download, Plus, Filter, Clock, Star, Sparkles } from 'lucide-react';
import MagneticButton from '../components/MagneticButton';

const templates = [
  { id: 1, title: 'Договор купли-продажи недвижимости', category: 'Гражданское', popular: true, downloads: 1240 },
  { id: 2, title: 'Исковое заявление о взыскании долга', category: 'Судебное', popular: true, downloads: 850 },
  { id: 3, title: 'Трудовой договор (стандартный)', category: 'Трудовое', popular: false, downloads: 620 },
  { id: 4, title: 'Доверенность на представление интересов', category: 'Гражданское', popular: false, downloads: 410 },
  { id: 5, title: 'Жалоба на действия должностного лица', category: 'Административное', popular: false, downloads: 320 },
  { id: 6, title: 'Устав ТОО (типовой)', category: 'Корпоративное', popular: true, downloads: 1100 },
];

export default function LawyerTemplates() {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const filtered = templates.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col h-full bg-[#050505] text-white overflow-hidden p-6 lg:p-10 selection:bg-white/20 font-sans">
      <div className="flex justify-between items-center mb-6 shrink-0 gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-black tracking-tight flex items-center gap-3">
            <FileText size={28} />
            Библиотека Шаблонов
          </h1>
          <p className="text-white/40 font-bold tracking-widest text-[10px] uppercase mt-1">Профессиональные бланки и образцы документов.</p>
        </div>
        <button className="h-12 px-6 rounded-2xl bg-white text-black font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-neutral-200 transition-colors whitespace-nowrap shrink-0">
          <Plus size={16} />
          <span>Добавить свой</span>
        </button>
      </div>

      <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-3 mb-6 shrink-0 flex items-center gap-3">
        <Search className="text-white/40 ml-2" size={18} />
        <input 
          type="text" 
          placeholder="Поиск шаблона по названию..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent border-none outline-none text-sm text-white w-full placeholder:text-white/30 font-medium"
        />
        <div className="flex gap-2">
          <button className="w-10 h-10 flex items-center justify-center hover:bg-white/[0.05] rounded-xl text-white/40 hover:text-white transition-colors">
            <Filter size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
          {filtered.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white/[0.01] p-6 rounded-[2rem] border border-white/5 hover:border-white/20 transition-all group cursor-pointer relative overflow-hidden flex flex-col hover:bg-white/[0.02]"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="w-14 h-14 bg-[#050505] rounded-2xl border border-white/5 flex items-center justify-center text-white/40 group-hover:text-white transition-colors">
                  <FileText size={20} />
                </div>
                {t.popular && (
                  <span className="text-[9px] font-black uppercase tracking-widest bg-white text-black px-3 py-1.5 rounded-full">
                    Популярное
                  </span>
                )}
              </div>
              
              <h3 className="font-bold text-lg text-white mb-6 leading-snug group-hover:text-white/80 transition-colors">{t.title}</h3>
              
              <div className="flex items-center justify-between mt-auto mb-6">
                <div className="text-[9px] font-black text-white/40 uppercase tracking-widest px-2.5 py-1 bg-white/[0.05] rounded-md border border-white/5">{t.category}</div>
                <div className="flex items-center gap-1 text-[10px] text-white/40 font-black uppercase tracking-widest">
                  <Clock size={12} /> {t.downloads} скачиваний
                </div>
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => navigate(`/documents?generate=contract&desc=${encodeURIComponent(t.title)}`)}
                  className="flex-1 h-12 bg-white/[0.05] hover:bg-white text-white hover:text-black rounded-xl transition-all font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 border border-white/10"
                  title="Заполнить через AI"
                >
                  <Sparkles size={14} /> AI
                </button>
                <button className="flex-1 h-12 bg-white text-black hover:bg-neutral-200 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
                  <Download size={14} /> DOCX
                </button>
              </div>
            </motion.div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full py-20 text-center">
              <p className="text-white/40 font-black uppercase tracking-widest text-[10px]">Шаблоны не найдены</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
