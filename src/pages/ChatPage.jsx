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
  PenTool, GitCompare, Command, Shield, Mic, MicOff, ArrowUp,
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
    
    // We do NOT reset indexRef to 0 here.
    // Because if text is streaming (growing), we want to continue typing from where we left off.
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
        className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-md text-xs font-semibold cursor-pointer transition-all duration-200 bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:border-white/30"
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
            <div className="bg-neutral-900 border border-white/10 rounded-xl p-3.5 shadow-2xl">
              <div className="flex items-start gap-2.5 mb-2">
                <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <BookOpen size={13} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white leading-snug mb-0.5">{reference.title}</p>
                  {reference.snippet && <p className="text-[10px] text-neutral-400 leading-relaxed line-clamp-3">{reference.snippet}</p>}
                </div>
              </div>
              {reference.url && (
                <a href={reference.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[10px] font-bold text-white/70 hover:text-white transition-colors pt-2 border-t border-white/10">
                  <ExternalLink size={10} />Открыть на adilet.zan.kz
                </a>
              )}
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] w-3 h-3 bg-neutral-900 border-r border-b border-white/10 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

const msgVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
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
      className="mt-6 w-full max-w-sm rounded-2xl bg-neutral-900 border border-white/10 p-5 shadow-xl">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center flex-shrink-0">
          <Scale size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-white mb-1">Рекомендуется помощь адвоката</h4>
          <p className="text-xs text-neutral-400 leading-relaxed">{escalation.reason}</p>
        </div>
      </div>
      <button onClick={() => navigate(`/lawyers?specialization=${encodeURIComponent(category)}`)}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white text-black text-xs font-bold rounded-xl hover:bg-neutral-200 transition-colors">
        <Search size={14} />Найти юриста
      </button>
    </motion.div>
  );
}

function LawyerSearchChip({ category }) {
  const navigate = useNavigate();
  return (
    <motion.button onClick={() => navigate(`/lawyers?specialization=${encodeURIComponent(category || '')}`)}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 text-white hover:bg-neutral-700 transition-colors border border-white/5">
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
      p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed text-[15px]"><WithCitations>{children}</WithCitations></p>,
      li: ({ children }) => <li className="mb-1 leading-relaxed"><WithCitations>{children}</WithCitations></li>,
      ul: ({ children }) => <ul className="list-disc pl-5 mb-4 marker:text-neutral-600">{children}</ul>,
      ol: ({ children }) => <ol className="list-decimal pl-5 mb-4 marker:text-neutral-600">{children}</ol>,
      strong: ({ children }) => <strong className="font-semibold text-white"><WithCitations>{children}</WithCitations></strong>,
      em: ({ children }) => <em className="text-neutral-400 not-italic"><WithCitations>{children}</WithCitations></em>,
      h1: ({ children }) => <h1 className="text-xl font-bold text-white mt-6 mb-3 tracking-tight"><WithCitations>{children}</WithCitations></h1>,
      h2: ({ children }) => <h2 className="text-lg font-bold text-white mt-5 mb-3 tracking-tight"><WithCitations>{children}</WithCitations></h2>,
      h3: ({ children }) => <h3 className="text-base font-bold text-white mt-4 mb-2 tracking-tight"><WithCitations>{children}</WithCitations></h3>,
      pre: ({ children }) => <pre className="bg-neutral-900 border border-white/10 rounded-xl p-4 my-4 overflow-x-auto text-sm">{children}</pre>,
      code: ({ children, inline }) => inline ? <code className="bg-neutral-900 px-1.5 py-0.5 rounded text-sm text-neutral-300 font-mono border border-white/5">{children}</code> : <code>{children}</code>,
      a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer" className="text-neutral-300 underline underline-offset-4 decoration-neutral-600 hover:text-white transition-colors">{children}</a>,
      blockquote: ({ children }) => <blockquote className="border-l-2 border-neutral-700 pl-4 my-4 text-neutral-400 italic"><WithCitations>{children}</WithCitations></blockquote>,
    };
  }, [isStreaming, references]);
  return (
    <div className={`text-neutral-300 ${isStreaming ? 'streaming-message' : ''}`}>
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
    className="inline-block w-2 h-2 bg-white ml-1 align-middle rounded-full shadow-[0_0_15px_6px_rgba(255,255,255,0.4)]"
    aria-hidden
  />
);

/* ── Wrapper that uses typewriter for history msgs, cursor for streaming ── */
const TypewriterMarkdown = memo(({ msg, isStreaming, sendMessage, isTyping, user }) => {
  // Disable typewriter if message is from history
  const { displayed, done } = useTypewriter(msg.content, {
    speed: 120,
    enabled: !msg.isHistory,
  });

  const shownContent = displayed;
  const showCursor = isStreaming || !done;
  const showExtras = done || msg.isHistory; // Show buttons only when fully typed or if from history

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
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col"
          >
            {/* Escalation Banner directly after text */}
            {msg.escalation?.needed && <EscalationBanner escalation={msg.escalation} />}

            {/* Show References */}
            {msg.references?.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {msg.references.map((ref, i) => (
                  <a key={i} href={ref.url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-neutral-900 border border-white/5 text-[11px] text-neutral-400 hover:text-white transition-colors">
                    <Link2 size={10} /><span>{ref.title}</span>
                  </a>
                ))}
              </div>
            )}

            {/* Show Suggestions and LawyerSearchChip */}
            {!isStreaming && (msg.suggestions?.length > 0 || msg.escalation?.needed) && (
              <div className="flex flex-wrap gap-2 mt-3">
                {msg.escalation?.needed && user?.role !== 'lawyer' && <LawyerSearchChip category={msg.escalation.category} />}
                {msg.suggestions?.map((sug, i) => (
                  <button key={i} onClick={() => { if (!isTyping) sendMessage(sug); }} disabled={isTyping}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.05] text-neutral-300 hover:bg-white/[0.1] hover:text-white border border-white/5 transition-colors disabled:opacity-50">
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

  const isGenerating = isTyping || isStreaming;

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

  // Stop recognition if component unmounts
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

  // Use ResizeObserver to auto-scroll while text is typing/expanding
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
          
          if (Math.abs(distance) < 2) {
            el.scrollTop = targetScrollTop;
            return;
          }
          
          // Easing factor for buttery smooth follow-scroll
          el.scrollTop = currentScrollTop + distance * 0.25;
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
      // Use smooth scroll when a brand new message appears
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
      className="flex flex-col h-full bg-black relative w-full overflow-hidden"
      onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
    >
      {/* ── Living Background ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 flex items-center justify-center">
        <motion.div
          className="w-[700px] h-[700px] mix-blend-screen filter blur-[18px]"
          animate={{ scale: isGenerating ? [1, 1.12, 1.08, 1.14, 1] : [1, 1.04, 1], opacity: isGenerating ? [0.35, 0.65, 0.5, 0.7, 0.35] : [0.2, 0.35, 0.2] }}
          transition={{ duration: isGenerating ? 3 : 10, repeat: Infinity, ease: isGenerating ? "easeInOut" : "easeInOut" }}
        >
          <GenerativeArtScene isThinking={isGenerating} />
        </motion.div>

        {/* extra glow ring when generating */}
        <AnimatePresence>
          {isGenerating && (
            <motion.div
              key="glow-ring"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: [0, 0.15, 0], scale: [0.8, 1.4, 1.8] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
              className="absolute w-[400px] h-[400px] rounded-full border border-white/20"
              style={{ filter: 'blur(8px)' }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* ── Drag overlay ── */}
      <AnimatePresence>
        {isDragOver && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md border-2 border-dashed border-white/20 m-4 rounded-3xl">
            <div className="text-center">
              <FileText size={48} className="mx-auto text-white mb-4 opacity-50" />
              <h3 className="text-xl font-bold text-white">Отпустите файл здесь</h3>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Messages ── */}
      <div ref={scrollRef} onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-8 md:px-8 w-full max-w-4xl mx-auto custom-scrollbar relative z-10">
        <div className="flex flex-col space-y-8 min-h-full justify-end pb-4">
          <AnimatePresence mode="popLayout">
            {messages.length === 0 ? (
              <motion.div key="welcome"
                className="flex flex-col items-center justify-center h-full my-auto text-center"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.5, ease: 'easeOut' }}
              >
                {/* ── VaporizeText greeting ── */}
                <div className="w-12 h-12 rounded-xl bg-white text-black flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(255,255,255,0.15)]">
                  <Scale size={24} strokeWidth={2} />
                </div>

                <div className="w-full max-w-lg mb-2 text-center">
                  <motion.h2 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-2xl md:text-3xl font-black text-white tracking-tight"
                  >
                    Юридический ИИ-ассистент
                  </motion.h2>
                </div>

                <p className="text-neutral-500 max-w-sm mx-auto mb-10 text-sm leading-relaxed">
                  Задайте юридический вопрос, загрузите документ для анализа или попросите составить договор.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-xl">
                  {(user?.role === 'lawyer' ? [
                    { text: t('lawyer_suggestion_1'), icon: <Book size={16} /> },
                    { text: t('lawyer_suggestion_2'), icon: <FileText size={16} /> },
                    { text: t('lawyer_suggestion_3'), icon: <PenTool size={16} /> },
                    { text: t('lawyer_suggestion_4'), icon: <GitCompare size={16} /> },
                  ] : [
                    { text: t('chat_suggestion_1'), icon: <Users size={16} /> },
                    { text: t('chat_suggestion_2'), icon: <ShoppingBag size={16} /> },
                    { text: t('chat_suggestion_3'), icon: <Building size={16} /> },
                    { text: t('chat_suggestion_4'), icon: <Search size={16} /> },
                  ]).map((sug, i) => (
                    <motion.button key={i} onClick={() => sendMessage(sug.text)}
                      variants={suggestionVariants} initial="hidden" animate="visible" custom={i}
                      className="group flex items-center gap-3 p-4 bg-white/[0.04] border border-white/[0.07] rounded-2xl hover:bg-white/[0.08] hover:border-white/[0.12] transition-all duration-200 text-left"
                    >
                      <div className="text-neutral-500 group-hover:text-white transition-colors flex-shrink-0">{sug.icon}</div>
                      <span className="text-sm text-neutral-400 group-hover:text-white transition-colors font-medium leading-snug">{sug.text}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <>
                {messages.map((msg, index) => (
                  <motion.div key={msg.tempId || msg.id || index}
                    className={`flex flex-col w-full ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                    variants={msgVariants} initial="hidden" animate="visible"
                  >
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-2 px-1">
                        <div className="w-5 h-5 rounded bg-white text-black flex items-center justify-center">
                          <Scale size={12} />
                        </div>
                        <span className="text-[11px] font-bold text-white uppercase tracking-widest">LegalAI</span>
                      </div>
                    )}
                    <div className={`relative max-w-[85%] px-5 py-4 rounded-3xl text-[15px] ${
                      msg.role === 'user' ? 'bg-white text-black rounded-tr-sm' : 'bg-transparent text-white pl-8'
                    }`}>
                      {msg.role === 'user' ? (
                        <>
                          {msg.attached_document_id && (
                            <div className="flex items-center gap-2 mb-2 bg-black/10 w-fit px-3 py-1.5 rounded-xl border border-black/5">
                              <FileText size={14} className="text-black/70" />
                              <span className="text-xs font-medium truncate max-w-[200px]">{msg.attached_document_name || "Документ"}</span>
                            </div>
                          )}
                          <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
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
                  <motion.div className="flex justify-start w-full pl-8"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <AIWaveform label="Генерирую ответ..." />
                  </motion.div>
                )}
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Voice Feedback Overlay ── */}
      <AnimatePresence>
        {(isListening || voiceError) && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-28 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          >
            <div className="bg-[#111]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex flex-col items-center gap-3 min-w-[280px]">
              {voiceError ? (
                <>
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 mb-1">
                    <MicOff size={20} />
                  </div>
                  <p className="text-sm font-semibold text-red-400 text-center">{voiceError}</p>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center relative">
                    <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} className="absolute inset-0 rounded-full bg-red-500/20" />
                    <Mic size={20} className="text-red-400 relative z-10" />
                  </div>
                  <div className="text-center">
                    <p className="text-[13px] font-bold text-white mb-1">Слушаю вас...</p>
                    <p className="text-[11px] text-white/40">Нажмите «Стоп», чтобы добавить текст</p>
                  </div>
                  {interimTranscript && (
                    <div className="w-full mt-2 pt-2 border-t border-white/10 text-center">
                      <p className="text-xs text-white/60 italic leading-relaxed line-clamp-2">
                        "{interimTranscript}"
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════
          REDESIGNED INPUT AREA
      ════════════════════════════ */}
      <div className="px-4 pb-5 pt-2 w-full max-w-4xl mx-auto relative z-20">

        {/* Command palette */}
        <AnimatePresence>
          {showCommands && (
            <motion.div initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }} transition={{ duration: 0.18 }}
              className="absolute bottom-full left-4 right-4 md:left-0 md:right-0 mb-3 bg-[#111] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden z-50">
              <div className="px-4 py-2.5 border-b border-white/[0.05]">
                <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Быстрые команды</span>
              </div>
              <div className="p-1.5 flex flex-col gap-0.5 max-h-56 overflow-y-auto custom-scrollbar">
                {INLINE_COMMANDS.filter(c => c.prefix.toLowerCase().startsWith(input.toLowerCase())).map((cmd, i) => (
                  <button key={i} type="button"
                    onClick={() => { setInput(cmd.prefix + ' '); setShowCommands(false); textareaRef.current?.focus(); }}
                    onMouseEnter={() => setCommandIndex(i)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${commandIndex === i ? 'bg-white/[0.08] text-white' : 'text-neutral-400 hover:bg-white/[0.05]'}`}
                  >
                    <div className="p-1.5 rounded-lg bg-white/[0.06] text-white">{cmd.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold">{cmd.label}</div>
                      <div className="text-xs text-neutral-600">{cmd.description}</div>
                    </div>
                    <div className="text-[10px] font-mono bg-white/[0.06] px-2 py-0.5 rounded-lg text-neutral-500">{cmd.prefix}</div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main input card */}
        <motion.form onSubmit={handleSubmit}
          animate={{ borderColor: isFocused ? 'rgba(255,255,255,0.18)' : isGenerating ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.07)' }}
          transition={{ duration: 0.3 }}
          className="relative rounded-2xl border bg-[#0d0d0d] shadow-[0_8px_40px_rgba(0,0,0,0.6)] overflow-hidden"
          style={{ borderColor: 'rgba(255,255,255,0.07)' }}
        >
          {/* Attached file pill */}
          {attachedFile && (
            <div className="px-4 pt-3 pb-0">
              <div className="inline-flex items-center gap-2 bg-white/[0.07] border border-white/[0.08] px-3 py-1.5 rounded-xl">
                <FileText size={13} className="text-neutral-300" />
                <span className="text-xs font-medium text-neutral-200 truncate max-w-[220px]">{attachedFile.name}</span>
                <button type="button" onClick={() => setAttachedFile(null)} className="text-neutral-500 hover:text-white transition-colors ml-1">
                  <X size={13} />
                </button>
              </div>
            </div>
          )}

          {/* Textarea */}
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
              className="w-full bg-transparent border-none text-white placeholder-neutral-600 text-[15px] outline-none resize-none custom-scrollbar leading-relaxed"
            />
          </div>

          {/* Bottom toolbar */}
          <div className="flex items-center justify-between px-3 pb-3 pt-1">
            {/* Left actions */}
            <div className="flex items-center gap-1">
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".pdf,.docx,.doc,.txt" className="hidden" />

              {/* Slash command button */}
              <button type="button"
                onClick={() => { if (input.startsWith('/')) setShowCommands(false); else { setInput('/'); setShowCommands(true); textareaRef.current?.focus(); } }}
                title="Команды"
                className={`flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-medium transition-colors ${showCommands ? 'bg-white/10 text-white' : 'text-neutral-600 hover:text-neutral-300 hover:bg-white/[0.05]'}`}
              >
                <Command size={13} /><span className="hidden sm:block">Команды</span>
              </button>

              {/* Attach */}
              <button type="button" onClick={() => fileInputRef.current?.click()} title="Прикрепить файл"
                className={`flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-medium transition-colors ${attachedFile ? 'bg-white/10 text-white' : 'text-neutral-600 hover:text-neutral-300 hover:bg-white/[0.05]'}`}
              >
                <Paperclip size={13} /><span className="hidden sm:block">Файл</span>
              </button>

              {/* Mic */}
              <button type="button" onClick={toggleListening} title="Голосовой ввод"
                className={`flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-medium transition-all duration-200 ${
                  isListening
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.2)]'
                    : 'text-neutral-600 hover:text-neutral-300 hover:bg-white/[0.05]'
                }`}
              >
                {isListening
                  ? <><motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.8, repeat: Infinity }}><MicOff size={13} /></motion.div><span className="hidden sm:block">Стоп</span></>
                  : <><Mic size={13} /><span className="hidden sm:block">Голос</span></>
                }
              </button>
            </div>
            {/* Right — hint + send */}
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-neutral-700 hidden sm:block">Enter — отправить</span>
              <button type="submit" disabled={!canSend}
                className={`relative h-9 w-9 flex items-center justify-center rounded-xl transition-all duration-200 ${canSend ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] hover:bg-neutral-100 active:scale-95' : 'bg-white/[0.06] text-neutral-600'}`}
              >
                {isUploadingFile
                  ? <Loader2 size={15} className="animate-spin" />
                  : isGenerating
                    ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                        <Loader2 size={15} />
                      </motion.div>
                    : <ArrowUp size={15} strokeWidth={2.5} />
                }
              </button>
            </div>
          </div>

          {/* ── Animated bottom glow when generating ── */}
          {isGenerating && (
            <motion.div
              key="glow-entry"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="absolute bottom-0 left-0 right-0 h-[1px] pointer-events-none"
            >
              <div
                className="absolute inset-0 h-full bg-gradient-to-r from-transparent via-white/35 to-transparent"
                style={{ animation: 'glowSweep 2s ease-in-out infinite' }}
              />
            </motion.div>
          )}

          {/* ── Voice recording overlay ── */}
          <AnimatePresence>
            {(isListening || voiceError) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                className="absolute bottom-[calc(100%+16px)] left-1/2 -translate-x-1/2 w-[320px] rounded-3xl z-50 flex flex-col items-center justify-center gap-5 bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/10 shadow-2xl p-6"
              >
                {/* Visualizer rings */}
                {!voiceError && (
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <motion.div
                      className="absolute inset-0 rounded-full border border-white/20"
                      animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    />
                    <motion.div
                      className="absolute inset-2 rounded-full border border-white/40"
                      animate={{ scale: [1, 1.3, 1], opacity: [1, 0, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear', delay: 0.2 }}
                    />
                    <Mic className="text-white relative z-10" size={24} />
                  </div>
                )}
                
                {/* Interim transcript or prompt */}
                <div className="text-sm font-medium text-center text-white/80 min-h-[40px] flex items-center justify-center">
                  {!voiceError ? (
                    interimTranscript || (voiceLang === 'kk-KZ' ? 'Сөйлеңіз...' : 'Говорите...')
                  ) : null}
                </div>

                {/* Controls */}
                <div className="flex gap-3 w-full">
                  {!voiceError && (
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); setVoiceLang(prev => prev === 'ru-RU' ? 'kk-KZ' : 'ru-RU'); }}
                      className="flex-1 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-medium text-white/70 transition-colors"
                    >
                      {voiceLang === 'ru-RU' ? '🇷🇺 RU' : '🇰🇿 KZ'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setVoiceError(null); toggleListening(); }}
                    className="flex-1 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-medium transition-colors border border-red-500/20"
                  >
                    {isListening ? 'Стоп' : 'Закрыть'}
                  </button>
                </div>

                {/* Voice error */}
                {voiceError && (
                  <div className="flex flex-col items-center gap-2 mt-2 w-full">
                    <p className="text-red-400/90 text-xs text-center">{voiceError}</p>
                    <button type="button" onClick={() => setVoiceError(null)} className="mt-2 w-full py-2 bg-white/[0.05] rounded-xl text-xs hover:bg-white/[0.1] transition-colors border border-white/5">Закрыть ошибку</button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.form>

        <p className="text-center text-[10px] text-neutral-700 mt-2.5">
          LegalAI может допускать ошибки. Проконсультируйтесь с юристом по важным вопросам.
        </p>
      </div>
    </div>
  );
}
