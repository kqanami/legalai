import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../i18n/LanguageContext';
import { ShieldAlert, FileSearch, CheckCircle2, AlertTriangle, FileText, Download, SlidersHorizontal, UploadCloud, Link as LinkIcon, Building2, Clock, ChevronRight, Trash2 } from 'lucide-react';
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
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [activeAuditId, setActiveAuditId] = useState(null);
  const [savingText, setSavingText] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);

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
    setActiveAuditId(null);
    setIsEditing(false);
    try {
      const data = await auditApi.analyze(file);
      setResults(data.risks || []);
      setSummary(data.summary || '');
      setContractText(data.original_text || '');
      setActiveAuditId(data.id || null);
      loadHistory();
    } catch (err) {
      setError(err.message || 'Ошибка анализа');
    } finally {
      setAnalyzing(false);
    }
  };

  const loadFromHistory = async (item) => {
    try {
      setIsEditing(false);
      const data = await auditApi.getDetail(item.id);
      setResults(data.risks || []);
      setSummary(data.summary || '');
      setContractText(data.original_text || '');
      setActiveAuditId(item.id);
    } catch (e) { setError(e.message); }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await auditApi.deleteItem(deleteTargetId);
      loadHistory();
      if (deleteTargetId === activeAuditId) {
        setResults(null);
        setFile(null);
        setSummary('');
        setContractText('');
        setActiveRiskIndex(null);
        setActiveAuditId(null);
        setIsEditing(false);
      }
      showToast('Анализ успешно удалён из истории', 'success');
    } catch (err) {
      showToast('Ошибка удаления: ' + err.message, 'error');
    } finally {
      setDeleteTargetId(null);
    }
  };

  const handleClearHistory = async () => {
    try {
      await auditApi.clearHistory();
      loadHistory();
      setResults(null);
      setFile(null);
      setSummary('');
      setContractText('');
      setActiveRiskIndex(null);
      setActiveAuditId(null);
      setIsEditing(false);
      showToast('Вся история успешно очищена', 'success');
    } catch (err) {
      showToast('Ошибка очистки истории: ' + err.message, 'error');
    } finally {
      setConfirmClearAll(false);
    }
  };

  const saveCurrentText = async () => {
    if (!activeAuditId) return;
    setSavingText(true);
    try {
      await auditApi.saveText(activeAuditId, contractText);
      showToast('Правки сохранены', 'success');
      loadHistory();
    } catch (err) {
      showToast('Ошибка сохранения: ' + err.message, 'error');
    } finally {
      setSavingText(false);
    }
  };

  const handleToggleEdit = async () => {
    if (isEditing) {
      setIsEditing(false);
      await saveCurrentText();
    } else {
      setIsEditing(true);
    }
  };

  const handleReanalyze = async () => {
    if (!contractText || !contractText.trim()) {
      showToast('Текст документа пуст', 'error');
      return;
    }
    setReanalyzing(true);
    try {
      const data = await auditApi.reanalyze(contractText, file?.name || 'Редактированный документ.docx', activeAuditId);
      setResults(data.risks || []);
      setSummary(data.summary || '');
      setContractText(data.original_text || '');
      if (data.id) {
        setActiveAuditId(data.id);
      }
      loadHistory();
      setIsEditing(false);
      showToast('Анализ успешно обновлен с учетом ваших правок!', 'success');
    } catch (err) {
      showToast('Ошибка анализа правок: ' + err.message, 'error');
    } finally {
      setReanalyzing(false);
    }
  };

  const levelColors = {
    high: { bg: 'bg-red-500/10', border: 'border-red-500/40', text: 'text-red-400', glow: 'shadow-[0_0_15px_rgba(239,68,68,0.3)]', icon: <AlertTriangle size={14} className="text-red-400"/>, label: 'ВЫСОКИЙ РИСК' },
    medium: { bg: 'bg-amber-500/10', border: 'border-amber-500/40', text: 'text-amber-400', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.3)]', icon: <SlidersHorizontal size={14} className="text-amber-400"/>, label: 'СРЕДНИЙ РИСК' },
    low: { bg: 'bg-sky-500/10', border: 'border-sky-500/40', text: 'text-sky-400', glow: 'shadow-[0_0_15px_rgba(14,165,233,0.3)]', icon: <CheckCircle2 size={14} className="text-sky-400"/>, label: 'РЕКОМЕНДАЦИЯ' },
  };

  const renderHighlightedText = () => {
    if (!contractText) return null;
    
    if (isEditing) {
      return (
        <div className="space-y-4">
          <textarea
            value={contractText}
            onChange={(e) => setContractText(e.target.value)}
            className="w-full font-mono text-xs text-steel-200 leading-relaxed bg-obsidian-950/50 p-5 sm:p-6 rounded-2xl border border-obsidian-800 focus:border-chrome-500/40 focus:ring-1 focus:ring-chrome-500/20 shadow-inner h-[50vh] focus:outline-none transition-all duration-200 custom-scrollbar resize-none"
            placeholder="Внесите правки в текст договора прямо здесь..."
          />
          
          <div className="flex gap-3">
            <button
              disabled={reanalyzing || savingText}
              onClick={handleReanalyze}
              className="w-full py-3.5 px-4 rounded-xl border border-chrome-500/30 bg-chrome-500/10 hover:bg-chrome-500/20 text-chrome-400 text-xs font-bold uppercase tracking-wider transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.05)] animate-pulse"
            >
              {reanalyzing ? (
                <>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-3.5 h-3.5 border-2 border-chrome-400 border-t-transparent rounded-full" />
                  <span>Анализ...</span>
                </>
              ) : (
                <>
                  <SlidersHorizontal size={14} className="text-chrome-400" />
                  <span>Перезапустить анализ правок</span>
                </>
              )}
            </button>
          </div>
        </div>
      );
    }
    
    // Simple highlighting logic
    let highlighted = contractText;
    const sortedRisks = [...results].sort((a, b) => (b.location?.length || 0) - (a.location?.length || 0));

    return (
      <div className="whitespace-pre-wrap font-serif text-steel-200 leading-relaxed text-sm bg-obsidian-950/30 p-5 sm:p-6 rounded-2xl border border-obsidian-800 shadow-inner max-h-[58vh] overflow-y-auto custom-scrollbar">
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
                  <MagneticButton as="button" onClick={() => { setResults(null); setFile(null); setSummary(''); setContractText(''); setActiveRiskIndex(null); setActiveAuditId(null); setIsEditing(false); }}
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
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-xs font-bold tracking-widest text-steel-500 uppercase flex items-center gap-2">
                          <FileText size={14} className="text-chrome-400" /> Текст документа
                      </h3>
                      <button 
                        onClick={handleToggleEdit}
                        className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all duration-200 uppercase tracking-wider flex items-center gap-1.5
                          ${isEditing 
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.15)]' 
                            : 'bg-obsidian-800/60 border-obsidian-700 text-steel-400 hover:text-white hover:border-obsidian-600'
                          }`}
                      >
                        {isEditing ? (
                          <>
                            <CheckCircle2 size={12} className="text-emerald-400" />
                            <span>Сохранить правки</span>
                          </>
                        ) : (
                          <>
                            <SlidersHorizontal size={12} className="text-chrome-400" />
                            <span>Редактировать</span>
                          </>
                        )}
                      </button>
                    </div>
                    {renderHighlightedText()}
                  </div>

                  {/* Right: Risks List */}
                  <div className="space-y-4">
                    <div className="glass-card p-3.5 sm:p-4 border-l-4 border-amber-500/50 bg-amber-950/10 relative overflow-hidden">
                      <div className="flex items-center gap-3.5 sm:gap-4 relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                          <AlertTriangle size={20} className="text-amber-400" />
                        </div>
                        <div>
                          <p className="text-sm sm:text-base font-bold text-white tracking-wide">Выявлено {results.length} рисков</p>
                          <p className="text-xs text-steel-400 mt-0.5 leading-relaxed">{summary}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 max-h-[38vh] overflow-y-auto pr-2 custom-scrollbar">
                      {results.map((risk, i) => {
                        const colors = levelColors[risk.level] || levelColors.low;
                        const isActive = activeRiskIndex === i;
                        return (
                          <motion.div key={i} 
                            onClick={() => setActiveRiskIndex(i)}
                            className={`glass-card p-3.5 sm:p-4 border-l-[3px] transition-all duration-300 cursor-pointer 
                                ${isActive ? `${colors.border} ${colors.bg} scale-[1.01] ${colors.glow}` : 'border-obsidian-700/50 hover:border-obsidian-600 bg-obsidian-900/40'}`}
                            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                            <div className="flex items-center justify-between gap-3 mb-2">
                              <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">{risk.title}</h3>
                              <span className={`text-[9px] font-bold tracking-widest px-2 py-0.5 rounded ${colors.bg} ${colors.text} border ${colors.border}`}>
                                {colors.label}
                              </span>
                            </div>
                            <p className="text-xs text-steel-400 leading-relaxed mb-3">{risk.description}</p>
                            <div className="bg-obsidian-950/80 rounded-xl p-3 border border-obsidian-800">
                                <p className="text-[10px] uppercase font-bold tracking-widest text-steel-500 mb-1">Рекомендация:</p>
                                <p className="text-xs font-medium text-white mb-2">{risk.recommendation}</p>
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
                      disabled={generating}
                      onClick={async () => {
                        setGenerating(true);
                        setGenProgress(0);
                        let progressInterval = setInterval(() => {
                          setGenProgress((prev) => {
                            if (prev >= 90) return 90;
                            const increment = prev < 40 ? 10 : prev < 70 ? 3 : 1;
                            return Math.min(prev + increment, 90);
                          });
                        }, 300);

                        try {
                          const docDescription = `Исправленный договор на основе аудита.
ВНИМАНИЕ: Сгенерируй финальный исправленный договор, СТРОГО основываясь на следующем тексте договора с правками пользователя. Сохрани все пункты, реквизиты, условия и внесенные изменения пользователя, исправив юридические ошибки и снизив риски в соответствии с законодательством РК.

ТЕКСТ ДОГОВОРА С ПРАВКАМИ ПОЛЬЗОВАТЕЛЯ:
${contractText}`;
                          await docsApi.generate('contract', docDescription);
                          clearInterval(progressInterval);
                          setGenProgress(100);
                          setTimeout(() => {
                            showToast("Исправленный договор успешно сгенерирован! Перейдите в 'Мои документы'.", 'success');
                            setGenerating(false);
                            setGenProgress(0);
                          }, 600);
                        } catch (e) { 
                          clearInterval(progressInterval);
                          setGenerating(false);
                          setGenProgress(0);
                          showToast("Ошибка генерации исправленного документа", 'error'); 
                        }
                      }}
                      className="w-full relative overflow-hidden py-3.5 text-xs font-bold tracking-widest uppercase transition-all duration-300 shadow-[0_0_15px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2 btn-primary chrome-gradient text-obsidian-950"
                    >
                      {/* Smooth Green Progress Fill Layer */}
                      {generating && (
                        <motion.div 
                          className="absolute inset-y-0 left-0 bg-emerald-500/30 border-r border-emerald-400/50 z-0 pointer-events-none"
                          initial={{ width: '0%' }}
                          animate={{ width: `${genProgress}%` }}
                          transition={{ ease: 'easeOut', duration: 0.3 }}
                        />
                      )}
                      
                      {/* Label content with high z-index */}
                      <span className="relative z-10 flex items-center gap-2">
                        {generating ? (
                          <>
                            <motion.div 
                              animate={{ rotate: 360 }} 
                              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full"
                            />
                            <span>Генерация документа ({Math.round(genProgress)}%)...</span>
                          </>
                        ) : (
                          'Сгенерировать исправленную версию'
                        )}
                      </span>
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs text-steel-500 uppercase tracking-widest font-bold flex items-center gap-2">
                <Clock size={14} className="text-chrome-400" /> Последние проверки
              </h3>
              {history.length > 0 && (
                <button 
                  onClick={() => setConfirmClearAll(true)}
                  className="text-[10px] font-bold text-red-400/70 hover:text-red-400 hover:underline transition-all uppercase tracking-wider"
                >
                  Очистить
                </button>
              )}
            </div>
            {historyLoading ? (
              <p className="text-xs text-steel-600 animate-pulse">Загрузка...</p>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
                {history.map((item) => (
                  <div key={item.id} className="relative group flex items-center justify-between p-3 rounded-xl bg-obsidian-800/40 hover:bg-obsidian-800/80 border border-transparent hover:border-obsidian-600/50 transition-all duration-200">
                    <button onClick={() => loadFromHistory(item)}
                      className="flex-1 text-left min-w-0 mr-2">
                      <span className="text-xs text-chrome-300 truncate block mb-1">{item.filename}</span>
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold ${item.total_risks > 2 ? 'text-red-400' : 'text-amber-400'}`}>
                          {item.total_risks} рисков
                        </span>
                        <span className="text-[9px] text-steel-600">{new Date(item.created_at).toLocaleDateString('ru')}</span>
                      </div>
                    </button>
                    
                    <button 
                      onClick={(e) => { e.stopPropagation(); setDeleteTargetId(item.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 hover:border-red-500/50 transition-all duration-200 flex-shrink-0"
                      title="Удалить"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTargetId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteTargetId(null)}
              className="absolute inset-0 bg-obsidian-950/80 backdrop-blur-md"
            />
            
            {/* Modal Body */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative w-full max-w-md bg-obsidian-900 border border-obsidian-750 rounded-2xl p-6 shadow-2xl z-10 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-obsidian-950/50 pointer-events-none" />
              
              <div className="relative z-10 text-center">
                <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                  <Trash2 className="text-red-400" size={24} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Удалить проверку?</h3>
                <p className="text-xs text-steel-400 leading-relaxed mb-6">
                  Вы действительно хотите удалить этот анализ из истории? Это действие нельзя отменить.
                </p>
                
                <div className="flex gap-4">
                  <button 
                    onClick={() => setDeleteTargetId(null)}
                    className="flex-1 py-3 px-4 rounded-xl bg-obsidian-800 hover:bg-obsidian-750 border border-obsidian-700 text-steel-200 text-xs font-bold uppercase tracking-wider transition-colors duration-200"
                  >
                    Отмена
                  </button>
                  <button 
                    onClick={confirmDelete}
                    className="flex-1 py-3 px-4 rounded-xl bg-red-500/20 hover:bg-red-500/35 border border-red-500/50 text-red-400 text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Clear All Confirmation Modal */}
      <AnimatePresence>
        {confirmClearAll && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmClearAll(false)}
              className="absolute inset-0 bg-obsidian-950/80 backdrop-blur-md"
            />
            
            {/* Modal Body */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative w-full max-w-md bg-obsidian-900 border border-obsidian-750 rounded-2xl p-6 shadow-2xl z-10 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-obsidian-950/50 pointer-events-none" />
              
              <div className="relative z-10 text-center">
                <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                  <Trash2 className="text-red-400" size={24} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Очистить всю историю?</h3>
                <p className="text-xs text-steel-400 leading-relaxed mb-6">
                  Вы действительно хотите удалить все результаты проверок документов из истории? Это действие нельзя отменить.
                </p>
                
                <div className="flex gap-4">
                  <button 
                    onClick={() => setConfirmClearAll(false)}
                    className="flex-1 py-3 px-4 rounded-xl bg-obsidian-800 hover:bg-obsidian-750 border border-obsidian-700 text-steel-200 text-xs font-bold uppercase tracking-wider transition-colors duration-200"
                  >
                    Отмена
                  </button>
                  <button 
                    onClick={handleClearHistory}
                    className="flex-1 py-3 px-4 rounded-xl bg-red-500/20 hover:bg-red-500/35 border border-red-500/50 text-red-400 text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                  >
                    Очистить всё
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-50 max-w-sm pointer-events-none">
        <AnimatePresence>
          {toast && (
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
              className={`p-4 rounded-xl border shadow-2xl flex items-center gap-3.5 pointer-events-auto backdrop-blur-md
                ${toast.type === 'success' 
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]' 
                  : 'bg-red-500/10 border-red-500/40 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.15)]'
                }`}
            >
              {toast.type === 'success' ? (
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                  <ShieldAlert size={16} className="text-red-400" />
                </div>
              )}
              <div>
                <p className="text-xs font-bold text-white tracking-wide">
                  {toast.type === 'success' ? 'Успешно' : 'Внимание'}
                </p>
                <p className="text-[11px] text-steel-400 mt-0.5 leading-normal">{toast.message}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
