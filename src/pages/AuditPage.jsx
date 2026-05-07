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
  const [results, setResults] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState('');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [contractText, setContractText] = useState('');
  const [activeRiskIndex, setActiveRiskIndex] = useState(null);

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
      setContractText(data.original_text || '');
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
      setContractText(data.original_text || '');
    } catch (e) { setError(e.message); }
  };

  const levelColors = {
    high: { bg: 'bg-red-500/10', border: 'border-red-500/40', text: 'text-red-400', glow: 'shadow-[0_0_15px_rgba(239,68,68,0.3)]', icon: <AlertTriangle size={14} className="text-red-400"/>, label: 'ВЫСОКИЙ РИСК' },
    medium: { bg: 'bg-amber-500/10', border: 'border-amber-500/40', text: 'text-amber-400', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.3)]', icon: <SlidersHorizontal size={14} className="text-amber-400"/>, label: 'СРЕДНИЙ РИСК' },
    low: { bg: 'bg-sky-500/10', border: 'border-sky-500/40', text: 'text-sky-400', glow: 'shadow-[0_0_15px_rgba(14,165,233,0.3)]', icon: <CheckCircle2 size={14} className="text-sky-400"/>, label: 'РЕКОМЕНДАЦИЯ' },
  };

  const renderHighlightedText = () => {
    if (!contractText) return null;
    
    // Simple highlighting logic
    let highlighted = contractText;
    const sortedRisks = [...results].sort((a, b) => (b.location?.length || 0) - (a.location?.length || 0));

    return (
      <div className="whitespace-pre-wrap font-serif text-steel-200 leading-relaxed text-sm bg-obsidian-950/30 p-8 rounded-2xl border border-obsidian-800 shadow-inner max-h-[70vh] overflow-y-auto custom-scrollbar">
        {contractText.split('\n').map((line, li) => {
            let lineContent = line;
            results.forEach((risk, ri) => {
                if (risk.location && line.includes(risk.location)) {
                    const colors = levelColors[risk.level];
                    const isActive = activeRiskIndex === ri;
                    lineContent = line.split(risk.location).map((part, i, arr) => (
                        <span key={i}>
                            {part}
                            {i < arr.length - 1 && (
                                <span 
                                    className={`cursor-pointer px-1 rounded-sm transition-all duration-300 ${colors.bg} ${colors.text} ${isActive ? 'ring-2 ring-white/50 bg-white/10' : 'border-b border-dashed border-current'}`}
                                    onClick={() => setActiveRiskIndex(ri)}
                                >
                                    {risk.location}
                                </span>
                            )}
                        </span>
                    ));
                }
            });
            return <p key={li} className="mb-4">{lineContent}</p>;
        })}
      </div>
    );
  };

  return (
    <div className="max-w-[1400px] mx-auto p-4 sm:p-8 mt-4 pb-20">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
            
            {/* Header */}
            <motion.div variants={itemVariants} className="text-center sm:text-left mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center gap-4 mb-2">
                    <FileSearch className="text-chrome-400" size={36} strokeWidth={2.5} />
                    {t('audit_title')}
                </h1>
                <p className="text-steel-400 text-sm tracking-wide">Интерактивный анализ и поиск рисков в документах.</p>
              </div>
              {results && (
                  <MagneticButton as="button" onClick={() => { setResults(null); setFile(null); setSummary(''); setContractText(''); setActiveRiskIndex(null); }}
                    className="btn-secondary text-xs px-6 py-3 border border-obsidian-600 bg-obsidian-800" strength={0.3}>
                    Загрузить новый
                  </MagneticButton>
              )}
            </motion.div>

            {/* Upload Zone */}
            <AnimatePresence mode="wait">
              {!results && !analyzing && (
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
                        <p className="text-white font-bold text-xl tracking-wide mb-2">Перетащите файл договора сюда</p>
                        <p className="text-xs text-steel-500 font-mono tracking-widest uppercase">ИЛИ НАЖМИТЕ ДЛЯ ВЫБОРА ФАЙЛА</p>
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
                        Начать аудит →
                      </MagneticButton>
                    </div>
                  )}
                </motion.div>
              )}

              {analyzing && (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-40">
                      <div className="relative w-32 h-32 mb-8">
                          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                              className="absolute inset-0 border-4 border-chrome-500/20 border-t-chrome-500 rounded-full" />
                          <div className="absolute inset-4 bg-obsidian-900 rounded-full flex items-center justify-center">
                              <ShieldAlert className="text-chrome-400 animate-pulse" size={32} />
                          </div>
                      </div>
                      <p className="text-xl font-bold text-white mb-2">Глубокий анализ документа...</p>
                      <p className="text-steel-500 text-sm animate-pulse">Проверяем на соответствие ГК РК и НПА</p>
                  </motion.div>
              )}

              {/* Split View Results */}
              {results && !analyzing && (
                <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} 
                    className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                  
                  {/* Left: Document View */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold tracking-widest text-steel-500 uppercase flex items-center gap-2">
                        <FileText size={14} className="text-chrome-400" /> Текст документа
                    </h3>
                    {renderHighlightedText()}
                  </div>

                  {/* Right: Risks List */}
                  <div className="space-y-6">
                    <div className="glass-card p-6 border-l-4 border-amber-500/50 bg-amber-950/10 relative overflow-hidden">
                      <div className="flex items-center gap-5 relative z-10">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                          <AlertTriangle size={24} className="text-amber-400" />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-white tracking-wide">Выявлено {results.length} рисков</p>
                          <p className="text-xs text-steel-400 mt-1">{summary}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                      {results.map((risk, i) => {
                        const colors = levelColors[risk.level] || levelColors.low;
                        const isActive = activeRiskIndex === i;
                        return (
                          <motion.div key={i} 
                            onClick={() => setActiveRiskIndex(i)}
                            className={`glass-card p-5 border-l-[3px] transition-all duration-300 cursor-pointer 
                                ${isActive ? `${colors.border} ${colors.bg} scale-[1.02] ${colors.glow}` : 'border-obsidian-700/50 hover:border-obsidian-600 bg-obsidian-900/40'}`}
                            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                            <div className="flex items-center justify-between gap-3 mb-3">
                              <h3 className="text-base font-bold text-white tracking-wide">{risk.title}</h3>
                              <span className={`text-[9px] font-bold tracking-widest px-2 py-1 rounded ${colors.bg} ${colors.text} border ${colors.border}`}>
                                {colors.label}
                              </span>
                            </div>
                            <p className="text-xs text-steel-400 leading-relaxed mb-4">{risk.description}</p>
                            <div className="bg-obsidian-950/80 rounded-xl p-4 border border-obsidian-800">
                                <p className="text-[10px] uppercase font-bold tracking-widest text-steel-500 mb-2">Рекомендация:</p>
                                <p className="text-xs font-medium text-white mb-3">{risk.recommendation}</p>
                                <a href={risk.url} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 text-[10px] font-mono text-chrome-500 hover:text-chrome-300 transition-colors">
                                  <LinkIcon size={10} /> {risk.article}
                                </a>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    <MagneticButton as="button"
                      onClick={async () => {
                        try {
                          await docsApi.generate('contract', `Исправленный договор на основе аудита: ${file?.name || 'документ'}`);
                          alert("Успех! Перейдите в 'Мои документы'.");
                        } catch (e) { alert("Ошибка генерации"); }
                      }}
                      className="w-full btn-primary chrome-gradient text-obsidian-950 py-4 text-xs font-bold tracking-widest uppercase">
                      Сгенерировать исправленную версию
                    </MagneticButton>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Sidebar History */}
        <div className="w-full lg:w-72 flex-shrink-0">
          <div className="glass-card p-5 border border-obsidian-700/60 sticky top-24">
            <h3 className="text-xs text-steel-500 uppercase tracking-widest font-bold mb-4 flex items-center gap-2">
              <Clock size={14} className="text-chrome-400" /> Последние проверки
            </h3>
            {historyLoading ? (
              <p className="text-xs text-steel-600 animate-pulse">Загрузка...</p>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
                {history.map((item) => (
                  <button key={item.id} onClick={() => loadFromHistory(item)}
                    className="w-full text-left p-3 rounded-xl bg-obsidian-800/40 hover:bg-obsidian-800/80 border border-transparent hover:border-obsidian-600/50 transition-all duration-200 group">
                    <span className="text-xs text-chrome-300 truncate block mb-1">{item.filename}</span>
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold ${item.total_risks > 2 ? 'text-red-400' : 'text-amber-400'}`}>
                        {item.total_risks} рисков
                      </span>
                      <span className="text-[9px] text-steel-600">{new Date(item.created_at).toLocaleDateString('ru')}</span>
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
