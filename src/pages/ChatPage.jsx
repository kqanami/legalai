import React, { useState, useRef, useEffect, memo, useCallback, Children, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { useLanguage } from '../i18n/LanguageContext';
import { useChat } from '../contexts/ChatContext';
import AIWaveform from '../components/AIWaveform';
import { chatApi, docsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { GenerativeArtScene } from '../components/ui/generative-art-scene';
import { Scale, Home, Building2, Link2, Download, ChevronRight, Search, Phone, UserCheck, Shield, Star, Mic, MicOff, ExternalLink, BookOpen, Loader2, Paperclip, X, FileText, Users, ShoppingBag, Building, Book, PenTool, GitCompare, Command } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TextareaAutosize from 'react-textarea-autosize';

const INLINE_COMMANDS = [
  { label: 'Анализ рисков', description: 'Проверить договор на уязвимости', prefix: '/analyze', icon: <Shield size={14} /> },
  { label: 'Создать договор', description: 'Генерация нового документа', prefix: '/contract', icon: <FileText size={14} /> },
  { label: 'Составить иск', description: 'Подготовка искового заявления', prefix: '/claim', icon: <PenTool size={14} /> },
  { label: 'Найти адвоката', description: 'Поиск подходящего юриста', prefix: '/lawyer', icon: <Search size={14} /> },
];

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
        className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-md text-xs font-semibold cursor-pointer transition-all duration-200 bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:border-white/30"
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
            <div className="bg-neutral-900 border border-white/10 rounded-xl p-3.5 shadow-2xl">
              <div className="flex items-start gap-2.5 mb-2">
                <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <BookOpen size={13} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white leading-snug mb-0.5">{reference.title}</p>
                  {reference.snippet && (
                    <p className="text-[10px] text-neutral-400 leading-relaxed line-clamp-3">{reference.snippet}</p>
                  )}
                </div>
              </div>
              {reference.url && (
                <a
                  href={reference.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[10px] font-bold text-white/70 hover:text-white transition-colors pt-2 border-t border-white/10"
                >
                  <ExternalLink size={10} />
                  Открыть на adilet.zan.kz
                </a>
              )}
            </div>
            {/* Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] w-3 h-3 bg-neutral-900 border-r border-b border-white/10 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

const msgVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] },
  },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const suggestionVariants = {
  hidden: { opacity: 0, y: 15, filter: 'blur(5px)' },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { delay: 0.1 + i * 0.05, duration: 0.4, ease: 'easeOut' },
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 w-full max-w-sm rounded-2xl bg-neutral-900 border border-white/10 p-5 shadow-xl"
    >
      <div className="flex items-start gap-4 mb-4">
        <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center flex-shrink-0">
          <Scale size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-white mb-1">Рекомендуется помощь адвоката</h4>
          <p className="text-xs text-neutral-400 leading-relaxed">{escalation.reason}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(lawyerSearchUrl)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white text-black text-xs font-bold rounded-xl hover:bg-neutral-200 transition-colors"
        >
          <Search size={14} /> Найти юриста
        </button>
      </div>
    </motion.div>
  );
}

function LawyerSearchChip({ category }) {
  const navigate = useNavigate();
  const searchUrl = `/lawyers?specialization=${encodeURIComponent(category || '')}`;
  
  return (
    <motion.button
      onClick={() => navigate(searchUrl)}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 text-white hover:bg-neutral-700 transition-colors border border-white/5"
    >
      <Search size={12} /> Найти адвоката
    </motion.button>
  );
}

const MarkdownRenderer = memo(({ content, isStreaming = false, references = [] }) => {
  const cleanText = (text) => {
    let raw = text
      .split('[REFS]')[0]
      .split('[SEGMENT]')[0]
      .split('[ESCALATION]')[0]
      .split('[SUGGESTIONS]')[0]
      .split('<!--REFS-->')[0]
      .split('<!--SEGMENT-->')[0]
      .split('<!--ESCALATION-->')[0]
      .split('<!--SUGGESTIONS-->')[0]
      .trim();

    raw = raw.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, url) => {
      if (url.includes(' ')) return `[${label}](${encodeURI(url)})`;
      return match;
    });
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
        const matchedRef = references.find(r =>
          r.title && (part.toLowerCase().includes(r.title.toLowerCase().slice(0, 10)) ||
          r.title.toLowerCase().includes(part.toLowerCase().slice(0, 10)))
        ) || (references.length > 0 ? references[0] : null);

        return (
          <CitationTooltip
            key={idx}
            text={part}
            reference={matchedRef || { title: part, snippet: 'Нажмите для поиска в базе', url: `https://adilet.zan.kz/rus/search?q=${encodeURIComponent(part)}` }}
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
      p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed text-[15px]"><WithCitations>{children}</WithCitations></p>,
      li: ({ children }) => <li className="mb-1 leading-relaxed"><WithCitations>{children}</WithCitations></li>,
      ul: ({ children }) => <ul className="list-disc pl-5 mb-4 marker:text-neutral-600">{children}</ul>,
      ol: ({ children }) => <ol className="list-decimal pl-5 mb-4 marker:text-neutral-600">{children}</ol>,
      strong: ({ children }) => <strong className="font-semibold text-white"><WithCitations>{children}</WithCitations></strong>,
      em: ({ children }) => <em className="text-neutral-400 not-italic"><WithCitations>{children}</WithCitations></em>,
      h1: ({ children }) => <h1 className="text-xl font-bold text-white mt-6 mb-3 tracking-tight">{children}</h1>,
      h2: ({ children }) => <h2 className="text-lg font-bold text-white mt-5 mb-3 tracking-tight">{children}</h2>,
      h3: ({ children }) => <h3 className="text-base font-bold text-white mt-4 mb-2 tracking-tight">{children}</h3>,
      pre: ({ children }) => <pre className="bg-neutral-900 border border-white/10 rounded-xl p-4 my-4 overflow-x-auto text-sm">{children}</pre>,
      code: ({ children, inline }) => inline ? <code className="bg-neutral-900 px-1.5 py-0.5 rounded text-sm text-neutral-300 font-mono border border-white/5">{children}</code> : <code>{children}</code>,
      a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer" className="text-neutral-300 underline underline-offset-4 decoration-neutral-600 hover:text-white transition-colors">{children}</a>,
      blockquote: ({ children }) => <blockquote className="border-l-2 border-neutral-700 pl-4 my-4 text-neutral-400 italic">{children}</blockquote>,
    };
  }, [isStreaming, references]);

  return (
    <div className={`text-neutral-300 ${isStreaming ? 'streaming-message' : ''}`}>
      <ReactMarkdown components={components}>
        {isStreaming ? autoCloseMarkdown(cleanText(content)) : cleanText(content)}
      </ReactMarkdown>
    </div>
  );
});

const detectLanguage = (text) => {
  const queryLower = text.toLowerCase();
  const kazakhSpecific = /[әғқңөұүһі]/;
  if (kazakhSpecific.test(queryLower)) return 'kz';
  return 'ru';
};

export default function ChatPage() {
  const { t, switchLanguage } = useLanguage();
  const { messages, isTyping, isStreaming, currentSegment, sendMessage: sendChatMessage, sessionId } = useChat();
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
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

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) validateAndSetFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validateAndSetFile = (file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    if (['pdf', 'docx', 'doc', 'txt'].includes(ext)) {
      if (file.size > 10 * 1024 * 1024) {
        alert("Файл слишком большой. Максимум 10МБ.");
        return;
      }
      setAttachedFile(file);
    } else {
      alert("Поддерживаются только форматы PDF, DOCX, DOC и TXT.");
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragOver(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSetFile(file);
  };

  const sendMessage = useCallback((text, docId, docName) => {
    if (messages.length === 0) {
      const detectedLang = detectLanguage(text);
      switchLanguage(detectedLang);
    }
    sendChatMessage(text, docId, docName);
  }, [messages.length, sendChatMessage, switchLanguage]);

  const scrollToBottom = useCallback((instant = false) => {
    if (!scrollRef.current || !isAutoScrollActive.current) return;
    const scrollContainer = scrollRef.current;
    const targetScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
    if (instant) {
      scrollContainer.scrollTop = targetScroll;
    } else {
      scrollContainer.scrollTo({ top: targetScroll, behavior: 'smooth' });
    }
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
    } else if (isTyping || (messages.length > 0 && messages[messages.length-1].role === 'assistant')) {
      scrollToBottom(true);
    }
  }, [messages, isTyping, scrollToBottom]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if ((!input.trim() && !attachedFile) || isTyping || isUploadingFile) return;

    let docId = null;
    let docName = null;
    if (attachedFile) {
      setIsUploadingFile(true);
      try {
        const res = await docsApi.upload(attachedFile);
        docId = res.id;
        docName = res.name;
        setAttachedFile(null);
      } catch (err) {
        alert("Ошибка при загрузке файла: " + err.message);
        setIsUploadingFile(false);
        return;
      }
      setIsUploadingFile(false);
    }

    if (input.trim() || docId) {
      sendMessage(input.trim() || "Проанализируй прикрепленный документ", docId, docName);
      setInput('');
    }
  };

  return (
    <div 
      className="flex flex-col h-full bg-black relative w-full overflow-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Subtle Animated Background from AnimatedAIChat idea */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 flex items-center justify-center">
        <motion.div 
          className="w-[700px] h-[700px] opacity-30 mix-blend-screen filter blur-[20px]"
          animate={{ scale: [1, 1.05, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        >
          <GenerativeArtScene />
        </motion.div>
      </div>

      <AnimatePresence>
        {isDragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md border-2 border-dashed border-white/20 m-4 rounded-3xl"
          >
            <div className="text-center">
              <FileText size={48} className="mx-auto text-white mb-4 opacity-50" />
              <h3 className="text-xl font-bold text-white">Отпустите файл здесь</h3>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages area */}
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-8 md:px-8 w-full max-w-4xl mx-auto custom-scrollbar relative z-10"
      >
        <div className="flex flex-col space-y-8 min-h-full justify-end pb-12">
          <AnimatePresence mode="popLayout">
            {messages.length === 0 ? (
              <motion.div
                key="welcome"
                className="flex flex-col items-center justify-center h-full my-auto text-center"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              >
                <div className="w-16 h-16 rounded-2xl bg-white text-black flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(255,255,255,0.2)]">
                  <Scale size={32} strokeWidth={2} />
                </div>
                <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">Чем я могу помочь?</h2>
                <p className="text-neutral-400 max-w-md mx-auto mb-10 text-sm">
                  Задайте юридический вопрос, загрузите документ для анализа или попросите составить договор.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                  {(user?.role === 'lawyer' ? [
                    { text: t('lawyer_suggestion_1'), icon: <Book size={18} /> },
                    { text: t('lawyer_suggestion_2'), icon: <FileText size={18} /> },
                    { text: t('lawyer_suggestion_3'), icon: <PenTool size={18} /> },
                    { text: t('lawyer_suggestion_4'), icon: <GitCompare size={18} /> }
                  ] : [
                    { text: t('chat_suggestion_1'), icon: <Users size={18} /> },
                    { text: t('chat_suggestion_2'), icon: <ShoppingBag size={18} /> },
                    { text: t('chat_suggestion_3'), icon: <Building size={18} /> },
                    { text: t('chat_suggestion_4'), icon: <Search size={18} /> }
                  ]).map((sug, i) => (
                    <motion.button
                      key={i}
                      onClick={() => sendMessage(sug.text)}
                      variants={suggestionVariants}
                      initial="hidden"
                      animate="visible"
                      custom={i}
                      className="group flex flex-col items-start p-4 bg-neutral-900 border border-white/5 rounded-2xl hover:bg-neutral-800 transition-colors text-left"
                    >
                      <div className="text-neutral-400 group-hover:text-white transition-colors mb-3">
                        {sug.icon}
                      </div>
                      <span className="text-sm text-neutral-300 group-hover:text-white transition-colors font-medium">
                        {sug.text}
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
                    className={`flex flex-col w-full ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                    variants={msgVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-3 mb-2 px-1">
                        <div className="w-6 h-6 rounded bg-white text-black flex items-center justify-center">
                          <Scale size={14} />
                        </div>
                        <span className="text-xs font-bold text-white">LegalAI</span>
                      </div>
                    )}
                    
                    <div 
                      className={`relative max-w-[85%] px-5 py-4 rounded-3xl text-[15px] ${
                        msg.role === 'user' 
                          ? 'bg-white text-black rounded-tr-sm' 
                          : 'bg-transparent text-white pl-10'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <>
                          {msg.attached_document_id && (
                            <div className="flex items-center gap-2 mb-2 bg-black/10 w-fit px-3 py-1.5 rounded-xl border border-black/5">
                              <FileText size={14} className="text-black/70" />
                              <span className="text-xs font-medium truncate max-w-[200px]">
                                {msg.attached_document_name || "Документ"}
                              </span>
                            </div>
                          )}
                          <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        </>
                      ) : (
                        <MarkdownRenderer 
                          content={msg.content} 
                          isStreaming={isStreaming && index === messages.length - 1}
                          references={msg.references || []} 
                        />
                      )}

                      {/* References */}
                      {msg.references && msg.references.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {msg.references.map((ref, i) => (
                            <a key={i} href={ref.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-neutral-900 border border-white/5 text-[11px] text-neutral-400 hover:text-white transition-colors">
                              <Link2 size={10} /> <span>{ref.title}</span>
                            </a>
                          ))}
                        </div>
                      )}

                      {/* Escalation */}
                      {msg.escalation && msg.escalation.needed && (
                        <EscalationBanner escalation={msg.escalation} />
                      )}
                    </div>

                    {/* Suggestions */}
                    {msg.role === 'assistant' && !isStreaming && (msg.suggestions?.length > 0 || msg.escalation?.needed) && (
                      <div className="flex flex-wrap gap-2 mt-3 ml-10">
                        {msg.escalation && msg.escalation.needed && user?.role !== 'lawyer' && (
                          <LawyerSearchChip category={msg.escalation.category} />
                        )}
                        {msg.suggestions?.map((sug, i) => (
                          <button
                            key={i}
                            onClick={() => { if (!isTyping) sendMessage(sug); }}
                            disabled={isTyping}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white border border-white/5 transition-colors disabled:opacity-50"
                          >
                            {sug}
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}

                {isTyping && (
                  <motion.div
                    className="flex justify-start w-full pl-10"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <AIWaveform label="Генерирую ответ..." />
                  </motion.div>
                )}
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Sticky Input Area */}
      <div className="p-4 md:p-6 w-full max-w-4xl mx-auto relative z-20">
        {/* Command Palette Popup */}
        <AnimatePresence>
          {showCommands && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-full left-4 right-4 md:left-6 md:right-6 mb-2 bg-neutral-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
            >
              <div className="px-4 py-2 border-b border-white/5">
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Быстрые команды</span>
              </div>
              <div className="p-2 flex flex-col gap-1 max-h-64 overflow-y-auto custom-scrollbar">
                {INLINE_COMMANDS.filter(c => c.prefix.toLowerCase().startsWith(input.toLowerCase())).map((cmd, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setInput(cmd.prefix + ' ');
                      setShowCommands(false);
                      textareaRef.current?.focus();
                    }}
                    onMouseEnter={() => setCommandIndex(i)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors ${
                      commandIndex === i ? 'bg-white/10 text-white' : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-200'
                    }`}
                  >
                    <div className="p-1.5 rounded-lg bg-white/5">{cmd.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold">{cmd.label}</div>
                      <div className="text-xs text-neutral-500 truncate">{cmd.description}</div>
                    </div>
                    <div className="text-xs font-mono bg-white/5 px-2 py-0.5 rounded text-neutral-500">{cmd.prefix}</div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form 
          onSubmit={handleSubmit}
          className="relative bg-neutral-900/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 shadow-[0_0_40px_rgba(0,0,0,0.5)] transition-all duration-300 focus-within:border-white/20 focus-within:bg-neutral-900"
        >
          {attachedFile && (
            <div className="px-3 pt-2 pb-1">
              <div className="inline-flex items-center gap-2 bg-neutral-800 border border-white/5 px-3 py-1.5 rounded-xl">
                <FileText size={14} className="text-white" />
                <span className="text-xs font-medium text-white truncate max-w-[200px]">{attachedFile.name}</span>
                <button
                  type="button"
                  onClick={() => setAttachedFile(null)}
                  className="text-neutral-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          <div className="flex items-end gap-2 relative">
            <TextareaAutosize
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                const val = e.target.value;
                setInput(val);
                if (val.startsWith('/')) {
                  setShowCommands(true);
                  setCommandIndex(0);
                } else {
                  setShowCommands(false);
                }
              }}
              onKeyDown={(e) => {
                if (showCommands) {
                  const filtered = INLINE_COMMANDS.filter(c => c.prefix.toLowerCase().startsWith(input.toLowerCase()));
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setCommandIndex(i => (i + 1) % filtered.length);
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setCommandIndex(i => (i - 1 + filtered.length) % filtered.length);
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (filtered[commandIndex]) {
                      setInput(filtered[commandIndex].prefix + ' ');
                      setShowCommands(false);
                    }
                  } else if (e.key === 'Escape') {
                    setShowCommands(false);
                  }
                } else if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Спросите LegalAI..."
              minRows={1}
              maxRows={6}
              className="flex-1 bg-transparent border-none text-white placeholder-neutral-500 text-sm py-3 px-4 outline-none resize-none custom-scrollbar leading-relaxed"
            />

            <div className="flex items-center gap-1 p-1">
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".pdf,.docx,.doc,.txt" className="hidden" />
              
              <button
                type="button"
                onClick={() => {
                  if (input.startsWith('/')) setShowCommands(false);
                  else {
                    setInput('/');
                    setShowCommands(true);
                    textareaRef.current?.focus();
                  }
                }}
                className={`p-2.5 rounded-xl transition-colors ${showCommands ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-white hover:bg-white/10'}`}
                title="Команды"
              >
                <Command size={18} />
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Прикрепить файл"
              >
                <Paperclip size={18} />
              </button>
              
              <button
                type="button"
                onClick={() => setIsListening(!isListening)}
                className={`p-2.5 rounded-xl transition-colors ${
                  isListening ? 'bg-red-500/20 text-red-400' : 'text-neutral-400 hover:text-white hover:bg-white/10'
                }`}
                title="Голосовой ввод"
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
              
              <button
                type="submit"
                disabled={(!input.trim() && !attachedFile) || isTyping || isUploadingFile}
                className="p-2.5 rounded-xl bg-white text-black hover:bg-neutral-200 disabled:opacity-30 disabled:bg-neutral-800 disabled:text-neutral-500 transition-all ml-1 shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:shadow-none"
              >
                {isUploadingFile ? <Loader2 size={18} className="animate-spin" /> : <ArrowUpIcon />}
              </button>
            </div>
          </div>
        </form>
        <div className="text-center mt-3">
          <p className="text-[10px] text-neutral-500 font-medium">LegalAI может допускать ошибки. Рекомендуется проконсультироваться с юристом.</p>
        </div>
      </div>
    </div>
  );
}

function ArrowUpIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>
    </svg>
  );
}
