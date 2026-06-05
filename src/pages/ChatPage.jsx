import React, { useState, useRef, useEffect, memo, useCallback, Children, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { useLanguage } from '../i18n/LanguageContext';
import { useChat } from '../contexts/ChatContext';
import AIWaveform from '../components/AIWaveform';
import { chatApi, docsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { GenerativeArtScene } from '../components/ui/generative-art-scene';
import {
  Scale, Link2, Search, ExternalLink, BookOpen, Loader2,
  Paperclip, X, FileText, Users, ShoppingBag, Building, Book,
  PenTool, GitCompare, Command, Shield, Mic, MicOff, ArrowUp, Zap, Download, Check, Copy, ThumbsUp, ThumbsDown, RefreshCw, Square
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TextareaAutosize from 'react-textarea-autosize';

function useTypewriter(text, { speed = 120, enabled = true } = {}) {
  const [displayed, setDisplayed] = useState(enabled ? '' : text);
  const [done, setDone] = useState(!enabled);
  const indexRef = useRef(enabled ? 0 : text.length);
  const rafRef = useRef(null);
  const lastTimeRef = useRef(null);
  const msPerChar = 1000 / speed;

  useEffect(() => {
    if (!enabled) { setDisplayed(text); setDone(true); return; }
    
    setDone(false);

    const tick = (timestamp) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const elapsed = timestamp - lastTimeRef.current;
      const charsToAdd = Math.floor(elapsed / msPerChar);
      
      if (charsToAdd > 0) {
        lastTimeRef.current = timestamp - (elapsed % msPerChar);
        indexRef.current = Math.min(indexRef.current + charsToAdd, text.length);
        setDisplayed(text.slice(0, indexRef.current));
      }
      
      if (indexRef.current < text.length) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDone(true);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [text, enabled, msPerChar]);

  return { displayed, done };
}


const TEMPLATES = [
  { label: 'Составить NDA', prompt: 'Подготовьте шаблон Соглашения о неразглашении (NDA) по законодательству РК.', icon: <FileText size={16} /> },
  { label: 'Претензия', prompt: 'Составьте досудебную претензию о возврате долга по расписке.', icon: <PenTool size={16} /> },
  { label: 'Договор аренды', prompt: 'Проверьте типовой договор аренды квартиры на подводные камни.', icon: <Book size={16} /> },
  { label: 'Регистрация ТОО', prompt: 'Какие документы нужны для регистрации ТОО в 2026 году?', icon: <Building size={16} /> },
];

const INLINE_COMMANDS = [
  { label: 'Анализ рисков',  description: 'Проверить договор на уязвимости', prefix: '/analyze',  icon: <Shield size={14} /> },
  { label: 'Создать договор', description: 'Генерация нового документа',       prefix: '/contract', icon: <FileText size={14} /> },
  { label: 'Составить иск',  description: 'Подготовка искового заявления',     prefix: '/claim',    icon: <PenTool size={14} /> },
  { label: 'Найти адвоката', description: 'Поиск подходящего юриста',          prefix: '/lawyer',   icon: <Search size={14} /> },
];

/* ── Citation Tooltip ── */
function CitationTooltip({ text, reference }) {
  const [show, setShow] = useState(false);
  const timeoutRef = useRef(null);
  const handleEnter = () => { clearTimeout(timeoutRef.current); setShow(true); };
  const handleLeave = () => { timeoutRef.current = setTimeout(() => setShow(false), 200); };
  return (
    <span className="relative inline-block" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <span
        className="inline-flex items-center gap-1.5 px-2 py-0.5 mx-0.5 rounded-md text-[12px] font-light tracking-wide cursor-pointer transition-all duration-200 bg-white/10 text-white hover:bg-white/20"
        onClick={() => reference?.url && window.open(reference.url, '_blank')}
      >
        <BookOpen size={10} className="flex-shrink-0" />{text}
      </span>
      <AnimatePresence>
        {show && reference && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-72 pointer-events-auto"
            onMouseEnter={handleEnter} onMouseLeave={handleLeave}
          >
            <div className="bg-[#050505] border border-white/10 rounded-2xl p-4 shadow-2xl">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <BookOpen size={14} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white leading-snug mb-1">{reference.title}</p>
                  {reference.snippet && <p className="text-[10px] text-white/40 leading-relaxed line-clamp-3">{reference.snippet}</p>}
                </div>
              </div>
              {reference.url && (
                <a href={reference.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[12px] font-light tracking-wide text-white/40 hover:text-white transition-colors pt-3 border-t border-white/5">
                  <ExternalLink size={10} />adilet.zan.kz
                </a>
              )}
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] w-3 h-3 bg-[#050505] border-r border-b border-white/10 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

const msgVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.3 } },
};

const suggestionVariants = {
  hidden: { opacity: 0, y: 15, filter: 'blur(5px)' },
  visible: (i) => ({ opacity: 1, y: 0, filter: 'blur(0px)', transition: { delay: 0.1 + i * 0.05, duration: 0.4, ease: 'easeOut' } }),
};

/* ── Escalation Banner ── */
function EscalationBanner({ escalation }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  if (!escalation?.needed || user?.role === 'lawyer') return null;
  const category = escalation.category || 'Юридическая консультация';
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="mt-8 w-full max-w-lg rounded-[2rem] bg-white/[0.02] border border-white/10 p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center gap-6 justify-between">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-white/10 text-white flex items-center justify-center flex-shrink-0">
          <Scale size={20} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-white mb-1">Требуется адвокат</h4>
          <p className="text-[12px] font-light tracking-wide text-white/40 leading-relaxed">{escalation.reason}</p>
        </div>
      </div>
      <button onClick={() => navigate(`/lawyers?specialization=${encodeURIComponent(category)}`)}
        className="shrink-0 flex items-center justify-center gap-2 h-12 px-6 bg-white/10 text-white text-[12px] font-light tracking-wide rounded-xl hover:bg-neutral-200 transition-colors">
        <Search size={14} />Найти
      </button>
    </motion.div>
  );
}

function LawyerSearchChip({ category }) {
  const navigate = useNavigate();
  return (
    <motion.button onClick={() => navigate(`/lawyers?specialization=${encodeURIComponent(category || '')}`)}
      className="inline-flex items-center gap-2 h-10 px-5 rounded-xl text-[12px] font-light tracking-wide bg-white/10 text-white hover:bg-neutral-200 transition-colors">
      <Search size={12} />Найти адвоката
    </motion.button>
  );
}

const MarkdownRenderer = memo(({ content, isStreaming = false, references = [] }) => {
  const cleanText = (text) => {
    let raw = text.split('[REFS]')[0].split('[SEGMENT]')[0].split('[ESCALATION]')[0].split('[SUGGESTIONS]')[0]
      .split('<!--REFS-->')[0].split('<!--SEGMENT-->')[0].split('<!--ESCALATION-->')[0].split('<!--SUGGESTIONS-->')[0].trim();
    raw = raw.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, url) => url.includes(' ') ? `[${label}](${encodeURI(url)})` : match);
    return raw;
  };
  const autoCloseMarkdown = (text) => {
    if (!isStreaming) return text;
    let closed = text;
    const codeBlockCount = (closed.match(/```/g) || []).length;
    if (codeBlockCount % 2 !== 0) closed += '\n```';
    return closed;
  };
  const injectCitations = (textNode) => {
    if (typeof textNode !== 'string') return textNode;
    const citationRegex = /((?:[пч]\.\s*\d+\s+)?(?:ст\.(?:ст\.)?|стать[ияюейях]+)\s*\d+(?:[\s,.-]*\d+)*(?:\s+(?:ТК|ГК|УК|КоАП|НК|ГПК|УПК|ЗРК|Закона|Конституци[ияюей]+)(?:\s+РК)?)?)/gi;
    const parts = textNode.split(citationRegex);
    if (parts.length <= 1) return textNode;
    return parts.map((part, idx) => {
      if (citationRegex.test(part)) {
        citationRegex.lastIndex = 0;
        const matchedRef = references.find(r => r.title && (part.toLowerCase().includes(r.title.toLowerCase().slice(0, 10)) || r.title.toLowerCase().includes(part.toLowerCase().slice(0, 10)))) || (references.length > 0 ? references[0] : null);
        return <CitationTooltip key={idx} text={part} reference={matchedRef || { title: part, snippet: 'Нажмите для поиска', url: `https://adilet.zan.kz/rus/search?q=${encodeURIComponent(part)}` }} />;
      }
      citationRegex.lastIndex = 0; return part;
    });
  };
  const components = useMemo(() => {
    const WithCitations = ({ children }) => {
      return <>{Children.map(children, child => typeof child === 'string' ? injectCitations(child) : child)}</>;
    };

    return {
      p: ({ children }) => <p className="mb-4 last:mb-0 leading-relaxed text-[15px] text-white/90"><WithCitations>{children}</WithCitations></p>,
      li: ({ children }) => <li className="mb-2 leading-relaxed text-[15px] text-white/90"><WithCitations>{children}</WithCitations></li>,
      ul: ({ children }) => <ul className="list-disc pl-5 mb-4 marker:text-white/40"><WithCitations>{children}</WithCitations></ul>,
      ol: ({ children }) => <ol className="list-decimal pl-5 mb-4 marker:text-white/40"><WithCitations>{children}</WithCitations></ol>,
      strong: ({ children }) => <strong className="font-bold text-white"><WithCitations>{children}</WithCitations></strong>,
      em: ({ children }) => <em className="text-white/40 not-italic"><WithCitations>{children}</WithCitations></em>,
      h1: ({ children }) => <h1 className="text-xl font-bold text-white mt-6 mb-4 tracking-tight"><WithCitations>{children}</WithCitations></h1>,
      h2: ({ children }) => <h2 className="text-lg font-bold text-white mt-5 mb-3 tracking-tight"><WithCitations>{children}</WithCitations></h2>,
      h3: ({ children }) => <h3 className="text-[15px] font-bold text-white mt-4 mb-2 tracking-tight"><WithCitations>{children}</WithCitations></h3>,
      pre: ({ children }) => <pre className="bg-[#050505] border border-white/5 rounded-2xl p-4 my-4 overflow-x-auto text-sm custom-scrollbar">{children}</pre>,
      code: ({ children, inline }) => inline ? <code className="bg-[#050505] px-1.5 py-0.5 rounded-md text-[13px] text-white/80 font-mono border border-white/5">{children}</code> : <code>{children}</code>,
      a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer" className="text-white underline underline-offset-4 decoration-white/20 hover:decoration-white transition-colors">{children}</a>,
      blockquote: ({ children }) => <blockquote className="border-l-2 border-white/20 pl-4 my-4 text-white/60 italic font-medium"><WithCitations>{children}</WithCitations></blockquote>,
    };
  }, [isStreaming, references]);
  return (
    <div className={`text-white/80 font-medium ${isStreaming ? 'streaming-message' : ''}`}>
      <ReactMarkdown components={components}>
        {isStreaming ? autoCloseMarkdown(cleanText(content)) : cleanText(content)}
      </ReactMarkdown>
      {isStreaming && <StreamCursor />}
    </div>
  );
});

const detectLanguage = (text) => {
  if (/[әғқңөұүһі]/.test(text.toLowerCase())) return 'kz';
  return 'ru';
};

/* ── Vapour glowing cursor rendered inline in markdown text ── */
const StreamCursor = () => (
  <motion.span
    animate={{ filter: ['blur(4px)', 'blur(2px)', 'blur(4px)'], opacity: [0.5, 1, 0.5], scale: [0.8, 1.3, 0.8] }}
    transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
    className="inline-block w-3 h-3 bg-white ml-2 align-middle rounded-full shadow-[0_0_20px_8px_rgba(255,255,255,0.4)]"
    aria-hidden
  />
);

/* ── Wrapper that uses typewriter for history msgs, cursor for streaming ── */
const TypewriterMarkdown = memo(({ msg, isStreaming, sendMessage, isTyping, user }) => {
  // Fix for F5 re-animating: use isHistory prop explicitly passed or assume false if it's new
  const isHistoryLoaded = msg.isHistory === true;
  const { displayed, done } = useTypewriter(msg.content, {
    speed: 160,
    enabled: !isHistoryLoaded,
  });

  const shownContent = displayed;
  const showCursor = isStreaming || !done;
  const showExtras = done || isHistoryLoaded; 

  return (
    <div className="relative">
      <MarkdownRenderer
        content={shownContent}
        isStreaming={isStreaming || !done}
        references={msg.references || []}
      />
      {showCursor && <StreamCursor />}
      <AnimatePresence>
        {showExtras && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col mt-6"
          >
            {/* Escalation Banner directly after text */}
            {msg.escalation?.needed && <EscalationBanner escalation={msg.escalation} />}

            {/* Show References */}
            {msg.references?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap gap-2">
                {msg.references.map((ref, i) => (
                  <a key={i} href={ref.url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/5 text-[12px] font-light tracking-wide text-white/60 hover:text-white hover:bg-white/[0.05] transition-all">
                    <Link2 size={10} /><span>{ref.title}</span>
                  </a>
                ))}
              </div>
            )}

            {/* Show Suggestions and LawyerSearchChip */}
            {!isStreaming && (msg.suggestions?.length > 0 || msg.escalation?.needed) && (
              <div className="flex flex-wrap gap-2 mt-4">
                {msg.escalation?.needed && user?.role !== 'lawyer' && <LawyerSearchChip category={msg.escalation.category} />}
                {msg.suggestions?.map((sug, i) => (
                  <button key={i} onClick={() => { if (!isTyping) sendMessage(sug); }} disabled={isTyping}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-light tracking-wide bg-white/[0.05] text-white/60 hover:bg-white/[0.1] hover:text-white border border-white/10 transition-colors disabled:opacity-50">
                    {sug}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});


/* ═══════════════════════════════════════
   MAIN CHAT PAGE
═══════════════════════════════════════ */
export default function ChatPage() {
  const { t, switchLanguage, lang: currentAppLang } = useLanguage();
  const { messages, isTyping, isStreaming, sendMessage: sendChatMessage } = useChat();
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [voiceError, setVoiceError] = useState(null);
  const recognitionRef = useRef(null);
  const scrollRef = useRef(null);
  const isAutoScrollActive = useRef(true);
  const lastMsgCount = useRef(0);
  const textareaRef = useRef(null);
  const [attachedFile, setAttachedFile] = useState(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const [showCommands, setShowCommands] = useState(false);
  const [commandIndex, setCommandIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [voiceLang, setVoiceLang] = useState(currentAppLang || 'ru');
  const [showTemplates, setShowTemplates] = useState(false);
  const [feedbackState, setFeedbackState] = useState({});
  const [copiedId, setCopiedId] = useState(null);
  const [isExporting, setIsExporting] = useState(false);


  const isGenerating = isTyping || isStreaming;

  const handleCopy = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {}
  };

  const handleFeedback = (id, type) => {
    setFeedbackState(prev => ({ ...prev, [id]: prev[id] === type ? null : type }));
  };

  const handleExport = () => {
    setIsExporting(true);
    let text = 'Экспорт чата LegalAI\n\n';
    messages.forEach(m => {
      text += m.role === 'user' ? 'Вы: ' : 'LegalAI: ';
      text += m.content + '\n\n';
    });
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'LegalAI_Chat_Export.txt';
    a.click();
    URL.revokeObjectURL(url);
    setIsExporting(false);
  };

  const handleRegenerate = (index) => {
    // Find the last user message before this assistant message
    let lastUserMsg = null;
    for (let i = index - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserMsg = messages[i].content;
        break;
      }
    }
    if (lastUserMsg && !isTyping) {
      sendMessage(lastUserMsg);
    }
  };


  /* ── Voice Input (Web Speech API) ── */
  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError('Ваш браузер не поддерживает голосовой ввод');
      setTimeout(() => setVoiceError(null), 3000);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = voiceLang === 'kz' ? 'kk-KZ' : 'ru-RU';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
    };
    recognition.onerror = (e) => {
      setIsListening(false);
      setInterimTranscript('');
      if (e.error !== 'aborted') {
        let msg = e.error;
        if (e.error === 'not-allowed') msg = 'Доступ к микрофону запрещен. Разрешите его в настройках сайта.';
        setVoiceError('Ошибка распознавания: ' + msg);
      }
    };
    recognition.onresult = (e) => {
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      if (final) setInput(prev => (prev + ' ' + final).trim());
      setInterimTranscript(interim);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      let msg = e.message;
      if (e.name === 'NotAllowedError' || e.name === 'SecurityError') {
         msg = 'Запрещено браузером. Возможно, вы используете HTTP, а не HTTPS (или localhost).';
      }
      setVoiceError('Не удалось запустить микрофон: ' + msg);
    }
  }, [voiceLang]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) stopListening();
    else startListening();
  }, [isListening, startListening, stopListening]);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) validateAndSetFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  const validateAndSetFile = (file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    if (['pdf', 'docx', 'doc', 'txt'].includes(ext)) {
      if (file.size > 10 * 1024 * 1024) { alert("Файл слишком большой. Максимум 10МБ."); return; }
      setAttachedFile(file);
    } else { alert("Поддерживаются только PDF, DOCX, DOC и TXT."); }
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragOver(false); };
  const handleDrop = (e) => { e.preventDefault(); setIsDragOver(false); const file = e.dataTransfer.files?.[0]; if (file) validateAndSetFile(file); };

  const sendMessage = useCallback((text, docId, docName) => {
    if (messages.length === 0) switchLanguage(detectLanguage(text));
    sendChatMessage(text, docId, docName);
  }, [messages.length, sendChatMessage, switchLanguage]);

  const scrollToBottom = useCallback((smooth = false) => {
    if (!scrollRef.current || !isAutoScrollActive.current) return;
    const el = scrollRef.current;
    
    if (smooth) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    } else {
      el.scrollTop = el.scrollHeight;
    }
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    
    let animationFrameId;
    
    const observer = new ResizeObserver(() => {
      if (isAutoScrollActive.current) {
        const targetScrollTop = el.scrollHeight - el.clientHeight;
        
        const animateScroll = () => {
          if (!el || !isAutoScrollActive.current) return;
          const currentScrollTop = el.scrollTop;
          const distance = targetScrollTop - currentScrollTop;
          
          if (Math.abs(distance) < 1) {
            el.scrollTop = targetScrollTop;
            return;
          }
          
          el.scrollTop = currentScrollTop + distance * 0.08;
          animationFrameId = requestAnimationFrame(animateScroll);
        };
        
        cancelAnimationFrame(animationFrameId);
        animationFrameId = requestAnimationFrame(animateScroll);
      }
    });
    
    const inner = el.firstElementChild;
    if (inner) observer.observe(inner);
    
    return () => {
      observer.disconnect();
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    isAutoScrollActive.current = scrollHeight - scrollTop - clientHeight < 100;
  };

  useEffect(() => {
    if (messages.length > lastMsgCount.current) {
      isAutoScrollActive.current = true;
      scrollToBottom(true);
      lastMsgCount.current = messages.length;
    }
  }, [messages.length, scrollToBottom]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if ((!input.trim() && !attachedFile) || isTyping || isUploadingFile) return;
    let docId = null, docName = null;
    if (attachedFile) {
      setIsUploadingFile(true);
      try { const res = await docsApi.upload(attachedFile); docId = res.id; docName = res.name; setAttachedFile(null); }
      catch (err) { alert("Ошибка при загрузке файла: " + err.message); setIsUploadingFile(false); return; }
      setIsUploadingFile(false);
    }
    if (input.trim() || docId) { sendMessage(input.trim() || "Проанализируй прикрепленный документ", docId, docName); setInput(''); }
  };

  const canSend = (input.trim() || attachedFile) && !isTyping && !isUploadingFile;

  return (
    <div
      className="flex flex-col h-full bg-[#050505] text-white relative w-full overflow-hidden"
      onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
    >
      
      {messages.length > 0 && (
        <button onClick={handleExport} disabled={isExporting} title="Экспорт переписки" className="absolute top-6 right-6 z-50 w-10 h-10 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.05] transition-all">
           {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
        </button>
      )}

      {/* ── Living Background ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 flex items-center justify-center opacity-20">
        <motion.div
          className="w-[800px] h-[800px] mix-blend-screen filter blur-[12px]"
          animate={{ 
            scale: isGenerating ? [1, 1.15, 1.05, 1.2, 1] : [1, 1.12, 1], 
            opacity: isGenerating ? [0.4, 0.7, 0.5, 0.8, 0.4] : [0.2, 0.45, 0.2] 
          }}
          transition={{ 
            duration: isGenerating ? 3 : 6, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        >
          <GenerativeArtScene isThinking={isGenerating} />
        </motion.div>

        <AnimatePresence>
          {isGenerating && (
            <motion.div
              key="glow-ring"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: [0, 0.2, 0], scale: [0.8, 1.6, 2] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
              className="absolute w-[500px] h-[500px] rounded-full border border-white/20"
              style={{ filter: 'blur(12px)' }}
            />
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isDragOver && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-[#050505]/90 backdrop-blur-xl border-4 border-dashed border-white/20 m-6 rounded-[3rem]">
            <div className="text-center">
              <FileText size={64} className="mx-auto text-white/40 mb-6" />
              <h3 className="text-3xl font-black tracking-tight text-white">Отпустите файл здесь</h3>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      
      {/* ── Main Layout Wrapper ── */}
      <div className={`flex flex-col w-full h-full relative z-10 transition-all duration-700 ease-in-out ${messages.length === 0 ? 'justify-center' : 'justify-end'}`}>
        
        {messages.length > 0 && (
          <div ref={scrollRef} onScroll={handleScroll}
            style={{ WebkitOverflowScrolling: 'touch' }}
            className="flex-1 overflow-y-auto px-4 md:px-6 py-6 w-full max-w-4xl mx-auto custom-scrollbar relative z-10 scroll-smooth touch-pan-y overscroll-contain">
            <div className="flex flex-col space-y-6 min-h-full justify-end pb-4">
              <AnimatePresence mode="popLayout">
                {messages.map((msg, index) => (
                  <motion.div key={msg.tempId || msg.id || index}
                    className={`flex flex-col w-full ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                    variants={msgVariants} initial={msg.isHistory ? false : "hidden"} animate="visible"
                  >
                    <div className={`relative w-full max-w-[95%] sm:max-w-[85%] p-4 md:p-6 rounded-3xl ${
                      msg.role === 'user' 
                        ? 'bg-white/[0.03] border border-white/10 text-white ml-auto' 
                        : 'bg-white/[0.01] border border-white/5 text-white hover:border-white/10 transition-colors'
                    }`}>
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/5">
                          <div className="w-7 h-7 rounded-lg bg-white/10 text-white flex items-center justify-center">
                            <Scale size={14} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[14px] font-medium tracking-wide text-white/90 leading-none">LegalAI</span>
                            <span className="text-[11px] font-light tracking-wide text-white/40 mt-0.5">Ответ системы</span>
                          </div>
                        </div>
                      )}
                      
                      {msg.role === 'user' ? (
                        <>
                          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/5 opacity-50">
                            <div className="w-6 h-6 rounded-lg bg-white/10 text-white flex items-center justify-center">
                              <Search size={12} />
                            </div>
                            <span className="text-[11px] font-light tracking-wide text-white">Вы спросили</span>
                          </div>
                          {msg.attached_document_id && (
                            <div className="flex items-center gap-2 mb-3 bg-white/[0.05] w-fit px-2.5 py-1.5 rounded-lg border border-white/10">
                              <FileText size={12} className="text-white/60" />
                              <span className="text-xs font-semibold truncate max-w-[200px]">{msg.attached_document_name || "Документ"}</span>
                            </div>
                          )}
                          <p className="text-[15px] font-medium leading-relaxed whitespace-pre-wrap text-white/90">{msg.content}</p>
                        </>
                      ) : (
                        <TypewriterMarkdown 
                          msg={msg} 
                          isStreaming={isStreaming && index === messages.length - 1} 
                          sendMessage={sendMessage}
                          isTyping={isTyping}
                          user={user}
                        />
                      )}
                    </div>
                  </motion.div>
                ))}

                {isTyping && (
                  <motion.div className="flex justify-start w-full pl-6"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <div className="bg-white/[0.02] border border-white/5 p-3 md:p-4 rounded-2xl flex items-center gap-3">
                       <Zap size={14} className="text-white animate-pulse" />
                       <AIWaveform label="АНАЛИЗ..." />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {messages.length === 0 && (
          <motion.div key="welcome-header"
            className="flex flex-col items-center justify-center text-center px-4 mb-8"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <div className="w-14 h-14 rounded-[1.2rem] bg-white/10 text-white flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(255,255,255,0.2)]">
              <Scale size={28} strokeWidth={2} />
            </div>
            <h2 className="text-4xl md:text-5xl font-light tracking-wide mb-4 bg-gradient-to-b from-white to-white/40 text-transparent bg-clip-text">
              Правовой ИИ
            </h2>
            <p className="text-white/50 max-w-sm mx-auto text-[13px] font-light tracking-wide leading-relaxed">
              Задайте юридический вопрос, выберите шаблон или загрузите документ для анализа.
            </p>
          </motion.div>
        )}

        {/* INPUT BOX ANIMATED CONTAINER */}
        <motion.div 
          layout 
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className={`w-full px-4 ${messages.length === 0 ? 'max-w-3xl mb-0' : 'max-w-4xl pb-4'} mx-auto relative z-20`}
        >
<AnimatePresence>
          {showCommands && (
            <motion.div initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }} transition={{ duration: 0.2 }}
              className="absolute bottom-full left-4 right-4 md:left-0 md:right-0 mb-4 bg-[#050505] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Быстрые команды</span>
              </div>
              <div className="p-1.5 flex flex-col gap-0.5 max-h-56 overflow-y-auto custom-scrollbar">
                {INLINE_COMMANDS.filter(c => c.prefix.toLowerCase().startsWith(input.toLowerCase())).map((cmd, i) => (
                  <button key={i} type="button"
                    onClick={() => { setInput(cmd.prefix + ' '); setShowCommands(false); textareaRef.current?.focus(); }}
                    onMouseEnter={() => setCommandIndex(i)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${commandIndex === i ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/[0.05]'}`}
                  >
                    <div className={`p-1.5 rounded-lg ${commandIndex === i ? 'bg-black/10' : 'bg-white/5 text-white'}`}>{cmd.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold tracking-tight">{cmd.label}</div>
                      <div className={`text-[12px] font-light tracking-wide mt-0.5 ${commandIndex === i ? 'text-black/60' : 'text-white/40'}`}>{cmd.description}</div>
                    </div>
                    <div className={`text-[9px] font-black tracking-widest px-2 py-1 rounded-md ${commandIndex === i ? 'bg-black/10' : 'bg-white/5'}`}>{cmd.prefix}</div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        
          <AnimatePresence>
            {isGenerating && (
              <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:10}} className="flex justify-center w-full absolute bottom-[100%] left-0 pb-4">
                 <button type="button" onClick={() => {/* Mock stop for now */}} className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[12px] font-light tracking-wide hover:bg-red-500/20 transition-colors backdrop-blur-md">
                    <Square size={12} fill="currentColor" /> Остановить генерацию
                 </button>
              </motion.div>
            )}
          </AnimatePresence>

        <motion.form onSubmit={handleSubmit}
          animate={{ borderColor: isListening ? 'rgba(239,68,68,0.4)' : (isFocused ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)') }}
          transition={{ duration: 0.3 }}
          className={`relative rounded-[2rem] border bg-white/[0.02] backdrop-blur-[40px] shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden ${isListening ? 'shadow-[0_0_30px_rgba(239,68,68,0.1)]' : ''}`}
        >
          {attachedFile && (
            <div className="px-4 pt-3 pb-0">
              <div className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/10 px-3 py-1.5 rounded-xl">
                <FileText size={14} className="text-white/60" />
                <span className="text-[13px] font-medium text-white truncate max-w-[200px]">{attachedFile.name}</span>
                <button type="button" onClick={() => setAttachedFile(null)} className="text-white/40 hover:text-white transition-colors ml-1">
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          {isListening ? (
            <div className="px-4 py-6 flex flex-col items-center justify-center min-h-[80px]">
              <div className="flex items-center gap-3 mb-2">
                <motion.div animate={{ opacity: [1, 0.5, 1], scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)]" />
                <span className="text-[12px] font-light tracking-wide text-red-500">Слушаю вас...</span>
              </div>
              <div className="max-w-md w-full text-center">
                {input && <span className="text-[15px] font-medium text-white/80">{input} </span>}
                {interimTranscript && <span className="text-[15px] font-medium text-white/50 italic">{interimTranscript}</span>}
              </div>
            </div>
          ) : (
            <div className="px-4 pt-3 pb-2">
              <TextareaAutosize
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  const val = e.target.value; setInput(val);
                  if (val.startsWith('/')) { setShowCommands(true); setCommandIndex(0); }
                  else setShowCommands(false);
                }}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={(e) => {
                  if (showCommands) {
                    const filtered = INLINE_COMMANDS.filter(c => c.prefix.toLowerCase().startsWith(input.toLowerCase()));
                    if (e.key === 'ArrowDown') { e.preventDefault(); setCommandIndex(i => (i + 1) % filtered.length); }
                    else if (e.key === 'ArrowUp') { e.preventDefault(); setCommandIndex(i => (i - 1 + filtered.length) % filtered.length); }
                    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[commandIndex]) { setInput(filtered[commandIndex].prefix + ' '); setShowCommands(false); } }
                    else if (e.key === 'Escape') setShowCommands(false);
                  } else if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); }
                }}
                placeholder="Спросите LegalAI..."
                minRows={1}
                maxRows={7}
                className="w-full bg-transparent border-none text-white placeholder-white/20 text-[15px] font-medium outline-none resize-none custom-scrollbar leading-relaxed tracking-tight"
              />
            </div>
          )}

          <div className="flex items-center justify-between px-3 pb-3 pt-1">
            <div className="flex items-center gap-1.5">
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".pdf,.docx,.doc,.txt" className="hidden" />

              <button type="button"
                onClick={() => { if (input.startsWith('/')) setShowCommands(false); else { setInput('/'); setShowCommands(true); textareaRef.current?.focus(); } }}
                title="Команды"
                className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-light tracking-wide transition-all ${showCommands ? 'bg-white/10 text-white' : 'bg-transparent text-white/40 hover:text-white hover:bg-white/[0.05]'}`}
              >
                <Command size={12} /><span className="hidden sm:block">Команды</span>
              </button>

              
              <button type="button" onClick={() => fileInputRef.current?.click()} title="Прикрепить файл"
                className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-light tracking-wide transition-all ${attachedFile ? 'bg-white/10 text-white' : 'bg-transparent text-white/40 hover:text-white hover:bg-white/[0.05]'}`}
              >
                <Paperclip size={12} /><span className="hidden sm:block">Файл</span>
              </button>

              <button type="button" onClick={toggleListening} title="Голосовой ввод"
                className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-light tracking-wide transition-all duration-300 ${
                  isListening
                    ? 'bg-red-500 text-black shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                    : 'bg-transparent text-white/40 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                {isListening
                  ? <><motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.8, repeat: Infinity }}><MicOff size={12} /></motion.div><span className="hidden sm:block">Стоп</span></>
                  : <><Mic size={12} /><span className="hidden sm:block">Голос</span></>
                }
              </button>
            </div>
            
            <div className="flex items-center gap-3">
              {voiceError && (
                <span className="text-[12px] font-light tracking-wide text-red-500 mr-2">{voiceError}</span>
              )}
              {!voiceError && <span className="text-[12px] font-light tracking-wide text-white/20 hidden sm:block">Enter — отправить</span>}
              <button type="submit" disabled={!canSend}
                className={`relative h-8 w-8 flex items-center justify-center rounded-lg transition-all duration-300 ${canSend ? 'bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95' : 'bg-white/[0.02] text-white/20 border border-white/5'}`}
              >
                {isUploadingFile
                  ? <Loader2 size={14} className="animate-spin" />
                  : isGenerating
                    ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                        <Loader2 size={14} />
                      </motion.div>
                    : <ArrowUp size={14} strokeWidth={2.5} />
                }
              </button>
            </div>
          </div>

          {isGenerating && (
            <motion.div
              key="glow-entry"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="absolute bottom-0 left-0 right-0 h-[2px] pointer-events-none"
            >
              <div
                className="absolute inset-0 h-full bg-gradient-to-r from-transparent via-white/50 to-transparent"
                style={{ animation: 'glowSweep 2s ease-in-out infinite' }}
              />
            </motion.div>
          )}
        </motion.form>
        <p className="text-center text-[12px] font-light tracking-wide text-white/20 mt-6">
          LegalAI может допускать ошибки. Проконсультируйтесь с юристом по важным вопросам.
        </p>
        </motion.div>
      </div>
    </div>
  );
}
