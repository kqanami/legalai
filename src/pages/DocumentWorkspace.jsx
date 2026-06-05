import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { diffLines } from 'diff';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Columns2,
  Download,
  EyeOff,
  FileCheck2,
  FileSearch,
  FileText,
  Link as LinkIcon,
  ListTree,
  Loader2,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Target,
  X,
} from 'lucide-react';
import { auditApi, docsApi } from '../services/api';

const riskMeta = {
  high: {
    label: 'Высокий риск',
    short: 'Высокие',
    border: 'border-red-500/35',
    bg: 'bg-red-500/10',
    text: 'text-red-300',
    dot: 'bg-red-400',
    icon: AlertTriangle,
  },
  medium: {
    label: 'Средний риск',
    short: 'Средние',
    border: 'border-amber-500/35',
    bg: 'bg-amber-500/10',
    text: 'text-amber-300',
    dot: 'bg-amber-400',
    icon: SlidersHorizontal,
  },
  low: {
    label: 'Рекомендация',
    short: 'Рекомендации',
    border: 'border-sky-500/35',
    bg: 'bg-sky-500/10',
    text: 'text-sky-300',
    dot: 'bg-sky-400',
    icon: CheckCircle2,
  },
};

const riskFilters = [
  { value: 'all', label: 'Все' },
  { value: 'high', label: 'Высокие' },
  { value: 'medium', label: 'Средние' },
  { value: 'low', label: 'Рекомендации' },
];

const normalizeRiskLevel = (level) => {
  const normalized = String(level || '').toLowerCase();
  if (normalized.includes('high') || normalized.includes('выс')) return 'high';
  if (normalized.includes('medium') || normalized.includes('сред')) return 'medium';
  if (normalized.includes('low') || normalized.includes('низ') || normalized.includes('рекомен')) return 'low';
  return 'low';
};

const formatSavedTime = (date) =>
  date ? date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';

const cleanGeneratedContract = (content) =>
  (content || '').replace(/> \*\*ВНИМАНИЕ: ДАННЫЙ ШАБЛОН СГЕНЕРИРОВАН ИИ\.\*\*.*?\n\n/gs, '').trim();

const getLineScrollTop = (text, start, textarea) => {
  const lineCountBefore = text.slice(0, start).split('\n').length;
  const totalLines = Math.max(1, text.split('\n').length);
  const maxScroll = Math.max(0, textarea.scrollHeight - textarea.clientHeight);
  return Math.max(0, (lineCountBefore / totalLines) * maxScroll - 120);
};

const getSearchMatches = (text, query) => {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];

  const haystack = text.toLowerCase();
  const matches = [];
  let start = 0;

  while (matches.length < 500) {
    const index = haystack.indexOf(needle, start);
    if (index === -1) break;
    matches.push({ start: index, end: index + needle.length });
    start = index + Math.max(needle.length, 1);
  }

  return matches;
};

const getDocumentSections = (text) => {
  const lines = text.split('\n');
  const sections = [];
  let cursor = 0;

  lines.forEach((line) => {
    const trimmed = line.trim();
    const isSection =
      /^(раздел|глава|статья)\s*\d+/i.test(trimmed) ||
      /^\d+(\.\d+)*[.)]?\s*\S+/.test(trimmed) ||
      /^[IVX]+\.\s*\S+/.test(trimmed);

    if (isSection && trimmed.length <= 160) {
      sections.push({
        title: trimmed,
        start: cursor + line.indexOf(trimmed),
      });
    }

    cursor += line.length + 1;
  });

  return sections.slice(0, 80);
};

const getFirstChangedRange = (before, after) => {
  const parts = diffLines(before, after);
  let cursor = 0;

  for (const part of parts) {
    if (part.added) {
      return { start: cursor, end: Math.max(cursor + part.value.length, cursor + 1) };
    }
    if (!part.removed) {
      cursor += part.value.length;
    }
  }

  const limit = Math.min(before.length, after.length);
  let start = 0;
  while (start < limit && before[start] === after[start]) start += 1;
  return { start, end: Math.min(after.length, start + 300) };
};

export default function DocumentWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const docScrollRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const lastSavedTextRef = useRef('');
  
  const diffOriginalRef = useRef(null);
  const diffModifiedRef = useRef(null);
  const isScrollingRef = useRef(false);

  const [results, setResults] = useState(null);
  const [summary, setSummary] = useState('');
  const [auditDocType, setAuditDocType] = useState('');
  const [contractText, setContractText] = useState('');
  const [originalAnalyzedText, setOriginalAnalyzedText] = useState('');
  const [baselineText, setBaselineText] = useState('');
  const [activeAuditId, setActiveAuditId] = useState(null);

  const [loadingDoc, setLoadingDoc] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [savingText, setSavingText] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [error, setError] = useState('');

  const [activeRiskIndex, setActiveRiskIndex] = useState(null);
  const [fixingRiskIndex, setFixingRiskIndex] = useState(null);
  const [riskFilter, setRiskFilter] = useState('all');
  const [riskSearch, setRiskSearch] = useState('');
  const [diffResult, setDiffResult] = useState(null);
  const [showSideBySide, setShowSideBySide] = useState(true);
  const [contractSearch, setContractSearch] = useState('');
  const [searchMatchIndex, setSearchMatchIndex] = useState(0);
  const [lastFixRange, setLastFixRange] = useState(null);
  const [toast, setToast] = useState(null);
  const [showSections, setShowSections] = useState(false);

  const riskList = Array.isArray(results) ? results : [];
  const isDirty = contractText !== originalAnalyzedText;
  const hasChanges = baselineText !== contractText;

  const textStats = useMemo(() => {
    const words = contractText.trim() ? contractText.trim().split(/\s+/).length : 0;
    return {
      words,
      chars: contractText.length,
      pages: Math.max(1, Math.ceil(words / 450)),
    };
  }, [contractText]);

  const riskStats = useMemo(
    () =>
      riskList.reduce(
        (acc, risk) => {
          const level = normalizeRiskLevel(risk.level);
          acc[level] += 1;
          acc.total += 1;
          return acc;
        },
        { total: 0, high: 0, medium: 0, low: 0 },
      ),
    [riskList],
  );

  const filteredRisks = useMemo(() => {
    const query = riskSearch.trim().toLowerCase();
    return riskList
      .map((risk, index) => ({ risk, index }))
      .filter(({ risk }) => riskFilter === 'all' || normalizeRiskLevel(risk.level) === riskFilter)
      .filter(({ risk }) => {
        if (!query) return true;
        return [risk.title, risk.description, risk.recommendation, risk.article, risk.location]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(query));
      });
  }, [riskFilter, riskList, riskSearch]);

  const searchMatches = useMemo(
    () => getSearchMatches(contractText, contractSearch),
    [contractText, contractSearch],
  );

  const documentSections = useMemo(
    () => getDocumentSections(contractText),
    [contractText],
  );

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 4000);
  }, []);

  const applyAuditResponse = useCallback((data, fallbackText = '', options = {}) => {
    const nextText = data.original_text || fallbackText || '';
    setResults(data.risks || []);
    setSummary(data.summary || '');
    setAuditDocType(data.doc_type || '');
    setActiveAuditId(data.id || null);
    setContractText(nextText);
    setOriginalAnalyzedText(nextText);
    if (options.resetBaseline) {
      setBaselineText(nextText);
    }
    lastSavedTextRef.current = nextText;
  }, []);

  const loadDocumentAndAudit = useCallback(
    async (docId) => {
      setLoadingDoc(true);
      setError('');
      setResults(null);
      setSummary('');
      setAuditDocType('');
      setActiveAuditId(null);
      setActiveRiskIndex(null);
      setDiffResult(null);
      setLastSaved(null);
      setContractText('');
      setOriginalAnalyzedText('');
      setBaselineText('');
      setContractSearch('');
      setLastFixRange(null);
      lastSavedTextRef.current = '';

      try {
        const docRes = await docsApi.getContent(docId);
        const docContent = docRes.content || '';
        setContractText(docContent);
        setOriginalAnalyzedText(docContent);
        setBaselineText(docContent);
        lastSavedTextRef.current = docContent;

        try {
          const auditData = await auditApi.getDocumentAudit(docId);
          applyAuditResponse(auditData, docContent, { resetBaseline: true });
          setLoadingDoc(false);
        } catch {
          setLoadingDoc(false);
          setAnalyzing(true);
          try {
            const data = await auditApi.analyzeDocument(docId);
            applyAuditResponse(data, docContent, { resetBaseline: true });
          } catch (analyzeErr) {
            setError(analyzeErr.message || 'Ошибка анализа');
          } finally {
            setAnalyzing(false);
          }
        }
      } catch (e) {
        setError(e.message || 'Не удалось открыть документ');
        setLoadingDoc(false);
      }
    },
    [applyAuditResponse],
  );

  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    loadDocumentAndAudit(id);
  }, [id, loadDocumentAndAudit]);

  useEffect(() => {
    setSearchMatchIndex(0);
  }, [contractSearch]);

  useEffect(() => {
    if (searchMatchIndex >= searchMatches.length) {
      setSearchMatchIndex(0);
    }
  }, [searchMatchIndex, searchMatches.length]);

  useEffect(() => {
    if (loadingDoc || !activeAuditId || contractText === lastSavedTextRef.current) return undefined;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    const textToSave = contractText;
    saveTimeoutRef.current = setTimeout(async () => {
      setSavingText(true);
      try {
        await auditApi.saveText(activeAuditId, textToSave);
        lastSavedTextRef.current = textToSave;
        setLastSaved(new Date());
      } catch (err) {
        console.error('Failed to autosave:', err);
      } finally {
        setSavingText(false);
      }
    }, 1200);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [activeAuditId, contractText, loadingDoc]);

  const handleAnalyze = async () => {
    if (!id) return;
    setAnalyzing(true);
    setError('');
    try {
      const data = await auditApi.analyzeDocument(id);
      applyAuditResponse(data, '', { resetBaseline: true });
      setLastFixRange(null);
      setDiffResult(null);
      showToast('Аудит документа завершён');
    } catch (err) {
      setError(err.message || 'Ошибка анализа');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReanalyze = async () => {
    if (!contractText.trim()) {
      showToast('Текст документа пуст', 'error');
      return;
    }

    setReanalyzing(true);
    try {
      const data = await auditApi.reanalyze(contractText, 'Редактированный документ.docx', activeAuditId);
      applyAuditResponse(data, contractText);
      setDiffResult(null);
      showToast('Анализ обновлён с учётом ваших правок');
    } catch (err) {
      showToast(`Ошибка повторного анализа: ${err.message}`, 'error');
    } finally {
      setReanalyzing(false);
    }
  };

  const focusTextRange = (start, end, options = {}) => {
    const textarea = docScrollRef.current;
    if (!textarea) return;

    const textForScroll = options.text || contractText;
    const safeStart = Math.max(0, Math.min(start, textForScroll.length));
    const safeEnd = Math.max(safeStart, Math.min(end, textForScroll.length));

    textarea.focus();
    textarea.setSelectionRange(safeStart, safeEnd);
    textarea.scrollTop = getLineScrollTop(textForScroll, safeStart, textarea);

    if (options.highlight) {
      setLastFixRange({ start: safeStart, end: safeEnd });
      window.setTimeout(() => setLastFixRange(null), 6000);
    }
  };

  const goToSearchMatch = (direction = 0) => {
    if (!searchMatches.length) {
      if (contractSearch.trim()) showToast('Совпадений в договоре не найдено', 'error');
      return;
    }

    const nextIndex = (searchMatchIndex + direction + searchMatches.length) % searchMatches.length;
    setSearchMatchIndex(nextIndex);
    const match = searchMatches[nextIndex];
    focusTextRange(match.start, match.end);
  };

  const goToSection = (sectionIndex) => {
    const section = documentSections[sectionIndex];
    if (!section) return;
    focusTextRange(section.start, Math.min(contractText.length, section.start + section.title.length));
  };

  const handleCompareWithOriginal = () => {
    if (!hasChanges) return;
    setDiffResult(diffLines(baselineText, contractText));
    setShowSideBySide(true);
  };

  const handleDiffScroll = (source) => {
    if (isScrollingRef.current !== false && isScrollingRef.current !== source) return;
    
    const original = diffOriginalRef.current;
    const modified = diffModifiedRef.current;
    if (!original || !modified) return;
    
    isScrollingRef.current = source;
    
    if (source === 'original') {
      const percentage = original.scrollTop / Math.max(1, original.scrollHeight - original.clientHeight);
      modified.scrollTop = percentage * Math.max(1, modified.scrollHeight - modified.clientHeight);
    } else {
      const percentage = modified.scrollTop / Math.max(1, modified.scrollHeight - modified.clientHeight);
      original.scrollTop = percentage * Math.max(1, original.scrollHeight - original.clientHeight);
    }
    
    clearTimeout(window.scrollTimeout);
    window.scrollTimeout = setTimeout(() => {
      isScrollingRef.current = false;
    }, 50);
  };

  const handleQuickFix = async (risk, index) => {
    if (!activeAuditId) return;
    const oldText = contractText;
    setFixingRiskIndex(index);
    try {
      const data = await auditApi.quickFix(
        activeAuditId,
        risk.title,
        risk.description,
        risk.recommendation,
        risk.location || '',
      );
      const newText = data.original_text || oldText;
      const changedRange = getFirstChangedRange(oldText, newText);
      setDiffResult(null);
      setResults(data.risks || []);
      setSummary(data.summary || '');
      setAuditDocType(data.doc_type || auditDocType);
      setContractText(newText);
      setOriginalAnalyzedText(newText);
      lastSavedTextRef.current = newText;
      setLastSaved(new Date());
      setActiveRiskIndex(null);
      showToast('Пункт исправлен прямо в тексте договора');

      window.setTimeout(() => {
        focusTextRange(changedRange.start, changedRange.end, { highlight: true, text: newText });
      }, 80);
    } catch (err) {
      showToast(`Ошибка исправления: ${err.message}`, 'error');
    } finally {
      setFixingRiskIndex(null);
    }
  };

  const handleFocusRisk = (risk, index) => {
    setActiveRiskIndex(index);
    const location = String(risk.location || '').trim();
    if (!location) {
      showToast('У этого риска нет точной привязки к фрагменту', 'error');
      return;
    }

    const firstPass = contractText.indexOf(location);
    const fallbackNeedle = location.slice(0, 80).trim();
    const start = firstPass >= 0 ? firstPass : contractText.indexOf(fallbackNeedle);

    if (start < 0 || !docScrollRef.current) {
      showToast('Фрагмент не найден в текущей версии текста', 'error');
      return;
    }

    const end = start + (firstPass >= 0 ? location.length : fallbackNeedle.length);
    focusTextRange(start, end);
  };

  const handleCopyRecommendation = async (risk) => {
    try {
      await navigator.clipboard.writeText(risk.recommendation || risk.description || '');
      showToast('Рекомендация скопирована');
    } catch {
      showToast('Не удалось скопировать рекомендацию', 'error');
    }
  };

  const handleDownloadReport = async () => {
    if (!activeAuditId) return;
    try {
      const blob = await auditApi.downloadReport(activeAuditId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_report_${activeAuditId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast(`Не удалось скачать отчёт: ${err.message}`, 'error');
    }
  };

  const handleGenerateFinal = async () => {
    if (!riskList.length) return;
    setGenerating(true);
    setGenProgress(0);

    const timer = window.setInterval(() => {
      setGenProgress((prev) => {
        if (prev >= 90) return 90;
        if (prev < 40) return prev + 10;
        if (prev < 70) return prev + 4;
        return prev + 1;
      });
    }, 300);

    try {
      const docDescription = [
        'Исправленный договор на основе юридического аудита.',
        'Сгенерируй финальную версию договора строго на основе текста ниже.',
        'Устрани перечисленные юридические риски, сохрани структуру и деловой стиль документа.',
        '',
        'РИСКИ ДЛЯ УСТРАНЕНИЯ:',
        riskList
          .map((risk, index) => `${index + 1}. ${risk.title}: ${risk.description}. Рекомендация: ${risk.recommendation}`)
          .join('\n'),
        '',
        'ТЕКСТ ДОГОВОРА:',
        contractText,
      ].join('\n');

      const data = await docsApi.generate('contract', docDescription);
      const cleanedText = cleanGeneratedContract(data.content);
      if (data.id) await docsApi.download(data.id);

      window.clearInterval(timer);
      setGenProgress(100);
      setContractText(cleanedText);
      setOriginalAnalyzedText(cleanedText);
      lastSavedTextRef.current = cleanedText;
      setResults([]);
      setSummary('Все найденные риски устранены. Финальная версия сохранена в документах и скачана в DOCX.');
      setDiffResult(null);
      showToast('Финальная версия договора создана и скачана');
    } catch (err) {
      showToast(`Ошибка генерации финальной версии: ${err.message}`, 'error');
    } finally {
      window.clearInterval(timer);
      setGenerating(false);
      window.setTimeout(() => setGenProgress(0), 500);
    }
  };

  const renderStatusPill = () => {
    if (savingText) {
      return (
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-steel-300">
          <RefreshCw size={13} className="animate-spin" />
          Сохранение
        </span>
      );
    }

    if (isDirty) {
      return (
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200">
          <AlertTriangle size={13} />
          Есть правки
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-200">
        <Save size={13} />
        {lastSaved ? `Сохранено ${formatSavedTime(lastSaved)}` : 'Синхронизировано'}
      </span>
    );
  };

  const renderDiffView = () => (
    <div className="flex lg:h-full lg:min-h-0 flex-col gap-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="inline-flex w-fit rounded-2xl border border-white/10 bg-black/60 p-1">
          <button
            onClick={() => setShowSideBySide(true)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
              showSideBySide ? 'bg-white text-black' : 'text-steel-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Columns2 size={15} />
            Две версии
          </button>
          <button
            onClick={() => setShowSideBySide(false)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
              !showSideBySide ? 'bg-white text-black' : 'text-steel-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <FileText size={15} />
            В строку
          </button>
        </div>

        <button
          onClick={() => {
            setDiffResult(null);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-steel-200 transition-colors hover:bg-white/10 hover:text-white"
        >
          <EyeOff size={15} />
          Закрыть сравнение
        </button>
      </div>

      {showSideBySide ? (
        <div className="grid lg:min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-2">
          <section className="flex min-h-[400px] lg:min-h-0 flex-col lg:overflow-hidden rounded-3xl border border-white/10 bg-neutral-950">
            <div className="flex items-center gap-3 border-b border-white/5 bg-black/60 px-5 py-4">
              <span className="h-2 w-2 rounded-full bg-red-400" />
              <span className="text-xs font-semibold text-steel-300">Было</span>
            </div>
            <div 
              ref={diffOriginalRef}
              onScroll={() => handleDiffScroll('original')}
              className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-5 text-sm leading-7 text-steel-400"
            >
              {diffResult.map((part, index) => {
                if (part.added) return null;
                if (part.removed) {
                  return (
                    <div key={index} className="diff-highlight my-2 whitespace-pre-wrap rounded-xl border-l-2 border-red-400 bg-red-500/10 px-4 py-2 text-red-200 line-through">
                      {part.value}
                    </div>
                  );
                }
                return (
                  <div key={index} className="whitespace-pre-wrap px-4 opacity-50">
                    {part.value}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="flex min-h-[400px] lg:min-h-0 flex-col lg:overflow-hidden rounded-3xl border border-emerald-500/20 bg-neutral-950 shadow-[0_0_40px_rgba(16,185,129,0.04)]">
            <div className="flex items-center gap-3 border-b border-emerald-500/10 bg-black/60 px-5 py-4">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-semibold text-emerald-200">Стало</span>
              <Sparkles size={15} className="ml-auto text-emerald-300" />
            </div>
            <div 
              ref={diffModifiedRef}
              onScroll={() => handleDiffScroll('modified')}
              className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-5 text-sm leading-7 text-steel-200"
            >
              {diffResult.map((part, index) => {
                if (part.removed) return null;
                if (part.added) {
                  return (
                    <div key={index} className="diff-highlight my-2 whitespace-pre-wrap rounded-xl border-l-2 border-emerald-400 bg-emerald-500/10 px-4 py-2 text-emerald-100">
                      {part.value}
                    </div>
                  );
                }
                return (
                  <div key={index} className="whitespace-pre-wrap px-4">
                    {part.value}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      ) : (
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-neutral-950">
          <div className="flex items-center gap-3 border-b border-white/5 bg-black/60 px-5 py-4">
            <SlidersHorizontal size={16} className="text-chrome-300" />
            <span className="text-xs font-semibold text-steel-300">Изменения от ИИ</span>
          </div>
          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-6 text-sm leading-7 text-steel-200">
            {diffResult.map((part, index) => {
              if (part.added) {
                return (
                  <span key={index} className="diff-highlight mx-0.5 whitespace-pre-wrap rounded bg-emerald-500/15 px-1.5 py-0.5 text-emerald-200">
                    {part.value}
                  </span>
                );
              }
              if (part.removed) {
                return (
                  <span key={index} className="diff-highlight mx-0.5 whitespace-pre-wrap rounded bg-red-500/10 px-1.5 py-0.5 text-red-300 line-through">
                    {part.value}
                  </span>
                );
              }
              return (
                <span key={index} className="whitespace-pre-wrap">
                  {part.value}
                </span>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );

  const renderEmptyState = () => (
    <div className="flex h-full flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-white text-black shadow-[0_0_50px_rgba(255,255,255,0.12)]">
        <FileText size={44} strokeWidth={1.8} />
      </div>
      <h2 className="mb-3 text-3xl font-bold text-white">Документ готов к аудиту</h2>
      <p className="mb-8 max-w-md text-sm leading-6 text-steel-400">
        Запустим проверку условий, ответственности, сроков, подсудности и спорных формулировок по нормам РК.
      </p>
      <button
        onClick={handleAnalyze}
        className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-bold text-black transition-colors hover:bg-neutral-200"
      >
        <ShieldAlert size={17} />
        Запустить глубокий аудит
      </button>
    </div>
  );

  const renderLoading = () => (
    <div className="flex h-full flex-col items-center justify-center px-4 text-center">
      <div className="relative mb-8 h-28 w-28">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 rounded-full border-4 border-white/10 border-t-white"
        />
        <div className="absolute inset-4 flex items-center justify-center rounded-full bg-neutral-950 shadow-[0_0_50px_rgba(255,255,255,0.08)]">
          <ShieldAlert className="text-white" size={36} />
        </div>
      </div>
      <p className="mb-2 text-2xl font-bold text-white">Глубокий анализ документа</p>
      <p className="max-w-md text-sm leading-6 text-steel-400">
        Сверяем текст с практикой договорной работы, обязательными условиями и типовыми рисками.
      </p>
    </div>
  );

  if (loadingDoc) {
    return createPortal(
      <div className="fixed inset-0 z-[100] flex h-screen flex-col overflow-hidden bg-black">
        <header className="flex h-16 items-center border-b border-white/5 px-4 sm:px-6">
          <button onClick={() => navigate(-1)} className="rounded-xl p-2 text-steel-400 transition-colors hover:bg-white/5 hover:text-white">
            <X size={22} />
          </button>
        </header>
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-white" />
            <p className="text-sm font-semibold text-steel-400">Загрузка документа...</p>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  if (error) {
    return createPortal(
      <div className="fixed inset-0 z-[100] flex h-screen flex-col overflow-hidden bg-black">
        <header className="flex h-16 items-center border-b border-white/5 px-4 sm:px-6">
          <button onClick={() => navigate(-1)} className="rounded-xl p-2 text-steel-400 transition-colors hover:bg-white/5 hover:text-white">
            <X size={22} />
          </button>
          <h1 className="ml-4 font-semibold text-white">Ошибка</h1>
        </header>
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="max-w-md rounded-3xl border border-red-500/20 bg-red-500/10 p-7 text-center">
            <AlertTriangle className="mx-auto mb-4 text-red-300" size={34} />
            <p className="mb-2 font-semibold text-white">Не удалось открыть аудит</p>
            <p className="text-sm leading-6 text-steel-400">{error}</p>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <motion.div
      initial={{ opacity: 0, scale: 0.99 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.99 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="fixed inset-0 z-[100] flex flex-col lg:flex-row lg:overflow-hidden overflow-y-auto custom-scrollbar bg-[#050505] text-white selection:bg-white/20"
    >
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className={`fixed left-1/2 top-5 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border px-5 py-3 text-sm shadow-2xl backdrop-blur-xl ${
              toast.type === 'error'
                ? 'border-red-500/30 bg-red-500/10 text-red-200'
                : 'border-white/10 bg-neutral-900/90 text-white'
            }`}
          >
            {toast.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Left Pane: Sticky Document Identity ── */}
      <div className="lg:w-[35%] xl:w-[28%] border-b lg:border-b-0 lg:border-r border-white/5 bg-[#050505] z-20 flex flex-col shrink-0 lg:h-screen lg:sticky lg:top-0">
        <div className="p-6 lg:p-8 pb-4 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center text-neutral-500 hover:text-white hover:bg-white/10 transition-colors">
            <ArrowLeft size={16} />
          </button>
          {renderStatusPill()}
        </div>

        <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-8 py-8 lg:py-0 lg:overflow-y-auto custom-scrollbar">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
            <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-[2rem] bg-white/[0.02] border border-white/10 flex items-center justify-center mb-8 shadow-2xl">
              <FileSearch size={40} className="text-white/40" />
            </div>
            
            <h1 className="text-3xl lg:text-4xl font-black tracking-tight leading-none mb-4 break-words">
              Аудит договора
            </h1>
            <p className="text-sm lg:text-base text-neutral-400 font-medium mb-10 leading-relaxed">
              {auditDocType || 'Редактор, риски и исправления в одном рабочем экране'}
            </p>

            <div className="grid grid-cols-2 gap-x-6 gap-y-8">
              <div>
                <div className="text-4xl font-black tracking-tighter text-white mb-2">{riskStats.total}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Всего рисков</div>
              </div>
              <div>
                <div className="text-4xl font-black tracking-tighter text-red-400 mb-2">{riskStats.high}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-red-500/60">Высокие риски</div>
              </div>
              <div>
                <div className="text-4xl font-black tracking-tighter text-white mb-2">{textStats.pages}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Страниц</div>
              </div>
              <div>
                <div className="text-4xl font-black tracking-tighter text-white mb-2">{textStats.words}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Слов</div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8 border-t border-white/5 bg-[#050505] flex flex-col gap-3 shrink-0">
          {hasChanges && (
            <button
              onClick={handleCompareWithOriginal}
              className="w-full h-14 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-200 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-emerald-500/20 transition-colors active:scale-95"
            >
              <Columns2 size={16} /> Сравнить с оригиналом
            </button>
          )}
          {activeAuditId && (
            <button
              onClick={handleDownloadReport}
              className="w-full h-14 rounded-2xl bg-white text-black text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-neutral-200 transition-colors shadow-[0_0_30px_rgba(255,255,255,0.1)] active:scale-95"
            >
              <Download size={16} /> PDF отчёт
            </button>
          )}
        </div>
      </div>

      {/* ── Right Pane: Management ── */}
      <div className="lg:w-[65%] xl:w-[72%] bg-[#050505] flex flex-col lg:h-screen relative lg:min-h-0">
        <main className="lg:min-h-0 flex-1 flex flex-col lg:overflow-hidden p-4 sm:p-6 lg:p-8">
          {!results && !analyzing && renderEmptyState()}
          {analyzing && renderLoading()}

          {results && !analyzing && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex lg:h-full lg:min-h-0 flex-col gap-6">
              {diffResult ? (
                renderDiffView()
              ) : (
                <div className="grid lg:min-h-0 flex-1 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_460px] 2xl:grid-cols-[minmax(0,1fr)_520px]">
                    <section className="relative flex min-h-[500px] lg:min-h-0 flex-col lg:overflow-hidden rounded-[2rem] lg:rounded-[2.5rem] border border-white/5 bg-[#050505] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)] transition-colors">
                  <div className="p-4 sm:p-6 lg:p-8 pb-4">
                    <div className="mb-6 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                          <FileText size={18} />
                        </div>
                        <span className="text-xl font-black text-white tracking-tight">Текст договора</span>
                      </div>
                      <div className="hidden items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-neutral-500 sm:flex">
                        <span>{textStats.chars.toLocaleString('ru-RU')} зн</span>
                        <span>{textStats.words.toLocaleString('ru-RU')} сл</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(220px,280px)]">
                      <div className="relative">
                        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                        <input
                          value={contractSearch}
                          onChange={(e) => setContractSearch(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') goToSearchMatch(e.shiftKey ? -1 : 0);
                          }}
                          placeholder="Поиск по договору..."
                          className="h-12 w-full rounded-full border border-white/10 bg-white/[0.02] pl-11 pr-4 text-sm text-white outline-none transition-colors placeholder:text-neutral-600 focus:border-white/20 focus:bg-white/5"
                        />
                      </div>

                      <div className="flex items-center justify-between gap-2 rounded-full border border-white/10 bg-white/[0.02] px-2">
                        <button
                          onClick={() => goToSearchMatch(-1)}
                          disabled={!searchMatches.length}
                          className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <span className="min-w-16 text-center text-[10px] font-black uppercase tracking-widest text-neutral-400">
                          {searchMatches.length ? `${searchMatchIndex + 1}/${searchMatches.length}` : '0/0'}
                        </span>
                        <button
                          onClick={() => goToSearchMatch(1)}
                          disabled={!searchMatches.length}
                          className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>

                      <div className="relative">
                        <button
                          onClick={() => setShowSections(!showSections)}
                          className="flex h-12 w-full items-center justify-between rounded-full border border-white/10 bg-white/[0.02] pl-6 pr-4 text-sm text-white outline-none transition-colors hover:bg-white/10 focus:border-white/20"
                        >
                          <span className="truncate text-neutral-400 font-medium text-xs">Перейти к пункту...</span>
                          <motion.div animate={{ rotate: showSections ? 180 : 0 }} transition={{ duration: 0.2 }}>
                            <ChevronDown size={14} className="text-neutral-500" />
                          </motion.div>
                        </button>
                        
                        <AnimatePresence>
                          {showSections && (
                            <motion.div
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 5 }}
                              className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 flex max-h-[300px] flex-col overflow-y-auto rounded-3xl border border-white/10 bg-[#0a0a0a] p-2 shadow-2xl custom-scrollbar"
                            >
                              {documentSections.length === 0 ? (
                                <div className="p-4 text-center text-xs font-bold uppercase tracking-widest text-neutral-500">Пункты не найдены</div>
                              ) : (
                                documentSections.map((section, sectionIndex) => (
                                  <button
                                    key={`${section.start}-${sectionIndex}`}
                                    onClick={() => {
                                      goToSection(sectionIndex);
                                      setShowSections(false);
                                    }}
                                    className="flex w-full items-center truncate rounded-2xl px-4 py-3 text-left text-xs font-medium text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
                                  >
                                    <span className="truncate">{section.title}</span>
                                  </button>
                                ))
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {lastFixRange && (
                      <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-200 flex items-center gap-2">
                        <CheckCircle2 size={16} />
                        Исправленный фрагмент выделен зелёным в тексте договора.
                      </div>
                    )}
                  </div>

                  <textarea
                    ref={docScrollRef}
                    value={contractText}
                    onChange={(e) => {
                      setContractText(e.target.value);
                      setLastFixRange(null);
                    }}
                    placeholder="Текст документа..."
                    className={`custom-scrollbar min-h-[300px] lg:min-h-0 flex-1 resize-none bg-transparent px-4 sm:px-6 lg:px-8 pb-8 text-[15px] leading-8 text-neutral-300 outline-none placeholder:text-neutral-600 ${
                      lastFixRange ? 'selection:bg-emerald-500/40 selection:text-white' : 'selection:bg-white/20 selection:text-white'
                    }`}
                  />

                  <AnimatePresence>
                    {isDirty && (
                      <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 16 }}
                        className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2"
                      >
                        <button
                          disabled={reanalyzing}
                          onClick={handleReanalyze}
                          className="pointer-events-auto inline-flex items-center gap-3 rounded-full bg-white px-6 py-4 text-[10px] font-black tracking-widest uppercase text-black shadow-[0_10px_40px_rgba(255,255,255,0.2)] transition-colors hover:bg-neutral-200 disabled:opacity-70 active:scale-95"
                        >
                          {reanalyzing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                          {reanalyzing ? 'Анализируем правки...' : 'Обновить аудит по правкам'}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </section>

                <aside className="flex lg:min-h-0 flex-col lg:overflow-hidden rounded-[2rem] lg:rounded-[2.5rem] border border-white/5 bg-[#050505] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)] transition-colors">
                  <div className="p-6 lg:p-8 pb-4">
                    <div className="mb-6 flex items-start gap-4">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${riskStats.total ? 'bg-amber-500/5 border-amber-500/10 text-amber-400' : 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400'} shadow-lg`}>
                        {riskStats.total ? <AlertTriangle size={20} strokeWidth={2.5} /> : <FileCheck2 size={20} strokeWidth={2.5} />}
                      </div>
                      <div className="min-w-0 pt-1">
                        <p className="text-xl font-black text-white tracking-tight">{riskStats.total ? `Найдено ${riskStats.total} рисков` : 'Рисков не обнаружено'}</p>
                        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-neutral-400 font-medium">{summary || 'Анализ завершён.'}</p>
                      </div>
                    </div>

                    <div className="relative mb-6">
                      <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                      <input
                        value={riskSearch}
                        onChange={(e) => setRiskSearch(e.target.value)}
                        placeholder="Поиск по рискам..."
                        className="w-full h-12 rounded-full border border-white/10 bg-white/[0.02] pl-11 pr-4 text-sm text-white outline-none transition-colors placeholder:text-neutral-600 focus:border-white/20 focus:bg-white/5"
                      />
                    </div>

                    <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
                      {riskFilters.map((filter) => (
                        <button
                          key={filter.value}
                          onClick={() => setRiskFilter(filter.value)}
                          className={`shrink-0 rounded-full px-5 py-2.5 text-[10px] font-black tracking-widest uppercase transition-all duration-300 ${
                            riskFilter === filter.value 
                              ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)] scale-100' 
                              : 'bg-white/5 border border-white/5 text-neutral-500 hover:bg-white/10 hover:text-white scale-95 hover:scale-100'
                          }`}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="custom-scrollbar lg:min-h-0 flex-1 space-y-4 lg:overflow-y-auto px-4 sm:px-6 lg:px-8 pb-4">
                    {filteredRisks.map(({ risk, index }) => {
                      const level = normalizeRiskLevel(risk.level);
                      const meta = riskMeta[level];
                      const Icon = meta.icon;
                      const isActive = activeRiskIndex === index;
                      const contextSnippet = risk.location
                        ? String(risk.location).length > 180
                          ? `${String(risk.location).slice(0, 180)}...`
                          : String(risk.location)
                        : '';

                      return (
                        <motion.article
                          key={`${risk.title}-${index}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`rounded-[2rem] border p-6 lg:p-7 transition-all ${
                            isActive ? `${meta.border} bg-white/[0.04] shadow-xl` : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.03]'
                          }`}
                        >
                          <div className="mb-5 flex items-start justify-between gap-4">
                            <div className="flex min-w-0 gap-4">
                              <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${meta.bg.replace('/10', '/5')} ${meta.border} ${meta.text}`}>
                                <Icon size={18} strokeWidth={2.5} />
                              </div>
                              <div className="min-w-0 pt-0.5">
                                <h3 className="text-base font-black leading-tight text-white mb-2">{risk.title || 'Риск без названия'}</h3>
                                <span className={`inline-flex rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest ${meta.text} ${meta.bg}`}>
                                  {meta.label}
                                </span>
                              </div>
                            </div>
                          </div>

                          <p className="mb-6 text-[15px] font-medium leading-relaxed text-neutral-400">{risk.description}</p>

                          {contextSnippet && (
                            <button
                              onClick={() => handleFocusRisk(risk, index)}
                              className="mb-6 w-full rounded-[1.5rem] border border-white/5 bg-[#050505] p-5 text-left transition-colors hover:border-white/10 hover:bg-white/[0.02]"
                            >
                              <span className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-500">
                                <Target size={14} strokeWidth={2.5} />
                                Фрагмент в договоре
                              </span>
                              <span className="block border-l-2 border-white/10 pl-4 text-sm font-medium leading-relaxed text-neutral-300">{contextSnippet}</span>
                            </button>
                          )}

                          <div className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] p-5 lg:p-6 shadow-inner">
                            <p className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-500">
                              <Sparkles size={14} strokeWidth={2.5} />
                              Рекомендация ИИ
                            </p>
                            <p className="text-[14px] font-medium leading-relaxed text-white">{risk.recommendation}</p>

                            <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-white/5 pt-5">
                              {risk.url ? (
                                <a
                                  href={risk.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
                                >
                                  <LinkIcon size={12} strokeWidth={2.5} />
                                  {risk.article || 'Норма'}
                                </a>
                              ) : (
                                <span className="rounded-xl bg-white/5 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500">{risk.article || 'Норма не указана'}</span>
                              )}

                              <button
                                onClick={() => handleCopyRecommendation(risk)}
                                className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
                              >
                                <Clipboard size={12} strokeWidth={2.5} />
                                Копировать
                              </button>

                              {activeAuditId && (
                                <button
                                  disabled={fixingRiskIndex !== null || generating}
                                  onClick={() => handleQuickFix(risk, index)}
                                  className="ml-auto inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-black transition-transform hover:bg-neutral-200 hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
                                >
                                  {fixingRiskIndex === index ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} strokeWidth={2.5} />}
                                  {fixingRiskIndex === index ? 'Исправляем' : 'Исправить'}
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.article>
                      );
                    })}

                    {!filteredRisks.length && (
                      <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 text-center text-xs font-bold uppercase tracking-widest text-neutral-500">
                        По текущему фильтру рисков нет.
                      </div>
                    )}
                  </div>

                  {riskStats.total > 0 && (
                    <div className="p-6 lg:p-8 pt-4 shrink-0 flex justify-center">
                      <button
                        disabled={generating}
                        onClick={handleGenerateFinal}
                        className="relative flex h-14 w-full max-w-sm items-center justify-center overflow-hidden rounded-[1.5rem] text-[10px] font-black tracking-widest uppercase transition-all bg-white text-black hover:bg-neutral-200 shadow-[0_10px_40px_rgba(255,255,255,0.15)] active:scale-95"
                      >
                        {generating && (
                          <motion.span
                            className="absolute inset-y-0 left-0 bg-neutral-300"
                            initial={{ width: '0%' }}
                            animate={{ width: `${genProgress}%` }}
                            transition={{ duration: 0.25 }}
                          />
                        )}
                        <span className="relative z-10 flex items-center gap-3">
                          {generating ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              Генерация {Math.round(genProgress)}%
                            </>
                          ) : (
                            <>
                              <Download size={16} strokeWidth={2.5} />
                              Создать финальную DOCX
                            </>
                          )}
                        </span>
                      </button>
                    </div>
                  )}
                </aside>
              </div>
            )}
          </motion.div>
        )}
      </main>
      </div>
    </motion.div>,
    document.body,
  );
}
