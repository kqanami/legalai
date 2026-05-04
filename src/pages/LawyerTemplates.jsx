import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Search, Download, Plus, Filter, Clock, Star } from 'lucide-react';
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

  const filtered = templates.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-8 h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight mb-2">Библиотека <span className="text-chrome-400">Шаблонов</span></h1>
            <p className="text-steel-400 font-medium">Профессиональные бланки и образцы документов.</p>
          </div>
          <MagneticButton className="btn-primary flex items-center gap-2 px-6 py-3 rounded-xl">
            <Plus size={18} />
            <span>Добавить свой</span>
          </MagneticButton>
        </div>

        <div className="glass-card p-4 mb-8 flex items-center gap-4">
          <Search className="text-steel-500" size={20} />
          <input 
            type="text" 
            placeholder="Поиск шаблона по названию..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-white w-full placeholder:text-steel-600 font-medium"
          />
          <div className="flex gap-2">
            <button className="p-2 hover:bg-obsidian-800 rounded-lg text-steel-400 transition-colors">
              <Filter size={18} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card p-6 hover:border-chrome-500/50 transition-all group cursor-pointer relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-chrome-500/5 rounded-bl-full pointer-events-none group-hover:bg-chrome-500/10 transition-colors" />
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-obsidian-800 rounded-xl text-chrome-400 shadow-inner">
                  <FileText size={24} />
                </div>
                {t.popular && (
                  <span className="text-[10px] font-bold uppercase tracking-widest bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded-full border border-yellow-500/20">
                    Популярное
                  </span>
                )}
              </div>
              <h3 className="font-bold text-white mb-2 leading-snug group-hover:text-chrome-300 transition-colors">{t.title}</h3>
              <div className="flex items-center gap-4 mt-6 pt-4 border-t border-obsidian-800">
                <div className="text-[11px] font-bold text-steel-500 uppercase tracking-wider">{t.category}</div>
                <div className="flex items-center gap-1 text-[11px] text-steel-500 ml-auto font-mono">
                  <Clock size={12} /> {t.downloads} скачиваний
                </div>
              </div>
              <button className="mt-4 w-full py-2 bg-obsidian-800 hover:bg-chrome-500 hover:text-obsidian-950 rounded-lg transition-all font-bold text-xs flex items-center justify-center gap-2">
                <Download size={14} /> Скачать .DOCX
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
