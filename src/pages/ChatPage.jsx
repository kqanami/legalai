import { useState, useRef, useEffect, memo, useCallback, Children } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { useLanguage } from '../i18n/LanguageContext';
import { useChat } from '../contexts/ChatContext';
import AIWaveform from '../components/AIWaveform';
import MagneticButton from '../components/MagneticButton';
import { chatApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Scale, Settings2, Home, Building2, Link2, Download, ChevronRight, Search, Phone, UserCheck, Shield, Star } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, ShoppingBag, Building, FileText, Book, PenTool, GitCompare } from 'lucide-react';

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

const AnimateWords = memo(({ text }) => {
  const segments = text.split(/(\s+)/);
  return (
    <>
      {segments.map((segment, index) => {
        if (segment === '') return null;
        if (/^\s+$/.test(segment)) {
          return <span key={`${index}-space`} className="white-space-segment">{segment}</span>;
        }
        return (
          <span key={`${index}-${segment}`} className="word-fade-in">
            {segment}
          </span>
        );
      })}
    </>
  );
});

const WordTypewriter = memo(({ children, animate }) => {
  if (!animate || typeof children !== 'string') {
    return <span>{children}</span>;
  }

  // If the text is short, animate the whole thing
  if (children.length <= 60) {
    return <AnimateWords text={children} />;
  }

  // Otherwise, split it: render stable part statically, and animate only the tail!
  const stableLimit = children.length - 50;
  // Find the last space before the stable limit to avoid splitting a word in half
  const lastSpace = children.lastIndexOf(' ', stableLimit);
  
  if (lastSpace === -1 || lastSpace < 15) {
    return <AnimateWords text={children} />;
  }

  const stableText = children.slice(0, lastSpace);
  const tailText = children.slice(lastSpace);

  return (
    <>
      <span>{stableText}</span>
      <AnimateWords text={tailText} />
    </>
  );
});

function WordTypewriterWrapper({ children, animate }) {
  if (!animate) return children;
  
  return Children.map(children, (child) => {
    if (typeof child === 'string') {
      return <WordTypewriter animate={animate}>{child}</WordTypewriter>;
    }
    return child;
  });
}

const MarkdownRenderer = memo(({ content, isStreaming = false }) => {
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

  const components = {
    p: ({ children }) => <p><WordTypewriterWrapper animate={isStreaming}>{children}</WordTypewriterWrapper></p>,
    li: ({ children }) => <li><WordTypewriterWrapper animate={isStreaming}>{children}</WordTypewriterWrapper></li>,
    h1: ({ children }) => <h1><WordTypewriterWrapper animate={isStreaming}>{children}</WordTypewriterWrapper></h1>,
    h2: ({ children }) => <h2><WordTypewriterWrapper animate={isStreaming}>{children}</WordTypewriterWrapper></h2>,
    h3: ({ children }) => <h3><WordTypewriterWrapper animate={isStreaming}>{children}</WordTypewriterWrapper></h3>,
  };

  return (
    <div className={`markdown-content ${isStreaming ? 'streaming-message' : ''}`}>
      {isStreaming ? (
        <ReactMarkdown components={components}>{cleanText(content)}</ReactMarkdown>
      ) : (
        <ReactMarkdown>{cleanText(content)}</ReactMarkdown>
      )}
    </div>
  );
});

export default function ChatPage() {
  const { t } = useLanguage();
  const { messages, isTyping, isStreaming, currentSegment, sendMessage, sessionId } = useChat();
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);
  const isAutoScrollActive = useRef(true);
  const lastMsgCount = useRef(0);

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
          className="max-w-4xl mx-auto relative group"
        >
          <div className="absolute -inset-0.5 bg-gradient-to-r from-chrome-500/20 to-chrome-300/20 rounded-2xl blur opacity-30 group-focus-within:opacity-60 transition duration-500" />
          
          <div className="relative flex items-end gap-3 bg-obsidian-900 border border-obsidian-700 rounded-2xl p-2 pl-4 shadow-2xl">
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
              className="flex-1 bg-transparent border-none text-white placeholder-steel-600 text-sm py-3 outline-none resize-none max-h-32"
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
              
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="p-2.5 rounded-xl bg-white text-obsidian-950 hover:bg-chrome-100 disabled:opacity-20 disabled:grayscale transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)]"
              >
                <ArrowUpIcon />
              </button>
            </div>
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
