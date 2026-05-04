import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../i18n/LanguageContext';
import { Search, Building2, CheckCircle2, ShieldCheck, Download, BarChart3, AlertCircle, Clock, ChevronRight } from 'lucide-react';
import MagneticButton from '../components/MagneticButton';
import { counterpartyApi } from '../services/api';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } }
};

export default function CounterpartyPage() {
  const { t } = useLanguage();
  const [bin, setBin] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await counterpartyApi.getHistory();
      setHistory(data);
    } catch (e) {
      console.error('History load error:', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleCheck = async (e) => {
    e.preventDefault();
    if (bin.length !== 12) return;
    setLoading(true);
    setError('');
    try {
      const data = await counterpartyApi.check(bin);
      setResult(data);
      loadHistory(); // Refresh history after new check
    } catch (err) {
      setError(err.message || 'Ошибка проверки');
    } finally {
      setLoading(false);
    }
  };

  const loadFromHistory = async (item) => {
    try {
      const data = await counterpartyApi.getDetail(item.id);
      setResult(data);
      setBin(item.bin_number);
    } catch (e) {
      setError(e.message);
    }
  };

  const riskColor = (level) => {
    if (!level) return 'text-steel-400';
    const l = level.toLowerCase();
    if (l.includes('низк') || l === 'low') return 'text-emerald-400';
    if (l.includes('средн') || l === 'medium') return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-8 mt-4 pb-20">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
            
            {/* Header */}
            <motion.div variants={itemVariants} className="text-center sm:text-left mb-8">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center justify-center sm:justify-start gap-4 mb-2">
                <Search className="text-chrome-400" size={36} strokeWidth={2.5} />
                {t('counterparty_title')}
              </h1>
              <p className="text-steel-400 text-sm tracking-wide">Проверка юридических лиц по базам данных Республики Казахстан на предмет рисков.</p>
            </motion.div>

            {/* Search Form */}
            <motion.div variants={itemVariants} className="glass-card p-2 sm:p-2 rounded-2xl relative overflow-hidden bg-obsidian-900 border border-obsidian-700/80 shadow-2xl">
              <AnimatePresence>
                {bin.length > 0 && !result && (
                  <motion.div
                    className="absolute top-0 bottom-0 w-32 bg-gradient-to-r from-transparent via-chrome-500/20 to-transparent skew-x-12 opacity-50"
                    animate={{ x: ['-200%', '800%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  />
                )}
              </AnimatePresence>

              <form onSubmit={handleCheck} className="flex flex-col sm:flex-row gap-3 relative z-10 w-full">
                <div className="flex-1 relative flex items-center">
                  <div className="absolute left-6 text-steel-500"><Building2 size={24} /></div>
                  <input
                    type="text" value={bin}
                    onChange={(e) => { const val = e.target.value.replace(/\D/g, '').slice(0, 12); setBin(val); if (result) setResult(null); }}
                    placeholder={t('counterparty_placeholder')}
                    className="w-full bg-obsidian-950/50 border border-obsidian-800 focus:border-chrome-500/50 rounded-xl py-6 pl-16 pr-16 text-xl tracking-[0.2em] font-mono text-white placeholder-obsidian-700 outline-none transition-all shadow-inner focus:shadow-[inset_0_2px_10px_rgba(0,0,0,0.5),0_0_15px_rgba(255,255,255,0.05)]"
                  />
                  <span className={`absolute right-6 text-xs font-mono font-bold tracking-widest ${bin.length === 12 ? 'text-emerald-400' : 'text-steel-600'}`}>
                    {bin.length}/12
                  </span>
                </div>
                <MagneticButton type="submit" disabled={bin.length !== 12 || loading}
                  className={`h-auto px-10 rounded-xl flex items-center justify-center border font-bold tracking-widest text-sm uppercase transition-all duration-300
                    ${bin.length === 12 && !loading 
                      ? 'btn-primary chrome-gradient text-obsidian-950 shadow-[0_0_20px_rgba(255,255,255,0.15)]' 
                      : 'bg-obsidian-800 border-obsidian-700/50 text-steel-500 cursor-not-allowed opacity-50 grayscale'}`}
                  strength={0.2}>
                  {loading ? (
                    <span className="flex items-center gap-3">
                      <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Ожидание...
                    </span>
                  ) : t('counterparty_check')}
                </MagneticButton>
              </form>
            </motion.div>

            {/* Loading */}
            <AnimatePresence>
              {loading && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="glass-card p-8 border border-chrome-500/30 bg-obsidian-900 shadow-[inset_0_0_50px_rgba(255,255,255,0.02)] flex flex-col items-center justify-center text-center overflow-hidden">
                  <div className="w-16 h-1 rounded-full bg-obsidian-800 overflow-hidden mb-6 relative">
                    <motion.div className="absolute left-0 top-0 bottom-0 bg-chrome-400 shadow-[0_0_10px_#fff]"
                      animate={{ width: ['0%', '100%'] }} transition={{ duration: 2, ease: "easeInOut" }} />
                  </div>
                  <p className="font-mono text-chrome-400 text-sm tracking-widest animate-pulse">ОБРАЩЕНИЕ К БАЗЕ ДАННЫХ...</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            {error && (
              <div className="glass-card p-4 border border-red-500/30 text-red-400 text-sm flex items-center gap-3">
                <AlertCircle size={18} /> {error}
              </div>
            )}

            {/* Results */}
            <AnimatePresence>
              {result && !loading && (
                <motion.div initial={{ opacity: 0, y: 40, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 100 }}>
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-obsidian-700">
                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                      <CheckCircle2 className="text-emerald-400" /> {t('counterparty_result')}
                    </h2>
                    <span className="segment-b2b flex items-center gap-1"><Building2 size={12}/> B2B</span>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6 mb-6">
                    <div className="glass-card p-6 bg-obsidian-900/60 border border-obsidian-700/80">
                      <h3 className="text-xs text-steel-500 uppercase tracking-widest font-bold mb-5 flex items-center gap-2">
                        <Building2 size={14} className="text-chrome-400" /> Основная информация
                      </h3>
                      <div className="space-y-4">
                        {[['Наименование', result.companyName], ['БИН', result.bin],
                          ['Статус', result.status, result.status === 'Действующее' ? 'text-emerald-400' : 'text-amber-400'],
                          ['Дата регистрации', result.registrationDate], ['Руководитель', result.director],
                        ].map(([label, value, colorClass]) => (
                          <div key={label} className="flex justify-between items-center border-b border-obsidian-800/50 pb-2">
                            <span className="text-xs text-steel-500">{label}</span>
                            <span className={`text-sm font-medium ${colorClass || 'text-chrome-100'} text-right max-w-[60%]`}>{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="glass-card p-6 bg-obsidian-900/60 border border-obsidian-700/80">
                      <h3 className="text-xs text-steel-500 uppercase tracking-widest font-bold mb-5 flex items-center gap-2">
                        <BarChart3 size={14} className="text-chrome-400" /> Детали компании
                      </h3>
                      <div className="space-y-4">
                        {[['Адрес', result.address], ['Вид деятельности', result.activity],
                          ['Кол-во сотрудников', result.employees],
                          ['Налоговая задолженность', result.taxDebt, result.taxDebt === '0 ₸' ? 'text-emerald-400' : 'text-red-400'],
                        ].map(([label, value, colorClass]) => (
                          <div key={label} className="flex flex-col sm:flex-row justify-between sm:items-center gap-1 border-b border-obsidian-800/50 pb-2">
                            <span className="text-xs text-steel-500">{label}</span>
                            <span className={`text-sm font-medium ${colorClass || 'text-chrome-100'} sm:text-right max-w-[80%]`}>{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Risk */}
                  <div className="glass-card p-6 border border-emerald-500/20 bg-emerald-950/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                    <h3 className="text-xs text-steel-500 uppercase tracking-widest font-bold mb-6 flex items-center gap-2">
                      <ShieldCheck size={14} className="text-emerald-400" /> AI Оценка рисков
                    </h3>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
                      <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                          <ShieldCheck size={32} className="text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-xl font-bold text-emerald-400 mb-1 tracking-wide">Уровень риска: {result.riskLevel}</p>
                          <p className="text-sm text-steel-400 font-medium">Контрагент прошёл первичную проверку ИИ.</p>
                        </div>
                      </div>
                    </div>
                    {result.aiAnalysis && (
                      <p className="mt-4 text-sm text-steel-400 border-t border-obsidian-700/50 pt-4">{result.aiAnalysis}</p>
                    )}
                    <p className="mt-4 text-[10px] text-steel-500 italic text-center">
                      * Данные получены из открытых источников методом ИИ-поиска. Рекомендуется сверка с egov.kz.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* History sidebar */}
        <div className="w-full lg:w-72 flex-shrink-0">
          <div className="glass-card p-5 border border-obsidian-700/60 sticky top-24">
            <h3 className="text-xs text-steel-500 uppercase tracking-widest font-bold mb-4 flex items-center gap-2">
              <Clock size={14} className="text-chrome-400" /> История проверок
            </h3>
            {historyLoading ? (
              <p className="text-xs text-steel-600 animate-pulse">Загрузка...</p>
            ) : history.length === 0 ? (
              <p className="text-xs text-steel-600">Пока нет проверок</p>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {history.map((item) => (
                  <button key={item.id} onClick={() => loadFromHistory(item)}
                    className="w-full text-left p-3 rounded-xl bg-obsidian-800/40 hover:bg-obsidian-800/80 border border-transparent hover:border-obsidian-600/50 transition-all duration-200 group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-chrome-300 tracking-wider">{item.bin_number}</span>
                      <ChevronRight size={12} className="text-steel-600 group-hover:text-chrome-400 transition-colors" />
                    </div>
                    <p className="text-xs text-steel-400 truncate">{item.company_name || 'Компания'}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-[10px] font-bold ${riskColor(item.risk_level)}`}>{item.risk_level || '—'}</span>
                      <span className="text-[10px] text-steel-600">{new Date(item.created_at).toLocaleDateString('ru')}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
