import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  MessageSquare,
  FileText,
  Shield,
  Users,
  User,
  Scale,
  Upload,
  Building2,
  Briefcase,
  Command,
  ArrowUp,
  ArrowDown,
  CornerDownLeft,
  Sparkles,
} from 'lucide-react';

const ACTIONS = [
  // Навигация
  { id: 'nav-chat', label: 'Чат ИИ', description: 'Юридический ассистент', category: 'Навигация', icon: MessageSquare, path: '/dashboard', keywords: ['чат', 'ai', 'ии', 'ассистент', 'консультация'] },
  { id: 'nav-audit', label: 'Аудит договора', description: 'Анализ документов', category: 'Навигация', icon: Shield, path: '/dashboard/audit', keywords: ['аудит', 'договор', 'анализ', 'проверка'] },
  { id: 'nav-counterparty', label: 'Проверка контрагентов', description: 'БИН/ИИН проверка', category: 'Навигация', icon: Building2, path: '/dashboard/counterparty', keywords: ['контрагент', 'бин', 'иин', 'проверка', 'компания'] },
  { id: 'nav-documents', label: 'Документы', description: 'Мои документы', category: 'Навигация', icon: FileText, path: '/dashboard/documents', keywords: ['документы', 'файлы', 'хранилище'] },
  { id: 'nav-profile', label: 'Профиль', description: 'Настройки аккаунта', category: 'Навигация', icon: User, path: '/dashboard/profile', keywords: ['профиль', 'настройки', 'аккаунт'] },
  // Юристы
  { id: 'law-marketplace', label: 'Маркетплейс юристов', description: 'Найти юриста', category: 'Юристы', icon: Scale, path: '/lawyers', keywords: ['юрист', 'маркетплейс', 'адвокат', 'найти'] },
  { id: 'law-leads', label: 'Мои заявки', description: 'Входящие заявки', category: 'Юристы', icon: Briefcase, path: '/lawyer/leads', keywords: ['заявки', 'лиды', 'клиенты'] },
  // Действия
  { id: 'act-new-chat', label: 'Новый чат', description: 'Начать новую консультацию', category: 'Действия', icon: Sparkles, path: '/dashboard', action: 'new-chat', keywords: ['новый', 'чат', 'начать', 'консультация'] },
  { id: 'act-upload', label: 'Загрузить договор', description: 'Загрузить файл для аудита', category: 'Действия', icon: Upload, path: '/dashboard/audit', action: 'upload', keywords: ['загрузить', 'файл', 'договор', 'upload'] },
  { id: 'act-bin', label: 'Проверить БИН', description: 'Быстрая проверка компании', category: 'Действия', icon: Building2, path: '/dashboard/counterparty', action: 'check-bin', keywords: ['бин', 'проверить', 'компания', 'bin'] },
];

const CATEGORY_ORDER = ['Навигация', 'Юристы', 'Действия'];

function fuzzyMatch(text, query) {
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  if (lower.includes(q)) return true;
  // Simple character-sequence fuzzy match
  let qi = 0;
  for (let i = 0; i < lower.length && qi < q.length; i++) {
    if (lower[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const panelVariants = {
  hidden: { opacity: 0, scale: 0.95, y: -20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', damping: 28, stiffness: 300 },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: -10,
    transition: { duration: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: (i) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.02, duration: 0.2 },
  }),
};

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();

  // Filter actions by query
  const filtered = useMemo(() => {
    if (!query.trim()) return ACTIONS;
    return ACTIONS.filter(
      (a) =>
        fuzzyMatch(a.label, query) ||
        fuzzyMatch(a.description, query) ||
        a.keywords.some((k) => fuzzyMatch(k, query))
    );
  }, [query]);

  // Group filtered actions by category, respecting order
  const grouped = useMemo(() => {
    const map = {};
    for (const action of filtered) {
      if (!map[action.category]) map[action.category] = [];
      map[action.category].push(action);
    }
    return CATEGORY_ORDER.filter((c) => map[c]).map((c) => ({
      category: c,
      items: map[c],
    }));
  }, [filtered]);

  // Flat list for keyboard navigation
  const flatItems = useMemo(() => grouped.flatMap((g) => g.items), [grouped]);

  // Global keyboard shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      // Tiny delay to ensure the input is mounted
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const close = useCallback(() => setIsOpen(false), []);

  const executeAction = useCallback(
    (action) => {
      close();
      navigate(action.path);
    },
    [close, navigate]
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % (flatItems.length || 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + (flatItems.length || 1)) % (flatItems.length || 1));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (flatItems[selectedIndex]) executeAction(flatItems[selectedIndex]);
      }
    },
    [flatItems, selectedIndex, executeAction, close]
  );

  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh]"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.15 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={close}
          />

          {/* Panel */}
          <motion.div
            className="relative w-full max-w-xl mx-4 rounded-2xl bg-[#050505]/95 border border-white/10 backdrop-blur-xl shadow-[0_25px_60px_rgba(0,0,0,0.7),0_0_40px_rgba(255,255,255,0.02)] overflow-hidden"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onKeyDown={handleKeyDown}
          >
            {/* Subtle top accent line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

            {/* Search input */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
              <Search size={18} className="text-neutral-500 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск команд и действий..."
                className="flex-1 bg-transparent text-sm text-white placeholder:text-neutral-500 outline-none caret-white"
                autoComplete="off"
                spellCheck={false}
              />
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-neutral-500 bg-white/5 rounded border border-white/10">
                ESC
              </kbd>
            </div>

            {/* Results list */}
            <div
              ref={listRef}
              className="max-h-[360px] overflow-y-auto overscroll-contain py-2 px-2 custom-scrollbar"
            >
              {flatItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-neutral-500">
                  <Search size={32} strokeWidth={1} className="mb-3 opacity-40" />
                  <p className="text-sm font-medium">Ничего не найдено</p>
                  <p className="text-xs mt-1 opacity-60">Попробуйте другой запрос</p>
                </div>
              ) : (
                grouped.map((group, gi) => (
                  <div key={group.category} className={gi > 0 ? 'mt-3' : ''}>
                    {/* Category header */}
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                      {group.category}
                    </div>

                    {/* Actions */}
                    {group.items.map((action) => {
                      const globalIdx = flatItems.indexOf(action);
                      const isSelected = globalIdx === selectedIndex;
                      const Icon = action.icon;

                      return (
                        <motion.button
                          key={action.id}
                          data-index={globalIdx}
                          variants={itemVariants}
                          initial="hidden"
                          animate="visible"
                          custom={globalIdx}
                          onClick={() => executeAction(action)}
                          onMouseEnter={() => setSelectedIndex(globalIdx)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 group cursor-pointer border ${
                            isSelected
                              ? 'bg-white/[0.05] border-white/10 text-white scale-[1.01]'
                              : 'text-neutral-400 hover:bg-white/[0.03] border-transparent'
                          }`}
                        >
                          <div
                            className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 ${
                              isSelected
                                ? 'bg-white text-black'
                                : 'bg-white/[0.04] text-neutral-500 group-hover:text-neutral-300'
                            }`}
                          >
                            <Icon size={16} strokeWidth={1.8} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{action.label}</div>
                            <div className={`text-[11px] truncate transition-colors ${isSelected ? 'text-white/60' : 'text-neutral-500'}`}>
                              {action.description}
                            </div>
                          </div>

                          {isSelected && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="flex-shrink-0 flex items-center gap-1 text-[10px] text-white/40"
                            >
                              <CornerDownLeft size={12} />
                            </motion.div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer with keyboard hints */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-white/10 bg-[#0a0a0a]">
              <div className="flex items-center gap-3 text-[10px] text-neutral-500 font-medium">
                <span className="inline-flex items-center gap-1">
                  <kbd className="inline-flex items-center justify-center w-4 h-4 rounded bg-white/5 border border-white/10">
                    <ArrowUp size={8} />
                  </kbd>
                  <kbd className="inline-flex items-center justify-center w-4 h-4 rounded bg-white/5 border border-white/10">
                    <ArrowDown size={8} />
                  </kbd>
                  <span className="ml-0.5">навигация</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <kbd className="inline-flex items-center justify-center h-4 px-1 rounded bg-white/5 border border-white/10 text-[9px] font-mono">
                    ↵
                  </kbd>
                  <span className="ml-0.5">выбрать</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <kbd className="inline-flex items-center justify-center h-4 px-1 rounded bg-white/5 border border-white/10 text-[9px] font-mono">
                    esc
                  </kbd>
                  <span className="ml-0.5">закрыть</span>
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-neutral-500 font-medium">
                <kbd className="inline-flex items-center justify-center h-4 px-1.5 rounded bg-white/5 border border-white/10 text-[9px] font-mono">
                  {isMac ? '⌘' : 'Ctrl'}
                </kbd>
                <span>+</span>
                <kbd className="inline-flex items-center justify-center w-4 h-4 rounded bg-white/5 border border-white/10 text-[9px] font-mono">
                  K
                </kbd>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
