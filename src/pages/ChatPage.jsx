import { useState, useRef, useEffect, memo, useCallback, Children } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { useLanguage } from '../i18n/LanguageContext';
import { useChat } from '../contexts/ChatContext';
import AIWaveform from '../components/AIWaveform';
import MagneticButton from '../components/MagneticButton';
import AnimatedText from '../components/AnimatedText';
import { chatApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Scale, Settings2, Home, Building2, Link2, Download, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

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

/* ── Escalation Banner ── */
function EscalationBanner({ escalation }) {
  const { user } = useAuth();
  if (!escalation || !escalation.needed || user?.role === 'lawyer') return null;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mt-6 p-5 rounded-xl border border-amber-500/30 bg-amber-500/5 relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 flex-shrink-0">
          <Scale size={20} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-amber-500 mb-1">Рекомендуется помощь адвоката</h4>
          <p className="text-xs text-amber-500/80 mb-3">{escalation.reason}</p>
          <Link
            to={`/lawyers?specialization=${encodeURIComponent(escalation.category || '')}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-obsidian-950 text-xs font-bold hover:bg-amber-400 transition-colors"
          >
            Найти юриста ({escalation.category}) <ChevronRight size={14} />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

const MarkdownRenderer = memo(({ content, animate = false }) => {
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
      .split('<!--REFS-->')[0]
      .split('<!--SEGMENT-->')[0]
      .split('<!--ESCALATION-->')[0]
      .trim();
    return normalizeMarkdown(raw);
  };

  const components = {
    p: ({ children }) => <p><TypewriterWrapper animate={animate}>{children}</TypewriterWrapper></p>,
    li: ({ children }) => <li><TypewriterWrapper animate={animate}>{children}</TypewriterWrapper></li>,
    h1: ({ children }) => <h1><TypewriterWrapper animate={animate}>{children}</TypewriterWrapper></h1>,
    h2: ({ children }) => <h2><TypewriterWrapper animate={animate}>{children}</TypewriterWrapper></h2>,
    h3: ({ children }) => <h3><TypewriterWrapper animate={animate}>{children}</TypewriterWrapper></h3>,
  };

  return (
    <div className="markdown-content">
      <ReactMarkdown components={components}>{cleanText(content)}</ReactMarkdown>
    </div>
  );
});

function TypewriterWrapper({ children, animate }) {
  return Children.map(children, (child) => {
    if (typeof child === 'string') {
      return <AnimatedText animate={animate}>{child}</AnimatedText>;
    }
    return child;
  });
}

export default function ChatPage() {
  const { t } = useLanguage();
  const { messages, isTyping, currentSegment, sendMessage, sessionId } = useChat();
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
        className="flex-1 overflow-y-auto px-4 py-8 space-y-8 custom-scrollbar scroll-smooth"
      >
        <AnimatePresence mode="popLayout">
          {messages.length === 0 ? (
            <motion.div
              key="welcome"
              className="flex flex-col items-center justify-center min-h-full text-center px-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="relative w-20 h-20 mb-10"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="absolute inset-0 rounded-2xl chrome-gradient shadow-[0_0_50px_rgba(255,255,255,0.1)] opacity-70" />
                <div className="absolute inset-[2px] rounded-[14px] bg-obsidian-900 flex items-center justify-center border border-obsidian-700">
                  <Scale size={28} className="text-white opacity-90" />
                </div>
              </motion.div>

              <motion.h2
                className="text-4xl font-extrabold text-white mb-4 tracking-tight"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                AI-<span className="metal-text">LEGAL</span> KZ
              </motion.h2>
              <motion.p
                className="text-steel-400 max-w-sm mb-12 text-sm leading-relaxed"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {user?.role === 'lawyer' ? t('lawyer_welcome') : t('chat_welcome')}
              </motion.p>

              <div className="grid sm:grid-cols-2 gap-4 w-full max-w-2xl">
                {(user?.role === 'lawyer' ? [t('lawyer_suggestion_1'), t('lawyer_suggestion_2')] : [t('chat_suggestion_1'), t('chat_suggestion_2')]).map((s, i) => (
                  <motion.button
                    key={i}
                    onClick={() => sendMessage(s)}
                    className="glass-card p-5 text-left text-sm text-steel-300 hover:text-white transition-all border border-obsidian-700/80 hover:border-chrome-500/40"
                    variants={suggestionVariants}
                    initial="hidden"
                    animate="visible"
                    custom={i}
                    whileHover={{ y: -2, backgroundColor: 'rgba(255,255,255,0.02)' }}
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-chrome-500">→</span> {s}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <>
              {messages.map((msg, index) => (
                <motion.div
                  key={msg.id || index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} w-full`}
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
                        animate={index === messages.length - 1} 
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
                </motion.div>
              ))}

              {isTyping && (
                <motion.div
                  className="flex justify-start w-full"
                  initial={{ opacity: 0, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0 }}
                >
                  <div className="chat-bubble-ai opacity-80 scale-95 origin-left">
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
