import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../i18n/LanguageContext';
import { ShieldAlert, FileSearch, CheckCircle2, AlertTriangle, FileText, Download, SlidersHorizontal, UploadCloud, Link as LinkIcon, Building2, Clock, ChevronRight } from 'lucide-react';
import MagneticButton from '../components/MagneticButton';
import { auditApi, docsApi } from '../services/api';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } }
};

export default function AuditPage() {
  const { t } = useLanguage();
  const [file, setFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [summary, setSummary] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => { loadHistory(); }, []);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await auditApi.getHistory();
      setHistory(data);
    } catch (e) { console.error('Audit history error:', e); }
    finally { setHistoryLoading(false); }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    setError('');
    try {
      const data = await auditApi.analyze(file);
      setResults(data.risks || []);
      setSummary(data.summary || '');
      loadHistory();
    } catch (err) {
      setError(err.message || 'Ошибка анализа');
    } finally {
      setAnalyzing(false);
    }
  };

  const loadFromHistory = async (item) => {
    try {
      const data = await auditApi.getDetail(item.id);
      setResults(data.risks || []);
      setSummary(data.summary || '');
    } catch (e) { setError(e.message); }
  };

  const levelColors = {
    high: { bg: 'bg-red-500/10', border: 'border-red-500/40', text: 'text-red-400', icon: <AlertTriangle size={14} className="text-red-400"/>, label: 'ВЫСОКИЙ РИСК' },
    medium: { bg: 'bg-amber-500/10', border: 'border-amber-500/40', text: 'text-amber-400', icon: <SlidersHorizontal size={14} className="text-amber-400"/>, label: 'СРЕДНИЙ РИСК' },
    low: { bg: 'bg-sky-500/10', border: 'border-sky-500/40', text: 'text-sky-400', icon: <CheckCircle2 size={14} className="text-sky-400"/>, label: 'РЕКОМЕНДАЦИЯ' },
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-8 mt-4 pb-20">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main */}
        <div className="flex-1 min-w-0">
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
            
            {/* Header */}
            <motion.div variants={itemVariants} className="text-center sm:text-left mb-8">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center justify-center sm:justify-start gap-4 mb-2">
                <FileSearch className="text-chrome-400" size={36} strokeWidth={2.5} />
                {t('audit_title')}
              </h1>
              <p className="text-steel-400 text-sm tracking-wide">Глубокая AI-проверка договоров на соответствие законодательству РК.</p>
            </motion.div>

            {/* Upload Zone */}
            <AnimatePresence mode="wait">
              {!results && (
                <motion.div key="upload" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="glass-card p-2 sm:p-2 rounded-2xl relative bg-obsidian-900 border border-obsidian-700/80 shadow-2xl">
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={(e) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]); }}
                    onClick={() => document.getElementById('audit-file')?.click()}
                    className={`relative p-12 sm:p-20 text-center border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden group
                      ${dragActive ? 'border-chrome-400 bg-chrome-500/5' : file ? 'border-chrome-500/30 bg-chrome-500/5' : 'border-obsidian-600/50 hover:border-chrome-500/30 bg-obsidian-950/50'}`}>
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-obsidian-950/50 pointer-events-none" />
                    <input id="audit-file" type="file" accept=".pdf,.docx,.doc" className="hidden"
                      onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])} />
                    
                    {file ? (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 flex flex-col items-center">
                        <div className="w-20 h-20 rounded-2xl chrome-gradient flex items-center justify-center mb-5 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                          <FileText size={40} className="text-obsidian-950" strokeWidth={1.5} />
                        </div>
                        <p className="text-white font-bold text-lg tracking-wide mb-1">{file.name}</p>
                        <p className="text-xs text-steel-500 font-mono tracking-widest uppercase">{(file.size / 1024).toFixed(1)} KB • ДОКУМЕНТ ЗАГРУЖЕН</p>
                      </motion.div>
                    ) : (
                      <div className="relative z-10 flex flex-col items-center opacity-70 group-hover:opacity-100 transition-opacity">
                        <motion.div animate={{ y: dragActive ? [0, -10, 0] : 0 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                          className="mb-6 text-steel-500 group-hover:text-chrome-400 transition-colors">
                          <UploadCloud size={64} strokeWidth={1} />
                        </motion.div>
                        <p className="text-white font-bold text-xl tracking-wide mb-2">Перетащите файл документа сюда</p>
                        <p className="text-xs text-steel-500 font-mono tracking-widest uppercase">ИЛИ НАЖМИТЕ ДЛЯ ВЫБОРА ФАЙЛА (PDF, DOCX)</p>
                      </div>
                    )}
                  </div>

                  {file && (
                    <div className="p-4 mt-2">
                      <MagneticButton as="button" onClick={handleAnalyze} disabled={analyzing}
                        className={`w-full py-5 rounded-xl flex items-center justify-center font-bold tracking-widest text-sm uppercase transition-all duration-300
                          ${!analyzing ? 'btn-primary chrome-gradient text-obsidian-950 shadow-[0_0_20px_rgba(255,255,255,0.15)]'
                            : 'bg-obsidian-800 border border-obsidian-700/50 text-steel-500 cursor-not-allowed grayscale'}`}
                        strength={0.1}>
                        {analyzing ? (
                          <span className="flex items-center gap-3">
                            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                            Анализ по базам НПА РК...
                          </span>
                        ) : <>Запустить глубокий аудит →</>}
                      </MagneticButton>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Results */}
              {results && !analyzing && (
                <motion.div key="results" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-obsidian-700/80 gap-4">
                    <div className="flex items-center gap-4">
                      <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                        <ShieldAlert className="text-amber-400" size={28} /> Результаты Аудита
                      </h2>
                      <span className="segment-b2b flex items-center gap-1"><Building2 size={12}/> B2B</span>
                    </div>
                    <MagneticButton as="button" onClick={() => { setResults(null); setFile(null); setSummary(''); }}
                      className="btn-secondary text-xs px-4 py-2 border border-obsidian-600 bg-obsidian-800" strength={0.3}>
                      Загрузить другой
                    </MagneticButton>
                  </div>

                  {/* Summary */}
                  <div className="glass-card p-6 border-l-4 border-amber-500/50 bg-amber-950/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                    <div className="flex items-center gap-5 relative z-10">
                      <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.15)] flex-shrink-0">
                        <AlertTriangle size={32} className="text-amber-400" />
                      </div>
                      <div>
                        <p className="text-xl font-bold text-white mb-1 tracking-wide">Выявлено {results.length} замечаний</p>
                        <p className="text-sm font-mono tracking-widest text-steel-400">
                          <span className="text-red-400">{results.filter(r => r.level === 'high').length} КРИТ.</span> • 
                          <span className="text-amber-400 mx-1">{results.filter(r => r.level === 'medium').length} СРЕДН.</span> • 
                          <span className="text-sky-400 ml-1">{results.filter(r => r.level === 'low').length} ИНФО.</span>
                        </p>
                        {summary && <p className="text-xs text-steel-400 mt-2">{summary}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Risks */}
                  <div className="space-y-4">
                    {results.map((risk, i) => {
                      const colors = levelColors[risk.level] || levelColors.low;
                      return (
                        <motion.div key={i} className={`glass-card p-6 border-l-[3px] ${colors.border} bg-obsidian-900/60 shadow-lg`}
                          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                            <h3 className="text-lg font-bold text-white tracking-wide">{risk.title}</h3>
                            <span className={`flex items-center gap-1.5 text-[10px] font-bold tracking-widest px-3 py-1.5 rounded-md ${colors.bg} ${colors.text} border ${colors.border}`}>
                              {colors.icon} {colors.label}
                            </span>
                          </div>
                          <p className="text-sm text-steel-400 leading-relaxed max-w-3xl mb-5">{risk.description}</p>
                          <div className="bg-obsidian-950/80 rounded-xl p-4 sm:p-5 border border-obsidian-800 shadow-inner">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle2 size={16} className="text-chrome-400" />
                              <p className="text-xs uppercase font-bold tracking-widest text-steel-500">Рекомендация ИИ:</p>
                            </div>
                            <p className="text-sm font-medium text-white mb-4 leading-relaxed">{risk.recommendation}</p>
                            <a href={risk.url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-[11px] font-mono tracking-wider text-chrome-500 hover:text-chrome-300 transition-colors bg-chrome-500/10 px-3 py-1.5 rounded-lg">
                              <LinkIcon size={12} /> {risk.article} — ADILET.ZAN.KZ
                            </a>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <MagneticButton as="button"
                      onClick={async () => {
                        try {
                          await docsApi.generate('contract', `Исправленный договор на основе аудита: ${file?.name || 'документ'}`);
                          alert("Успех! Перейдите в 'Мои документы' для скачивания.");
                        } catch (e) { alert("Ошибка генерации"); }
                      }}
                      className="flex-1 btn-primary chrome-gradient text-obsidian-950 shadow-[0_0_20px_rgba(255,255,255,0.1)] py-4 text-sm font-bold tracking-widest uppercase cursor-pointer">
                      <FileText size={16} className="mr-2 inline" /> Сгенерировать исправленный документ
                    </MagneticButton>
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
              <Clock size={14} className="text-chrome-400" /> История аудитов
            </h3>
            {historyLoading ? (
              <p className="text-xs text-steel-600 animate-pulse">Загрузка...</p>
            ) : history.length === 0 ? (
              <p className="text-xs text-steel-600">Пока нет аудитов</p>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {history.map((item) => (
                  <button key={item.id} onClick={() => loadFromHistory(item)}
                    className="w-full text-left p-3 rounded-xl bg-obsidian-800/40 hover:bg-obsidian-800/80 border border-transparent hover:border-obsidian-600/50 transition-all duration-200 group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-chrome-300 truncate max-w-[80%]">{item.filename}</span>
                      <ChevronRight size={12} className="text-steel-600 group-hover:text-chrome-400 transition-colors flex-shrink-0" />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-[10px] font-bold ${item.total_risks > 3 ? 'text-red-400' : item.total_risks > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {item.total_risks} замечаний
                      </span>
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
