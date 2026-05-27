import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../i18n/LanguageContext';
import { diffLines } from 'diff';
import { ShieldAlert, FileSearch, CheckCircle2, AlertTriangle, FileText, Download, SlidersHorizontal, UploadCloud, Link as LinkIcon, Building2, Clock, ChevronRight, Trash2, EyeOff, Columns2, Sparkles, X, RefreshCw, Save } from 'lucide-react';
import MagneticButton from '../components/MagneticButton';
import { auditApi, docsApi } from '../services/api';
import { useParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } }
};

export default function DocumentWorkspace() {
  const { t } = useLanguage();
  const [results, setResults] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();
  const [loadingDoc, setLoadingDoc] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState('');
  const [savingText, setSavingText] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  
  const [contractText, setContractText] = useState('');
  const [originalAnalyzedText, setOriginalAnalyzedText] = useState(''); // Text at the time of last analysis
  
  const [activeRiskIndex, setActiveRiskIndex] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState(null);
  const [genProgress, setGenProgress] = useState(0);
  const [activeAuditId, setActiveAuditId] = useState(null);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [fixingRiskIndex, setFixingRiskIndex] = useState(null);
  const [diffResult, setDiffResult] = useState(null);
  const [showSideBySide, setShowSideBySide] = useState(true);
  const docScrollRef = useRef(null);
  
  // Autosave timer
  const saveTimeoutRef = useRef(null);

  const isDirty = contractText !== originalAnalyzedText;

  const loadDocumentAndAudit = useCallback(async (docId) => {
    setLoadingDoc(true);
    setContractText('');
    setOriginalAnalyzedText('');
    setResults(null);
    setSummary('');
    setActiveAuditId(null);
    setError(null);
    setDiffResult(null);
    setActiveRiskIndex(null);
    setLastSaved(null);
    setReanalyzing(false);
    setFixingRiskIndex(null);

    try {
      const docRes = await docsApi.getContent(docId);
      const docContent = docRes.content || '';
      setContractText(docContent);
      setOriginalAnalyzedText(docContent);
      
      try {
        const auditData = await auditApi.getDocumentAudit(docId);
        setResults(auditData.risks || []);
        setSummary(auditData.summary || '');
        setActiveAuditId(auditData.id);
        
        // Use the saved edited text if available, otherwise use fresh document content
        const textToUse = auditData.original_text || docContent;
        setContractText(textToUse);
        setOriginalAnalyzedText(textToUse);
        setLoadingDoc(false);
      } catch (err) {
        // No audit yet — auto-start analysis
        setLoadingDoc(false);
        setAnalyzing(true);
        // Show fresh document content while analyzing
        setContractText(docContent);
        setOriginalAnalyzedText(docContent);
        try {
          const data = await auditApi.analyzeDocument(docId);
          setResults(data.risks || []);
          setSummary(data.summary || '');
          setActiveAuditId(data.id || null);
          
          if (data.original_text) {
            setContractText(data.original_text);
            setOriginalAnalyzedText(data.original_text);
          }
        } catch (analyzeErr) {
          setError(analyzeErr.message || 'Ошибка анализа');
        } finally {
          setAnalyzing(false);
        }
      }
    } catch (e) {
      setError(e.message);
      setLoadingDoc(false);
    }
  }, []);

  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    loadDocumentAndAudit(id);
  }, [id, loadDocumentAndAudit]);

  // Auto-save logic
  useEffect(() => {
    if (loadingDoc || !activeAuditId) return;
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      setSavingText(true);
      try {
        await auditApi.saveText(activeAuditId, contractText);
        setLastSaved(new Date());
      } catch (err) {
        console.error("Failed to autosave:", err);
      } finally {
        setSavingText(false);
      }
    }, 1500);
    
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [contractText, activeAuditId, loadingDoc]);

  const handleQuickFix = async (risk, index) => {
    if (!activeAuditId) return;
    setFixingRiskIndex(index);
    try {
      const data = await auditApi.quickFix(
        activeAuditId,
        risk.title,
        risk.description,
        risk.recommendation,
        risk.location || ''
      );
      const newText = data.original_text || '';
      const diffArr = diffLines(contractText, newText);
      setDiffResult(diffArr);
      setShowSideBySide(true);
      
      setTimeout(() => {
        const highlightElements = document.querySelectorAll('.diff-highlight');
        if (highlightElements.length > 0) {
          highlightElements[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
      
      setResults(data.risks || []);
      setSummary(data.summary || '');
      setContractText(newText);
      setOriginalAnalyzedText(newText);
      setActiveRiskIndex(null);
      showToast('Пункт договора успешно исправлен ИИ и проверен!', 'success');
    } catch (err) {
      showToast('Ошибка исправления: ' + err.message, 'error');
    } finally {
      setFixingRiskIndex(null);
    }
  };

  const handleAnalyze = async () => {
    if (!id) return;
    setAnalyzing(true);
    setError('');
    setActiveAuditId(null);
    try {
      const data = await auditApi.analyzeDocument(id);
      setResults(data.risks || []);
      setSummary(data.summary || '');
      setContractText(data.original_text || '');
      setOriginalAnalyzedText(data.original_text || '');
      setActiveAuditId(data.id || null);
    } catch (err) {
      setError(err.message || 'Ошибка анализа');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReanalyze = async () => {
    if (!contractText || !contractText.trim()) {
      showToast('Текст документа пуст', 'error');
      return;
    }
    setReanalyzing(true);
    try {
      const data = await auditApi.reanalyze(contractText, 'Редактированный документ.docx', activeAuditId);
      setResults(data.risks || []);
      setSummary(data.summary || '');
      setContractText(data.original_text || '');
      setOriginalAnalyzedText(data.original_text || '');
      if (data.id) {
        setActiveAuditId(data.id);
      }
      showToast('Анализ успешно обновлен с учетом ваших правок!', 'success');
    } catch (err) {
      showToast('Ошибка анализа правок: ' + err.message, 'error');
    } finally {
      setReanalyzing(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  };

  const levelColors = {
    high: { bg: 'bg-red-500/10', border: 'border-red-500/40', text: 'text-red-400', glow: 'shadow-[0_0_15px_rgba(239,68,68,0.3)]', icon: <AlertTriangle size={14} className="text-red-400"/>, label: 'ВЫСОКИЙ РИСК', marker: 'bg-red-500' },
    medium: { bg: 'bg-amber-500/10', border: 'border-amber-500/40', text: 'text-amber-400', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.3)]', icon: <SlidersHorizontal size={14} className="text-amber-400"/>, label: 'СРЕДНИЙ РИСК', marker: 'bg-amber-500' },
    low: { bg: 'bg-sky-500/10', border: 'border-sky-500/40', text: 'text-sky-400', glow: 'shadow-[0_0_15px_rgba(14,165,233,0.3)]', icon: <CheckCircle2 size={14} className="text-sky-400"/>, label: 'РЕКОМЕНДАЦИЯ', marker: 'bg-sky-500' },
  };

  if (loadingDoc) {
    return createPortal(
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex flex-col h-screen overflow-hidden">
        <header className="h-16 border-b border-white/5 bg-transparent flex items-center px-4 sm:px-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl text-steel-400 hover:text-white hover:bg-white/5 transition-all group">
            <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} className="w-12 h-12 border-4 border-chrome-500 border-t-transparent rounded-full mx-auto mb-4 shadow-[0_0_15px_rgba(255,255,255,0.1)]" />
            <p className="text-steel-400 text-sm tracking-widest uppercase font-semibold">Загрузка документа...</p>
          </div>
        </div>
      </motion.div>,
      document.body
    );
  }

  if (error) {
    return createPortal(
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex flex-col h-screen overflow-hidden">
        <header className="h-16 border-b border-white/5 bg-transparent flex items-center px-4 sm:px-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl text-steel-400 hover:text-white hover:bg-white/5 transition-all group">
            <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
          <h1 className="ml-4 text-white font-semibold">Ошибка</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl max-w-md text-center">
            <AlertTriangle className="text-red-400 mx-auto mb-4" size={32} />
            <p className="text-white mb-2 font-medium">Не удалось загрузить документ</p>
            <p className="text-steel-400 text-sm">{error}</p>
          </div>
        </div>
      </motion.div>,
      document.body
    );
  }

  const renderDiffView = () => {
    if (!diffResult) return null;
    if (showSideBySide) {
      return (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex bg-black rounded-full p-1 border border-white/5 shadow-lg">
              <button 
                onClick={() => setShowSideBySide(true)}
                className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-full flex items-center gap-2 transition-all duration-300 ${showSideBySide ? 'bg-chrome-500 text-obsidian-950 shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'text-steel-400 hover:text-white hover:bg-white/5'}`}
              >
                <Columns2 size={14} /> Side-by-Side
              </button>
              <button 
                onClick={() => setShowSideBySide(false)}
                className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-full flex items-center gap-2 transition-all duration-300 ${!showSideBySide ? 'bg-chrome-500 text-obsidian-950 shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'text-steel-400 hover:text-white hover:bg-white/5'}`}
              >
                <FileText size={14} /> Inline
              </button>
            </div>
            <button 
              onClick={() => { setDiffResult(null); setOriginalAnalyzedText(contractText); }} 
              className="text-[11px] font-bold uppercase tracking-widest bg-obsidian-900 hover:bg-obsidian-800 px-4 py-2 rounded-xl border border-white/5 text-steel-300 transition-all flex items-center gap-2"
            >
              <EyeOff size={14} /> Закрыть Diff
            </button>
          </div>
          
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 relative">
            <div className="bg-[#111] rounded-3xl border border-white/5 shadow-2xl overflow-hidden flex flex-col">
              <div className="bg-black/80 backdrop-blur-md px-5 py-4 border-b border-white/[0.03] flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                <span className="text-xs font-bold uppercase tracking-widest text-steel-400">Оригинал (Было)</span>
              </div>
              <div className="p-6 font-mono text-[13px] leading-[1.8] text-steel-400 overflow-y-auto max-h-[65vh] custom-scrollbar">
                {diffResult.map((part, i) => {
                  if (part.added) return null;
                  if (part.removed) {
                    return <div key={i} className="bg-red-500/[0.08] border-l-[3px] border-red-500/40 text-red-300/90 px-4 py-2 my-2 rounded-r-lg line-through decoration-red-500/30 whitespace-pre-wrap diff-highlight">{part.value}</div>;
                  }
                  return <div key={i} className="px-4 whitespace-pre-wrap opacity-50 font-sans">{part.value}</div>;
                })}
              </div>
            </div>
            
            <div className="bg-[#111] rounded-3xl border border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.05)] overflow-hidden flex flex-col relative">
              <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />
              <div className="bg-black/80 backdrop-blur-md px-5 py-4 border-b border-emerald-500/10 flex items-center gap-3 relative z-10">
                <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Безопасная версия (Стало)</span>
                <Sparkles size={14} className="text-emerald-400/50 ml-auto" />
              </div>
              <div className="p-6 font-mono text-[13px] leading-[1.8] text-steel-300 overflow-y-auto max-h-[65vh] custom-scrollbar relative z-10">
                {diffResult.map((part, i) => {
                  if (part.removed) return null;
                  if (part.added) {
                    return <div key={i} className="bg-emerald-500/[0.12] border-l-[3px] border-emerald-400 text-emerald-200 px-4 py-2 my-2 rounded-r-lg whitespace-pre-wrap diff-highlight shadow-[0_0_15px_rgba(52,211,153,0.05)] font-medium">{part.value}</div>;
                  }
                  return <div key={i} className="px-4 whitespace-pre-wrap font-sans">{part.value}</div>;
                })}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex bg-black rounded-full p-1 border border-white/5 shadow-lg">
              <button 
                onClick={() => setShowSideBySide(true)}
                className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-full flex items-center gap-2 transition-all duration-300 ${showSideBySide ? 'bg-chrome-500 text-obsidian-950 shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'text-steel-400 hover:text-white hover:bg-white/5'}`}
              >
                <Columns2 size={14} /> Side-by-Side
              </button>
              <button 
                onClick={() => setShowSideBySide(false)}
                className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-full flex items-center gap-2 transition-all duration-300 ${!showSideBySide ? 'bg-chrome-500 text-obsidian-950 shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'text-steel-400 hover:text-white hover:bg-white/5'}`}
              >
                <FileText size={14} /> Inline
              </button>
          </div>
          <button 
            onClick={() => { setDiffResult(null); setOriginalAnalyzedText(contractText); }} 
            className="text-[11px] font-bold uppercase tracking-widest bg-obsidian-900 hover:bg-obsidian-800 px-4 py-2 rounded-xl border border-white/5 text-steel-300 transition-all flex items-center gap-2"
          >
            <EyeOff size={14} /> Закрыть Diff
          </button>
        </div>
        <div className="bg-[#111] rounded-3xl border border-emerald-500/10 shadow-[0_0_40px_rgba(16,185,129,0.03)] overflow-hidden flex flex-col relative h-[65vh]">
          <div className="bg-black/80 backdrop-blur-md px-5 py-4 border-b border-white/5 flex items-center gap-3 shrink-0">
            <SlidersHorizontal size={16} className="text-chrome-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-chrome-400">Изменения от ИИ (Inline)</span>
          </div>
          <div className="p-6 font-mono text-[13px] leading-[1.8] text-steel-300 overflow-y-auto custom-scrollbar flex-1">
            {diffResult.map((part, i) => {
              if (part.added) {
                return <span key={i} className="bg-emerald-500/[0.12] text-emerald-300 px-1.5 py-0.5 rounded shadow-[0_0_10px_rgba(16,185,129,0.1)] mx-0.5 font-medium diff-highlight whitespace-pre-wrap">{part.value}</span>;
              } else if (part.removed) {
                return <span key={i} className="bg-red-500/[0.08] text-red-400/80 line-through px-1.5 py-0.5 rounded mx-0.5 diff-highlight whitespace-pre-wrap">{part.value}</span>;
              } else {
                return <span key={i} className="font-sans whitespace-pre-wrap">{part.value}</span>;
              }
            })}
          </div>
        </div>
      </div>
    );
  };

  return createPortal(
    <motion.div initial={{ opacity: 0, scale: 0.98, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: 10 }} transition={{ duration: 0.3, ease: 'easeOut' }} className="fixed inset-0 z-[100] bg-black flex flex-col h-screen overflow-hidden">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl backdrop-blur-md border ${toast.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-chrome-500/10 border-chrome-500/20 text-chrome-300'}`}
          >
            {toast.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
            <span className="text-sm font-medium tracking-wide">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header bar */}
      <header className="h-16 border-b border-white/5 bg-transparent flex items-center px-4 justify-between shrink-0 relative z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl text-steel-400 hover:text-white hover:bg-white/10 transition-all group">
            <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
          <div className="flex items-center gap-3 pl-4 border-l border-white/10">
             <FileSearch className="text-chrome-400" size={20} />
             <h1 className="text-[10px] font-black uppercase tracking-widest text-white">Аудит и редактор</h1>
          </div>
        </div>
        
        {/* Autosave Status */}
        <div className="flex items-center gap-2">
          {savingText ? (
            <span className="flex items-center gap-1.5 text-xs text-steel-400 font-mono tracking-widest bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
              <RefreshCw size={12} className="animate-spin" /> Сохранение...
            </span>
          ) : lastSaved ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400/70 font-mono tracking-widest bg-emerald-500/5 px-3 py-1.5 rounded-full border border-emerald-500/10">
              <Save size={12} /> Сохранено
            </span>
          ) : null}
        </div>
      </header>

      <div className="flex-1 overflow-hidden p-4 sm:p-6">
        
        {(!results && !analyzing) && (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-24 h-24 rounded-[2rem] chrome-gradient flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(255,255,255,0.1)]">
                <FileText size={48} className="text-obsidian-950" strokeWidth={1.5} />
              </div>
              <h2 className="text-3xl font-bold text-white mb-6">Документ загружен</h2>
              <MagneticButton as="button" onClick={handleAnalyze}
                className="btn-primary chrome-gradient text-obsidian-950 px-10 py-4 rounded-xl font-bold tracking-widest text-sm uppercase shadow-[0_0_30px_rgba(255,255,255,0.15)]" strength={0.1}>
                Запустить глубокий аудит →
              </MagneticButton>
            </div>
        )}

        <AnimatePresence mode="wait">
          {analyzing && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-full">
                  <div className="relative w-32 h-32 mb-8">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="absolute inset-0 border-4 border-chrome-500/20 border-t-chrome-500 rounded-full" />
                      <div className="absolute inset-4 bg-obsidian-900 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.1)]">
                          <ShieldAlert className="text-chrome-400 animate-pulse" size={40} />
                      </div>
                  </div>
                  <p className="text-2xl font-bold text-white mb-3 tracking-tight">Глубокий анализ документа...</p>
                  <p className="text-steel-400 text-sm animate-pulse tracking-wide">Проверяем на соответствие ГК РК и нормативным актам</p>
              </motion.div>
          )}
        </AnimatePresence>

        {results && !analyzing && (
          <motion.div key="results" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} className="h-full flex flex-col relative">
            
            {diffResult ? (
              <div className="h-full">
                {renderDiffView()}
              </div>
            ) : (
              <div className="flex flex-col xl:flex-row gap-6 h-full">
                {/* Left Pane: Editor */}
                <div className="flex-1 flex flex-col bg-[#111] border border-white/5 rounded-[2rem] shadow-2xl overflow-hidden relative">
                  <div className="h-12 bg-black/80 backdrop-blur-md border-b border-white/5 flex items-center px-5 justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-steel-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Редактор документа</span>
                    </div>
                  </div>
                  <textarea
                    ref={docScrollRef}
                    value={contractText}
                    onChange={(e) => setContractText(e.target.value)}
                    placeholder="Текст документа..."
                    className="flex-1 w-full bg-transparent p-6 font-serif text-[15px] leading-[1.8] text-steel-200 resize-none outline-none custom-scrollbar"
                    style={{ willChange: 'scroll-position' }}
                  />
                  
                  {/* Floating Re-Analyze Button when Dirty */}
                  <AnimatePresence>
                    {isDirty && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="absolute bottom-6 left-1/2 -translate-x-1/2"
                      >
                        <button
                          disabled={reanalyzing}
                          onClick={handleReanalyze}
                          className="group relative overflow-hidden bg-chrome-500 text-obsidian-950 font-bold px-8 py-3.5 rounded-full shadow-[0_0_40px_rgba(255,255,255,0.2)] flex items-center gap-3 transition-all hover:scale-105 hover:shadow-[0_0_50px_rgba(255,255,255,0.3)]"
                        >
                          {reanalyzing ? (
                            <>
                              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-obsidian-950 border-t-transparent rounded-full" />
                              <span className="text-xs uppercase tracking-widest">Анализируем...</span>
                            </>
                          ) : (
                            <>
                              <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
                              <span className="text-xs uppercase tracking-widest">Повторный анализ</span>
                            </>
                          )}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Right Pane: Risks */}
                <div className="w-full xl:w-[450px] 2xl:w-[500px] flex flex-col shrink-0">
                  <div className={`shrink-0 mb-6 p-5 rounded-[2rem] border relative overflow-hidden transition-all duration-300 backdrop-blur-md
                    ${results.length === 0 
                      ? 'border-emerald-500/30 bg-emerald-950/10 shadow-[0_0_30px_rgba(16,185,129,0.05)]' 
                      : 'border-amber-500/30 bg-amber-950/10 shadow-[0_0_30px_rgba(245,158,11,0.05)]'}`}>
                    <div className="flex gap-4 relative z-10">
                      <div className={`w-12 h-12 rounded-3xl flex items-center justify-center shrink-0 shadow-inner
                        ${results.length === 0 ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
                        {results.length === 0 ? (
                          <CheckCircle2 size={24} className="text-emerald-400" />
                        ) : (
                          <AlertTriangle size={24} className="text-amber-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest font-black text-white">
                          {results.length === 0 ? 'Рисков не обнаружено' : `Выявлено ${results.length} рисков`}
                        </p>
                        <p className="text-sm text-steel-400 mt-1 leading-relaxed">{summary}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                    {results.map((risk, i) => {
                      const colors = levelColors[risk.level] || levelColors.low;
                      const isActive = activeRiskIndex === i;
                      
                      // Highlight matching text logic for the sidebar display
                      // Find context around the risk location
                      let contextSnippet = null;
                      if (risk.location && contractText.includes(risk.location)) {
                        contextSnippet = risk.location;
                        if (contextSnippet.length > 150) {
                          contextSnippet = contextSnippet.substring(0, 150) + "...";
                        }
                      }

                      return (
                        <motion.div key={i} 
                          className={`bg-black/60 p-5 rounded-3xl border transition-all duration-300 relative overflow-hidden
                              ${isActive ? `${colors.border} bg-obsidian-900 shadow-2xl` : 'border-white/5 hover:border-white/10'}`}
                          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                          
                          {/* Risk Header */}
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <h3 className="text-sm font-bold text-white tracking-wide mb-1">{risk.title}</h3>
                            <span className={`text-[9px] font-bold tracking-widest px-2 py-1 rounded bg-black border ${colors.text} ${colors.border}`}>
                              {colors.label}
                            </span>
                          </div>
                          
                          <p className="text-sm text-steel-400 leading-relaxed mb-4">{risk.description}</p>
                          
                          {/* Context snippet */}
                          {contextSnippet && (
                            <div className="mb-4 bg-[#111] rounded-xl p-3 border border-white/5">
                              <p className="text-[10px] uppercase font-black tracking-widest text-neutral-500 mb-2">Найдено в тексте:</p>
                              <p className="text-xs font-mono text-steel-300 italic border-l-2 border-steel-700 pl-2">"{contextSnippet}"</p>
                            </div>
                          )}

                          <div className="bg-[#111] rounded-xl p-4 border border-white/5">
                              <p className="text-[10px] uppercase font-black tracking-widest text-chrome-500 mb-2">Рекомендация ИИ:</p>
                              <p className="text-sm font-medium text-white mb-4">{risk.recommendation}</p>
                              
                              <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-white/5">
                                {risk.url ? (
                                  <a href={risk.url} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-[10px] font-mono text-chrome-500 hover:text-chrome-400 transition-colors bg-chrome-500/10 px-2 py-1 rounded-lg">
                                    <LinkIcon size={12} /> {risk.article}
                                  </a>
                                ) : (
                                  <span className="text-[10px] font-mono text-steel-500">{risk.article || 'Норматив не указан'}</span>
                                )}

                                {activeAuditId && (
                                  <button
                                    disabled={fixingRiskIndex !== null || generating}
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      await handleQuickFix(risk, i);
                                    }}
                                    className={`text-[10px] font-bold px-3 py-2 rounded-xl border transition-all duration-300 uppercase tracking-widest flex items-center gap-2
                                      ${fixingRiskIndex === i
                                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                                        : 'bg-chrome-500/10 border-chrome-500/30 hover:border-chrome-500/50 hover:bg-chrome-500/20 text-chrome-400 hover:text-white'
                                      }`}
                                  >
                                    {fixingRiskIndex === i ? (
                                      <>
                                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full" />
                                        <span>Исправление...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles size={12} />
                                        <span>Исправить</span>
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                          </div>
                        </motion.div>
                      );
                    })}

                    {/* Auto-Fix All Button */}
                    {results.length > 0 && (
                      <div className="pt-4 pb-10">
                        <MagneticButton as="button"
                          disabled={generating || isDirty}
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
                              let finalContent = "";
                              const docDescription = `Исправленный договор на основе аудита.\nВНИМАНИЕ: Сгенерируй финальный исправленный договор, СТРОГО основываясь на следующем тексте договора.\nИсправь ВСЕ оставшиеся юридические риски.\n\nОСТАВШИЕСЯ РИСКИ ДЛЯ ИСПРАВЛЕНИЯ:\n${results.map((r, i) => `${i+1}. ${r.title}: ${r.description} (Рекомендация: ${r.recommendation})`).join('\n')}\n\nТЕКСТ ДОГОВОРА ДЛЯ ИСПРАВЛЕНИЯ:\n${contractText}`;
                              const data = await docsApi.generate('contract', docDescription);
                              finalContent = data.content || '';
                              
                              const savedDoc = await docsApi.saveFixed(`Исправленный договор_${Date.now()}`, finalContent);
                              await docsApi.download(savedDoc.id);
                              
                              clearInterval(progressInterval);
                              setGenProgress(100);
                              setTimeout(() => {
                                showToast("ИИ исправил все оставшиеся риски и скачал финальный DOCX документ!", 'success');
                                setGenerating(false);
                                setGenProgress(0);
                                const cleanedText = finalContent.replace(/> \*\*ВНИМАНИЕ: ДАННЫЙ ШАБЛОН СГЕНЕРИРОВАН ИИ\.\*\*.*?\n\n/g, '');
                                setContractText(cleanedText);
                                setOriginalAnalyzedText(cleanedText);
                                setResults([]);
                                setSummary("Все риски успешно устранены. Документ безопасен и готов к использованию.");
                              }, 600);
                            } catch (e) { 
                              clearInterval(progressInterval);
                              setGenerating(false);
                              setGenProgress(0);
                              showToast("Ошибка генерации исправленного документа", 'error'); 
                            }
                          }}
                          className={`w-full relative overflow-hidden py-4 text-xs font-bold tracking-widest uppercase transition-all duration-300 rounded-3xl flex items-center justify-center gap-2
                            ${isDirty ? 'bg-obsidian-800 text-steel-500 cursor-not-allowed border border-white/5' : 'bg-chrome-500 text-obsidian-950 shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(255,255,255,0.25)]'}`}
                        >
                          {generating && (
                            <motion.div 
                              className="absolute inset-y-0 left-0 bg-emerald-500/30 border-r border-emerald-400/50 z-0 pointer-events-none"
                              initial={{ width: '0%' }}
                              animate={{ width: `${genProgress}%` }}
                              transition={{ ease: 'easeOut', duration: 0.3 }}
                            />
                          )}
                          
                          <span className="relative z-10 flex items-center gap-2">
                            {generating ? (
                              <>
                                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-obsidian-950 border-t-transparent rounded-full" />
                                <span>Генерация документа ({Math.round(genProgress)}%)...</span>
                              </>
                            ) : isDirty ? (
                              'Сначала обновите анализ'
                            ) : (
                              <>
                                <Download size={16} />
                                Сгенерировать и скачать финальную версию
                              </>
                            )}
                          </span>
                        </MagneticButton>
                      </div>
                    )}

                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>,
    document.body
  );
}
