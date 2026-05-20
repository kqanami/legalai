import React, { useState, useRef, useEffect, memo, useCallback, Children, useMemo } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { useLanguage } from '../i18n/LanguageContext';
import { useChat } from '../contexts/ChatContext';
import AIWaveform from '../components/AIWaveform';
import MagneticButton from '../components/MagneticButton';
import { chatApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Scale, Settings2, Home, Building2, Link2, Download, ChevronRight, Search, Phone, UserCheck, Shield, Star, Mic, MicOff, ExternalLink, BookOpen, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, ShoppingBag, Building, FileText, Book, PenTool, GitCompare } from 'lucide-react';

/* ── Interactive Citation Tooltip ── */
function CitationTooltip({ text, reference }) {
  const [show, setShow] = useState(false);
  const timeoutRef = useRef(null);

  const handleEnter = () => {
    clearTimeout(timeoutRef.current);
    setShow(true);
  };
  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => setShow(false), 200);
  };

  return (
    <span className="relative inline-block" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-md text-xs font-semibold cursor-pointer transition-all duration-200 bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 hover:bg-indigo-500/25 hover:border-indigo-400/40 hover:shadow-[0_0_12px_rgba(99,102,241,0.2)]"
        onClick={() => reference?.url && window.open(reference.url, '_blank')}
      >
        <BookOpen size={10} className="flex-shrink-0" />
        {text}
      </span>
      <AnimatePresence>
        {show && reference && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-72 pointer-events-auto"
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
          >
            <div className="bg-obsidian-900/95 backdrop-blur-xl border border-white/[0.1] rounded-xl p-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.6),0_0_20px_rgba(99,102,241,0.1)]">
              <div className="flex items-start gap-2.5 mb-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <BookOpen size={13} className="text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white leading-snug mb-0.5">{reference.title}</p>
                  {reference.snippet && (
                    <p className="text-[10px] text-steel-400 leading-relaxed line-clamp-3">{reference.snippet}</p>
                  )}
                </div>
              </div>
              {reference.url && (
                <a
                  href={reference.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors pt-2 border-t border-white/[0.06]"
                >
                  <ExternalLink size={10} />
                  Открыть на adilet.zan.kz
                </a>
              )}
            </div>
            {/* Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] w-3 h-3 bg-obsidian-900/95 border-r border-b border-white/[0.1] rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

const msgVariants = {
  hidden: { opacity: 0, filter: 'blur(8px)', y: 12, scale: 0.98 },
  visible: {
    opacity: 1,
    filter: 'blur(0px)',
    y: 0,
    scale: 1,
    transition: { 
      duration: 0.5, 
      ease: [0.19, 1, 0.22, 1] 
    },
  },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const suggestionVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.2 + i * 0.05, duration: 0.4, ease: 'easeOut' },
  }),
};

/* ── Premium Escalation Card ── */
function EscalationBanner({ escalation }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  if (!escalation || !escalation.needed || user?.role === 'lawyer') return null;

  const category = escalation.category || 'Юридическая консультация';
  const lawyerSearchUrl = `/lawyers?specialization=${encodeURIComponent(category)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.94, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
      className="mt-6 relative"
    >
      {/* Animated shimmer border glow */}
      <div 
        className="absolute -inset-[1px] rounded-2xl opacity-60 pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(245,158,11,0.4) 25%, rgba(251,191,36,0.6) 50%, rgba(245,158,11,0.4) 75%, transparent 100%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer-border 3s linear infinite',
        }}
      />
      
      {/* Card body */}
      <div className="relative rounded-2xl overflow-hidden" style={{
        background: 'linear-gradient(145deg, rgba(245,158,11,0.06) 0%, rgba(11,13,20,0.95) 40%, rgba(11,13,20,0.98) 100%)',
        border: '1px solid rgba(245,158,11,0.2)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 0 30px rgba(245,158,11,0.05)',
      }}>
        {/* Top accent line */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />
        
        <div className="p-5">
          {/* Header */}
          <div className="flex items-start gap-4 mb-4">
            {/* Animated icon with pulse ring */}
            <div className="relative flex-shrink-0">
              <motion.div
                className="absolute inset-0 rounded-xl bg-amber-500/20"
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{ borderRadius: '14px' }}
              />
              <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/25 to-amber-600/10 border border-amber-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.15)]">
                <Scale size={22} className="text-amber-400" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <h4 className="text-sm font-bold text-amber-400">Рекомендуется помощь адвоката</h4>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Shield size={8} /> {category}
                </span>
              </div>
              <p className="text-xs text-steel-300 leading-relaxed">{escalation.reason}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            <motion.button
              onClick={() => navigate(lawyerSearchUrl)}
              className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-bold transition-all"
              style={{
                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                color: '#0B0D14',
                boxShadow: '0 4px 16px rgba(245,158,11,0.25), 0 0 20px rgba(245,158,11,0.1)',
              }}
              whileHover={{ scale: 1.03, boxShadow: '0 6px 24px rgba(245,158,11,0.35), 0 0 30px rgba(245,158,11,0.15)' }}
              whileTap={{ scale: 0.97 }}
            >
              <Search size={14} />
              Найти юриста
              <ChevronRight size={14} />
            </motion.button>
            
            <motion.button
              onClick={() => navigate(lawyerSearchUrl)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border border-amber-500/25 text-amber-400 transition-all"
              style={{
                background: 'rgba(245,158,11,0.05)',
                backdropFilter: 'blur(8px)',
              }}
              whileHover={{ 
                scale: 1.03, 
                borderColor: 'rgba(245,158,11,0.5)',
                background: 'rgba(245,158,11,0.1)',
              }}
              whileTap={{ scale: 0.97 }}
            >
              <Phone size={13} />
              Связаться с адвокатом
            </motion.button>
          </div>

          {/* Bottom info */}
          <div className="mt-4 pt-3 border-t border-amber-500/10 flex items-center gap-4 text-[10px] text-steel-500">
            <span className="flex items-center gap-1">
              <UserCheck size={10} className="text-emerald-400" /> Верифицированные юристы
            </span>
            <span className="flex items-center gap-1">
              <Star size={10} className="text-amber-400" /> Топ рейтинг
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Lawyer Search Chip (for suggestion bar) ── */
function LawyerSearchChip({ category }) {
  const navigate = useNavigate();
  const searchUrl = `/lawyers?specialization=${encodeURIComponent(category || '')}`;
  
  return (
    <motion.button
      onClick={() => navigate(searchUrl)}
      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all"
      style={{
        background: 'rgba(245,158,11,0.08)',
        border: '1px solid rgba(245,158,11,0.25)',
        color: '#F59E0B',
        boxShadow: '0 2px 8px rgba(245,158,11,0.08)',
      }}
      initial={{ opacity: 0, y: 6, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.1, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ 
        scale: 1.03,
        borderColor: 'rgba(245,158,11,0.5)',
        boxShadow: '0 4px 16px rgba(245,158,11,0.15), 0 0 12px rgba(245,158,11,0.08)',
        background: 'rgba(245,158,11,0.12)',
      }}
      whileTap={{ scale: 0.97 }}
    >
      <Search size={12} />
      Найти адвоката
      <ChevronRight size={12} />
    </motion.button>
  );
}

const MarkdownRenderer = memo(({ content, isStreaming = false, references = [] }) => {
  const normalizeMarkdown = (text) => {
    if (!text) return '';
    return text
      .replace(/([а-яё])([А-ЯЁ])/g, '$1\n\n$2')
      .replace(/([А-Яа-яЁё])(\d+)/g, '$1 $2')
      .replace(/^(#+)([^\s#])/gm, '$1 $2')
      .replace(/^(#+.+)$(?!\n\n)/gm, '$1\n\n')
      .replace(/([^\n])(###\s)/g, '$1\n\n$2');
  };

  const cleanText = (text) => {
    const raw = text
      .split('[REFS]')[0]
      .split('[SEGMENT]')[0]
      .split('[ESCALATION]')[0]
      .split('[SUGGESTIONS]')[0]
      .split('<!--REFS-->')[0]
      .split('<!--SEGMENT-->')[0]
      .split('<!--ESCALATION-->')[0]
      .split('<!--SUGGESTIONS-->')[0]
      .trim();
    return normalizeMarkdown(raw);
  };

  const autoCloseMarkdown = (text) => {
    if (!isStreaming) return text;
    
    let closed = text;
    
    // Auto-close code blocks: ```
    const codeBlockCount = (closed.match(/```/g) || []).length;
    if (codeBlockCount % 2 !== 0) {
      closed += '\n```';
    }
    
    // Auto-close inline code: `
    const cleanForInlineCode = closed.replace(/```[\s\S]*?```/g, '');
    const inlineCodeCount = (cleanForInlineCode.match(/`/g) || []).length;
    if (inlineCodeCount % 2 !== 0) {
      closed += '`';
    }
    
    // Auto-close bold: **
    const cleanForBold = cleanForInlineCode.replace(/`[\s\S]*?`/g, '');
    const boldCount = (cleanForBold.match(/\*\*/g) || []).length;
    if (boldCount % 2 !== 0) {
      closed += '**';
    }
    
    // Auto-close italic: *
    const cleanForItalic = cleanForBold.replace(/\*\*/g, '');
    const italicCount = (cleanForItalic.match(/\*/g) || []).length;
    if (italicCount % 2 !== 0) {
      closed += '*';
    }
    
    return closed;
  };

  // Parse inline law article references and inject CitationTooltip components
  const injectCitations = (textNode) => {
    if (typeof textNode !== 'string') return textNode;
    const citationRegex = /((?:[пч]\.\s*\d+\s+)?(?:ст\.(?:ст\.)?|стать[ияюейях]+)\s*\d+(?:[\s,.-]*\d+)*(?:\s+(?:ТК|ГК|УК|КоАП|НК|ГПК|УПК|ЗРК|Закона|Конституци[ияюей]+)(?:\s+РК)?)?)/gi;
    
    const parts = textNode.split(citationRegex);
    if (parts.length <= 1) return textNode;

    return parts.map((part, idx) => {
      if (citationRegex.test(part)) {
        citationRegex.lastIndex = 0;
        const matchedRef = references.find(r =>
          r.title && (part.toLowerCase().includes(r.title.toLowerCase().slice(0, 10)) ||
          r.title.toLowerCase().includes(part.toLowerCase().slice(0, 10)))
        ) || (references.length > 0 ? references[0] : null);

        return (
          <CitationTooltip
            key={idx}
            text={part}
            reference={matchedRef || { title: part, snippet: 'Нажмите для поиска в базе законов РК', url: `https://adilet.zan.kz/rus/search?q=${encodeURIComponent(part)}` }}
          />
        );
      }
      citationRegex.lastIndex = 0;
      return part;
    });
  };

  const components = React.useMemo(() => {
    const WithCitations = ({ children }) => {
      if (isStreaming) return <>{children}</>;
      return <>{Children.map(children, child => {
        if (typeof child === 'string') return injectCitations(child);
        return child;
      })}</>;
    };

    return {
      p: ({ children }) => <p><WithCitations>{children}</WithCitations></p>,
      li: ({ children }) => <li><WithCitations>{children}</WithCitations></li>,
      strong: ({ children }) => <strong className="font-bold text-chrome-100 drop-shadow-sm"><WithCitations>{children}</WithCitations></strong>,
      em: ({ children }) => <em className="text-steel-300 not-italic"><WithCitations>{children}</WithCitations></em>,
      h1: ({ children }) => <h1>{children}</h1>,
      h2: ({ children }) => <h2>{children}</h2>,
      h3: ({ children }) => <h3>{children}</h3>,
    };
  }, [isStreaming, references]);

  return (
    <div className={`markdown-content ${isStreaming ? 'streaming-message' : ''}`}>
      <ReactMarkdown components={components}>
        {isStreaming ? autoCloseMarkdown(cleanText(content)) : cleanText(content)}
      </ReactMarkdown>
    </div>
  );
});

const detectLanguage = (text) => {
  const queryLower = text.toLowerCase();
  
  // 1. Check for Kazakh-specific Cyrillic letters
  const kazakhSpecific = /[әғқңөұүһі]/;
  if (kazakhSpecific.test(queryLower)) {
    return 'kz';
  }
  
  // 2. Check for common Kazakh keywords
  const kzKeywords = [
    'мен', 'сен', 'біз', 'сіз', 'олар', 'және', 'үшін', 'бар', 'жоқ', 
    'болады', 'керек', 'қандай', 'қалай', 'неге', 'қашан', 'рахмет',
    'биз', 'сиз', 'жане', 'ушин', 'жок', 'кандай', 'калай', 'кашан',
    'салем', 'кайырлы', 'кун', 'кеш', 'таң', 'жаксы', 'жаман', 'калайсын',
    'маган', 'саган', 'бизге', 'сизге', 'оларга', 'барма', 'жокпа'
  ];
  
  const words = queryLower.match(/[а-яёәғқңөұүһі]+/g) || [];
  const kzWordMatch = words.filter(word => kzKeywords.includes(word)).length;
  
  if (kzWordMatch >= 1) {
    return 'kz';
  }
  
  return 'ru';
};

export default function ChatPage() {
  const { t, lang, switchLanguage } = useLanguage();
  const { messages, isTyping, isStreaming, currentSegment, sendMessage: sendChatMessage, sessionId } = useChat();
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const scrollRef = useRef(null);
  const isAutoScrollActive = useRef(true);
  const lastMsgCount = useRef(0);

  const sendMessage = useCallback((text) => {
    if (messages.length === 0) {
      const detectedLang = detectLanguage(text);
      switchLanguage(detectedLang);
    }
    sendChatMessage(text);
  }, [messages.length, sendChatMessage, switchLanguage]);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // ── Voice Input (Speech-to-Text) via Groq Whisper API ──
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Select best supported MIME type for the browser
      let options = {};
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' };
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        options = { mimeType: 'audio/ogg' };
      } else if (MediaRecorder.isTypeSupported('audio/wav')) {
        options = { mimeType: 'audio/wav' };
      }
      
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const fileExt = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : mimeType.includes('wav') ? 'wav' : 'webm';
        const audioFile = new File([audioBlob], `recording.${fileExt}`, { type: mimeType });
        
        setIsTranscribing(true);
        try {
          const res = await chatApi.transcribeAudio(audioFile);
          if (res && res.text) {
            setInput(prev => {
              const currentInput = prev.trim();
              return currentInput ? `${currentInput} ${res.text}` : res.text;
            });
          }
        } catch (e) {
          console.error('Transcription error:', e);
          alert('Ошибка распознавания: ' + e.message);
        } finally {
          setIsTranscribing(false);
        }
        
        // Stop and release microhpone tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsListening(true);
    } catch (e) {
      console.error('Microphone access error:', e);
      alert('Не удалось получить доступ к микрофону. Пожалуйста, разрешите его использование в настройках браузера.');
      setIsListening(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsListening(false);
  };

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isListening]);

  // Advanced smooth scroll logic (Grok-style)
  const scrollToBottom = useCallback((instant = false) => {
    if (!scrollRef.current || !isAutoScrollActive.current) return;
    
    const scrollContainer = scrollRef.current;
    const targetScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
    
    if (instant) {
      scrollContainer.scrollTop = targetScroll;
    } else {
      scrollContainer.scrollTo({
        top: targetScroll,
        behavior: 'smooth'
      });
    }
  }, []);

  // Detect manual scroll to disable/enable auto-scroll
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    isAutoScrollActive.current = isAtBottom;
  };

  useEffect(() => {
    if (messages.length > lastMsgCount.current) {
      // New message added
      isAutoScrollActive.current = true;
      scrollToBottom(true); // Fast jump for new messages
      lastMsgCount.current = messages.length;
    } else if (isTyping || (messages.length > 0 && messages[messages.length-1].role === 'assistant')) {
      // Streaming update - absolutely NO smooth scroll here, too slow
      scrollToBottom(true);
    }
  }, [messages, isTyping, scrollToBottom]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;
    sendMessage(input.trim());
    setInput('');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-obsidian-950/50">
      {/* Messages area */}
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-8 space-y-8 custom-scrollbar"
      >
        <AnimatePresence mode="popLayout">
          {messages.length === 0 ? (
            <motion.div
              key="welcome"
              className="flex flex-col items-center justify-center min-h-full text-center px-4 relative"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
              transition={{ duration: 0.4 }}
            >
              {/* Background Aura */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center z-0">
                <motion.div 
                  className="w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] rounded-full opacity-20 blur-[100px]"
                  style={{
                    background: 'radial-gradient(circle, rgba(148,163,184,0.4) 0%, rgba(148,163,184,0) 70%)'
                  }}
                  animate={{ 
                    scale: [1, 1.15, 1],
                    opacity: [0.1, 0.2, 0.1]
                  }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>

              {/* Floating Logo */}
              <motion.div
                className="relative z-10 mb-8"
                animate={{ y: [-8, 8, -8] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-[2rem] bg-gradient-to-br from-slate-500/10 to-obsidian-900 border border-slate-500/20 flex items-center justify-center shadow-[0_0_50px_rgba(148,163,184,0.15)] backdrop-blur-xl group cursor-default">
                  <div className="absolute inset-0 bg-slate-500/5 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <Scale size={48} className="text-slate-400 drop-shadow-[0_0_15px_rgba(148,163,184,0.3)]" strokeWidth={1.5} />
                </div>
              </motion.div>

              <motion.h2
                className="text-4xl sm:text-5xl font-black text-white mb-4 tracking-tight relative z-10"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 100 }}
              >
                AI-<span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-300 to-slate-500">LEGAL</span> KZ
              </motion.h2>
              <motion.p
                className="text-steel-400 max-w-lg mb-12 text-sm sm:text-base leading-relaxed relative z-10"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
              >
                {user?.role === 'lawyer' ? t('lawyer_welcome') : t('chat_welcome')}
              </motion.p>

              {/* Suggestions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-3xl relative z-10">
                {(user?.role === 'lawyer' ? [
                  { text: t('lawyer_suggestion_1'), icon: <Book size={20} /> },
                  { text: t('lawyer_suggestion_2'), icon: <FileText size={20} /> },
                  { text: t('lawyer_suggestion_3'), icon: <PenTool size={20} /> },
                  { text: t('lawyer_suggestion_4'), icon: <GitCompare size={20} /> }
                ] : [
                  { text: t('chat_suggestion_1'), icon: <Users size={20} /> },
                  { text: t('chat_suggestion_2'), icon: <ShoppingBag size={20} /> },
                  { text: t('chat_suggestion_3'), icon: <Building size={20} /> },
                  { text: t('chat_suggestion_4'), icon: <Search size={20} /> }
                ]).map((sug, i) => (
                  <motion.button
                    key={i}
                    onClick={() => sendMessage(sug.text)}
                    className="group relative overflow-hidden rounded-2xl bg-obsidian-900/40 border border-white/[0.05] p-5 text-left transition-all hover:border-slate-500/30 hover:bg-obsidian-800/80 hover:shadow-[0_8px_30px_rgba(148,163,184,0.1)] backdrop-blur-sm flex items-start gap-4"
                    variants={suggestionVariants}
                    initial="hidden"
                    animate="visible"
                    custom={i}
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-500/0 via-slate-500/0 to-slate-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    <div className="w-10 h-10 rounded-xl bg-slate-500/10 border border-slate-500/20 flex items-center justify-center flex-shrink-0 text-slate-400 group-hover:scale-110 group-hover:bg-slate-400 group-hover:text-obsidian-950 transition-all duration-300 shadow-[0_0_15px_rgba(148,163,184,0.1)]">
                      {sug.icon}
                    </div>
                    
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-sm font-medium text-steel-300 group-hover:text-white transition-colors leading-relaxed">
                        {sug.text}
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <>
              {messages.map((msg, index) => (
                <motion.div
                  key={msg.id || index}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} w-full gap-2`}
                  variants={msgVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}>
                    {msg.segment && msg.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-obsidian-600/30">
                        <span className="segment-b2c text-[10px]">
                          {msg.segment === 'b2c' ? <Home size={10} /> : <Building2 size={10} />} 
                          {msg.segment.toUpperCase()} — INTELLIGENCE
                        </span>
                      </div>
                    )}
                    
                    {msg.role === 'user' ? (
                      <p className="text-sm font-semibold leading-relaxed">{msg.content}</p>
                    ) : (
                      <MarkdownRenderer 
                        content={msg.content} 
                        isStreaming={isStreaming && index === messages.length - 1}
                        references={msg.references || []} 
                      />
                    )}

                    {msg.references && msg.references.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-obsidian-700/50 space-y-1.5">
                        {msg.references.map((ref, i) => (
                          <a key={i} href={ref.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[11px] text-chrome-400 hover:text-white transition-colors">
                            <Link2 size={11} /> <span>{ref.title}</span>
                          </a>
                        ))}
                      </div>
                    )}

                    {msg.escalation && msg.escalation.needed && (
                      <EscalationBanner escalation={msg.escalation} />
                    )}
                  </div>

                  {/* Clickable Quick Reply Suggestions Chips + Lawyer Search */}
                  {msg.role === 'assistant' && !isStreaming && (msg.suggestions?.length > 0 || (msg.escalation && msg.escalation.needed)) && (
                    <motion.div 
                      className="flex flex-wrap gap-2 mt-2 ml-1"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    >
                      {/* Lawyer Search chip (amber accent) when escalation detected */}
                      {msg.escalation && msg.escalation.needed && user?.role !== 'lawyer' && (
                        <LawyerSearchChip category={msg.escalation.category} />
                      )}
                      
                      {/* Regular suggestion chips */}
                      {msg.suggestions?.map((sug, i) => (
                        <motion.button
                          key={i}
                          onClick={() => {
                            if (isTyping) return;
                            sendMessage(sug);
                          }}
                          disabled={isTyping}
                          className="ai-suggestion-chip disabled:opacity-40 disabled:pointer-events-none"
                          initial={{ opacity: 0, y: 6, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ delay: 0.2 + i * 0.07, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        >
                          <span className="text-chrome-500 text-[10px]">→</span>
                          {sug}
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </motion.div>
              ))}

              {isTyping && (
                <motion.div
                  className="flex justify-start w-full"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="w-full max-w-md opacity-90 origin-left">
                    <AIWaveform label="Анализирую документы..." />
                  </div>
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>
        <div className="h-4" />
      </div>

      {/* Input area */}
      <div className="px-4 pb-8 pt-4">
        <form 
          onSubmit={handleSubmit}
          className="max-w-4xl mx-auto relative group glow-input-container"
        >
          <div className="absolute -inset-0.5 bg-gradient-to-r from-chrome-500/20 to-chrome-300/20 rounded-2xl blur opacity-30 group-focus-within:opacity-60 transition duration-500" />
          
          <div className="relative flex items-center justify-between bg-obsidian-900 border border-obsidian-700 rounded-2xl p-2.5 shadow-2xl min-h-[56px] overflow-hidden">
            {isListening ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="flex items-center justify-between w-full px-3 py-2 bg-rose-500/10 border border-rose-500/30 rounded-xl shadow-[0_0_20px_rgba(244,63,94,0.15),_inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-md"
              >
                <div className="flex items-center gap-3">
                  {/* Glowing recording indicator */}
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 shadow-[0_0_10px_#f43f5e]"></span>
                  </span>
                  <div>
                    <p className="text-sm font-bold text-white tracking-wide animate-pulse">{t('mic_listening')}</p>
                    <p className="text-[10px] text-rose-300/80 tracking-wide">{t('mic_instructions')}</p>
                  </div>
                </div>

                {/* Animated waves */}
                <div className="hidden sm:flex items-center gap-1.5 h-6 px-4">
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-1 bg-rose-400 rounded-full shadow-[0_0_6px_rgba(244,63,94,0.5)]"
                      animate={{
                        height: [6, 20, 6]
                      }}
                      transition={{
                        duration: 0.5 + i * 0.1,
                        repeat: Infinity,
                        repeatType: "reverse",
                        ease: "easeInOut"
                      }}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  {/* Cancel recording button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                        mediaRecorderRef.current.onstop = null; // remove callback to prevent transcribing
                        mediaRecorderRef.current.stop();
                        if (mediaRecorderRef.current.stream) {
                          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
                        }
                      }
                      setIsListening(false);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-steel-400 hover:text-white hover:bg-white/5 transition-all"
                  >
                    {t('mic_cancel')}
                  </button>

                  {/* Stop and transpile button */}
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-bold text-xs rounded-xl shadow-[0_4px_12px_rgba(244,63,94,0.3)] transition-all transform active:scale-95"
                  >
                    <MicOff size={13} />
                    {t('mic_done')}
                  </button>
                </div>
              </motion.div>
            ) : (
              <>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  placeholder="Спросите о законах РК или загрузите договор..."
                  rows={1}
                  className="flex-1 bg-transparent border-none text-white placeholder-steel-600 text-sm py-2 pl-2.5 outline-none resize-none max-h-32"
                />
                
                <div className="flex items-center gap-2 pr-1 pb-1">
                  {sessionId && messages.length > 0 && (
                    <button
                      type="button"
                      onClick={() => chatApi.exportSession(sessionId)}
                      className="p-2.5 rounded-xl text-steel-500 hover:text-chrome-300 hover:bg-white/5 transition-all"
                    >
                      <Download size={18} />
                    </button>
                  )}
                  
                  {/* Voice Input Button */}
                  <button
                    type="button"
                    onClick={toggleListening}
                    disabled={isTranscribing}
                    className={`relative p-2.5 rounded-xl transition-all ${
                      isTranscribing
                        ? 'text-indigo-400 cursor-not-allowed'
                        : 'text-steel-500 hover:text-chrome-300 hover:bg-white/5'
                    }`}
                    title={isTranscribing ? t('mic_loading') : t('mic_title')}
                  >
                    {isTranscribing ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Mic size={18} />
                    )}
                  </button>

                  <button
                    type="submit"
                    disabled={!input.trim() || isTyping}
                    className="p-2.5 rounded-xl bg-white text-obsidian-950 hover:bg-chrome-100 disabled:opacity-20 disabled:grayscale transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                  >
                    <ArrowUpIcon />
                  </button>
                </div>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function ArrowUpIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>
    </svg>
  );
}
