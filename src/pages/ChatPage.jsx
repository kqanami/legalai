import { useState, useRef, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { useLanguage } from '../i18n/LanguageContext';
import { useChat } from '../contexts/ChatContext';
import AIWaveform from '../components/AIWaveform';
import MagneticButton from '../components/MagneticButton';
import { chatApi } from '../services/api';
import { Scale, Settings2, Home, Building2, Link2, Download } from 'lucide-react';

const msgVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

const suggestionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.4 + i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

// Grok-style simulated streaming typewriter for Markdown
const StreamingMarkdown = memo(({ content, isLatest, onUpdate }) => {
  const [displayedText, setDisplayedText] = useState(isLatest ? '' : content);
  
  useEffect(() => {
    if (!isLatest) {
      setDisplayedText(content);
      return;
    }
    
    let i = 0;
    // Fast Grok-like token streaming
    const interval = setInterval(() => {
      setDisplayedText((prev) => {
        const nextBatch = content.slice(prev.length, prev.length + Math.floor(Math.random() * 3) + 2); // 2-4 chars at a time
        if (prev.length + nextBatch.length >= content.length) {
          clearInterval(interval);
          if (onUpdate) onUpdate(); // Trigger final scroll
          return content;
        }
        if (onUpdate && (prev.length % 15 === 0)) onUpdate(); // Trigger scroll during typing
        return prev + nextBatch;
      });
    }, 15); // VERY fast, 15ms per chunk to emulate Grok's fluid speed
    
    return () => clearInterval(interval);
  }, [content, isLatest, onUpdate]);

  return <ReactMarkdown>{displayedText}</ReactMarkdown>;
});

export default function ChatPage() {
  const { t } = useLanguage();
  const { messages, isTyping, currentSegment, sendMessage, sessionId } = useChat();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const suggestions = [
    t('chat_suggestion_1'),
    t('chat_suggestion_2'),
    t('chat_suggestion_3'),
    t('chat_suggestion_4'),
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;
    sendMessage(input.trim());
    setInput('');
  };

  const handleSuggestion = (text) => {
    if (isTyping) return;
    sendMessage(text);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        <AnimatePresence mode="popLayout">
          {messages.length === 0 ? (
            /* Welcome screen */
            <motion.div
              key="welcome"
              className="flex flex-col items-center justify-center h-full text-center px-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Animated orb (Strict Chrome) */}
              <motion.div
                className="relative w-24 h-24 mb-10"
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="absolute inset-0 rounded-3xl chrome-gradient shadow-[0_0_40px_rgba(255,255,255,0.15)] opacity-80" />
                <div className="absolute inset-[3px] rounded-[22px] bg-obsidian-900 flex items-center justify-center border border-obsidian-700">
                  <span className="filter drop-shadow-[0_0_10px_rgba(255,255,255,0.4)] text-white">
                    <Scale size={32} strokeWidth={1.5} />
                  </span>
                </div>
                {/* Orbiting rings */}
                <motion.div
                  className="absolute -inset-4 rounded-full border border-chrome-500/30 border-dashed"
                  animate={{ rotate: 360, scale: [1, 1.05, 1] }}
                  transition={{ rotate: { duration: 30, repeat: Infinity, ease: 'linear' }, scale: { duration: 4, repeat: Infinity } }}
                />
                <motion.div
                  className="absolute -inset-8 rounded-full border border-chrome-500/10"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}
                />
              </motion.div>

              <motion.h2
                className="text-4xl font-extrabold text-white mb-4 tracking-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                AI-<span className="metal-text">{t('landing_title_accent')}</span>
              </motion.h2>
              <motion.p
                className="text-steel-400 max-w-md mb-10 text-sm leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {t('chat_welcome')}
              </motion.p>

              {/* Segment auto-detect badge */}
              <motion.div
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-chrome-500/10 border border-chrome-500/30 mb-12 shadow-inner backdrop-blur-md"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
              >
                <motion.span
                  className="filter drop-shadow-[0_0_5px_rgba(255,255,255,0.5)] text-chrome-200"
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                >
                  <Settings2 size={16} />
                </motion.span>
                <span className="text-xs text-chrome-200 font-medium tracking-wide">AI Intent Classifier — {t('segment_auto')}</span>
              </motion.div>

              {/* Suggestions */}
              <div className="grid sm:grid-cols-2 gap-4 w-full max-w-2xl">
                {suggestions.map((s, i) => (
                  <motion.button
                    key={i}
                    onClick={() => handleSuggestion(s)}
                    className="glass-card p-5 text-left text-sm text-steel-300 hover:text-white transition-all group relative overflow-hidden border border-obsidian-700/80 hover:border-chrome-500/40 shadow-sm"
                    variants={suggestionVariants}
                    initial="hidden"
                    animate="visible"
                    custom={i}
                    whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Hover shimmer */}
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-[800ms] ease-in-out" />
                    <span className="relative flex items-center gap-3">
                      <span className="text-chrome-500 group-hover:text-white transition-colors duration-300 transform group-hover:translate-x-1">→</span>
                      {s}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            /* Chat messages */
            <>
              {messages.map((msg, index) => {
                const isLatestAI = msg.role === 'assistant' && index === messages.length - 1;
                return (
                <motion.div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  variants={msgVariants}
                  initial="hidden"
                  animate="visible"
                  layout
                >
                  {msg.role === 'assistant' && (
                    <motion.div
                      className="w-10 h-10 rounded-xl chrome-gradient flex items-center justify-center mr-4 flex-shrink-0 mt-1 shadow-lg shadow-white/10"
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    >
                      <Scale className="text-obsidian-950" size={20} strokeWidth={2.5} />
                    </motion.div>
                  )}
                  <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}>
                    {msg.segment && msg.role === 'assistant' && (
                      <motion.div
                        className="flex items-center gap-2 mb-4 pb-3 border-b border-obsidian-600/50"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <span className={msg.segment === 'b2c' ? 'segment-b2c flex items-center gap-1.5' : 'segment-b2b flex items-center gap-1.5'}>
                          {msg.segment === 'b2c' ? <Home size={12} /> : <Building2 size={12} />} 
                          {msg.segment === 'b2c' ? 'B2C' : 'B2B'} — {t('segment_auto')}
                        </span>
                      </motion.div>
                    )}
                    {msg.role === 'user' ? (
                      <p className="text-sm sm:text-base font-semibold tracking-wide">{msg.content}</p>
                    ) : (
                      <div className="prose prose-invert prose-sm max-w-none
                        prose-headings:text-white prose-headings:font-bold
                        prose-h2:text-lg prose-h2:mt-0 prose-h2:mb-4
                        prose-h3:text-base prose-h3:mt-5 prose-h3:mb-3
                        prose-p:text-steel-300 prose-p:leading-relaxed prose-p:tracking-wide
                        prose-strong:text-chrome-100 prose-strong:font-bold
                        prose-a:text-chrome-300 prose-a:underline hover:prose-a:text-white
                        prose-blockquote:border-chrome-500/50 prose-blockquote:bg-obsidian-700/30 prose-blockquote:rounded-r-lg prose-blockquote:py-3 prose-blockquote:px-5 prose-blockquote:my-4
                        prose-li:text-steel-300
                        prose-table:text-sm prose-table:border-collapse
                        prose-th:text-chrome-200 prose-th:font-semibold prose-th:border-b-2 prose-th:border-obsidian-600/50 prose-th:pb-2
                        prose-td:text-steel-300 prose-td:border-b prose-td:border-obsidian-700/50 prose-td:py-2
                      ">
                        <StreamingMarkdown content={msg.content} isLatest={isLatestAI} onUpdate={scrollToBottom} />
                      </div>
                    )}

                    {/* References */}
                    {msg.references && msg.references.length > 0 && (
                      <motion.div
                        className="mt-5 pt-4 border-t border-obsidian-600/40 bg-obsidian-900/40 rounded-lg p-3"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                      >
                        <p className="text-xs text-steel-500 mb-2 font-medium tracking-wider uppercase">{t('common_references')}</p>
                        {msg.references.map((ref, i) => (
                          <a
                            key={i}
                            href={ref.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-xs text-chrome-400 hover:text-white transition-colors mb-1.5 group"
                          >
                            <motion.span whileHover={{ scale: 1.1, rotate: -15 }} className="opacity-70 group-hover:opacity-100">
                              <Link2 size={12} />
                            </motion.span>
                            <span className="group-hover:underline">{ref.title} ({ref.articles})</span>
                          </a>
                        ))}
                      </motion.div>
                    )}

                      <p className="text-[10px] text-steel-600 mt-3 font-medium tracking-widest uppercase flex justify-end">
                        {new Date(msg.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </motion.div>
                );
              })}

              {/* AI Waveform typing indicator */}
              <AnimatePresence>
                {isTyping && (
                  <motion.div
                    className="flex justify-start"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="w-10 h-10 rounded-xl chrome-gradient flex items-center justify-center mr-4 flex-shrink-0">
                      <Scale className="text-obsidian-950" size={20} strokeWidth={2.5} />
                    </div>
                    <div className="chat-bubble-ai border border-chrome-800/20">
                      <AIWaveform label={t('chat_analyzing') + '...'} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Input area */}
      <motion.div
        className="border-t border-obsidian-700/60 bg-obsidian-950/90 backdrop-blur-2xl p-5 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex items-end gap-4 relative z-10">
          <motion.div
            className="flex-1 relative"
            whileFocusWithin={{ scale: 1.01 }}
            transition={{ duration: 0.3 }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder={t('chat_placeholder')}
              rows={1}
              className="w-full px-5 py-4 rounded-xl bg-obsidian-800/80 border border-obsidian-600/50 
              text-white placeholder-steel-600 text-sm font-medium tracking-wide outline-none 
              transition-all duration-300 resize-none min-h-[52px] max-h-[140px]
              focus:border-chrome-500/60 focus:bg-obsidian-800 focus:shadow-[0_0_20px_rgba(255,255,255,0.05),inset_0_2px_5px_rgba(0,0,0,0.4)] shadow-inner"
            />
          </motion.div>

          <MagneticButton
            type="submit"
            disabled={!input.trim() || isTyping}
            className="w-14 h-[52px] rounded-xl chrome-gradient flex items-center justify-center flex-shrink-0
              disabled:opacity-30 disabled:cursor-not-allowed disabled:grayscale
              shadow-[0_4px_15px_rgba(255,255,255,0.05)] hover:shadow-[0_8px_25px_rgba(255,255,255,0.15)] 
              transition-all duration-300"
            strength={0.3}
          >
            <svg className="w-5 h-5 text-obsidian-950 translate-x-[2px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </MagneticButton>

          {/* Export button */}
          {sessionId && messages.length > 0 && (
            <MagneticButton
              type="button"
              onClick={async () => {
                try { await chatApi.exportSession(sessionId); }
                catch (e) { console.error('Export error:', e); }
              }}
              className="w-14 h-[52px] rounded-xl bg-obsidian-800 border border-obsidian-600/50 flex items-center justify-center flex-shrink-0
                hover:border-chrome-500/40 hover:bg-obsidian-700 transition-all duration-300"
              strength={0.2}
              title="Экспорт в DOCX"
            >
              <Download size={18} className="text-chrome-400" />
            </MagneticButton>
          )}
        </form>

        {/* Current segment indicator */}
        <AnimatePresence>
          {currentSegment && (
            <motion.div
              className="max-w-4xl mx-auto mt-4 flex items-center justify-center gap-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-chrome-400 animate-pulse-light shadow-[0_0_8px_#fff]"></div>
              <span className="text-[10px] text-steel-500 font-bold tracking-widest uppercase">Система определила вектор:</span>
              <motion.span
                className={currentSegment === 'b2c' ? 'segment-b2c flex items-center gap-1.5' : 'segment-b2b flex items-center gap-1.5'}
                style={{ fontSize: '10px', padding: '3px 10px', letterSpacing: '0.05em' }}
                initial={{ scale: 0, filter: 'blur(4px)' }}
                animate={{ scale: 1, filter: 'blur(0px)' }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                {currentSegment === 'b2c' ? <><Home size={10} /> ФИЗ. ЛИЦО</> : <><Building2 size={10} /> ЮР. ЛИЦО</>}
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
