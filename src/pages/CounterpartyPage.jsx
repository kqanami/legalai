import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../i18n/LanguageContext';
import { Search, Building2, CheckCircle2, ShieldCheck, BarChart3, AlertCircle, Clock, ChevronRight, Zap, Target } from 'lucide-react';
import { counterpartyApi } from '../services/api';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
};

/* ─── Pure Monochrome SVG Radar Chart ─────────────────────────────────────── */
const RADAR_AXES = [
  { key: 'courts',   label: 'Суды' },
  { key: 'taxes',    label: 'Налоги' },
  { key: 'finance',  label: 'Финансы' },
  { key: 'licenses', label: 'Лицензии' },
  { key: 'years',    label: 'Срок работы' },
];

function computeRadarScores(result) {
  if (!result) return RADAR_AXES.map(() => 50);
  const taxScore = result.taxDebt === '0 ₸' ? 95 : result.taxDebt ? 35 : 60;
  const statusActive = result.status === 'Действующее';
  const courtScore = statusActive ? 88 : 45;
  const financeScore = taxScore > 70 ? 82 : 40;
  const licenseScore = statusActive ? 90 : 50;
  let yearsScore = 50;
  if (result.registrationDate) {
    const yearMatch = result.registrationDate.match(/\d{4}/);
    if (yearMatch) {
      const regYear = parseInt(yearMatch[0], 10);
      const age = new Date().getFullYear() - regYear;
      yearsScore = Math.min(98, 40 + age * 6);
    }
  }
  return [courtScore, taxScore, financeScore, licenseScore, yearsScore];
}

function RadarChart({ scores, size = 260 }) {
  const cx = size / 2, cy = size / 2, R = size * 0.35;
  const rings = [0.25, 0.5, 0.75, 1.0];
  const angleStep = (2 * Math.PI) / RADAR_AXES.length;
  const startAngle = -Math.PI / 2;

  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const isLowRisk = avg >= 65;

  const gradId = useMemo(() => 'radar-fill-' + Math.random().toString(36).slice(2, 8), []);

  const pointOnAxis = (i, pct) => [
    cx + R * pct * Math.cos(startAngle + i * angleStep),
    cy + R * pct * Math.sin(startAngle + i * angleStep),
  ];

  const ringPath = (pct) => RADAR_AXES.map((_, i) => pointOnAxis(i, pct))
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ') + ' Z';

  const dataPath = scores.map((s, i) => pointOnAxis(i, s / 100))
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ') + ' Z';

  const labels = RADAR_AXES.map((axis, i) => {
    const [lx, ly] = pointOnAxis(i, 1.3);
    const angle = startAngle + i * angleStep;
    let anchor = 'middle';
    if (Math.cos(angle) < -0.1) anchor = 'end';
    else if (Math.cos(angle) > 0.1) anchor = 'start';
    return { ...axis, x: lx, y: ly, anchor, score: scores[i] };
  });

  const mainColor = '#ffffff';
  const subColor = '#525252'; // neutral-600

  return (
    <svg viewBox={`-80 -80 ${size + 160} ${size + 160}`} width="100%" height="100%" className="select-none max-w-[360px]">
      <defs>
        <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={mainColor} stopOpacity="0.1" />
          <stop offset="100%" stopColor={mainColor} stopOpacity="0.02" />
        </radialGradient>
      </defs>
      {rings.map((r) => <path key={r} d={ringPath(r)} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />)}
      {RADAR_AXES.map((_, i) => {
        const [ex, ey] = pointOnAxis(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={ex} y2={ey} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />;
      })}
      <path d={dataPath} fill={`url(#${gradId})`} stroke={mainColor} strokeWidth="1.5" strokeLinejoin="round" />
      {scores.map((s, i) => {
        const [dx, dy] = pointOnAxis(i, s / 100);
        return (
          <g key={i}>
            <circle cx={dx} cy={dy} r="4" fill="#000" stroke={mainColor} strokeWidth="1.5" />
          </g>
        );
      })}
      {labels.map((l) => (
        <g key={l.key}>
          <text x={l.x} y={l.y - 6} textAnchor={l.anchor} fill="#737373" fontSize="11" fontWeight="600" letterSpacing="0.05em" className="uppercase">
            {l.label}
          </text>
          <text x={l.x} y={l.y + 12} textAnchor={l.anchor} fill={mainColor} fontSize="14" fontWeight="700">
            {l.score}
          </text>
        </g>
      ))}
    </svg>
  );
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function CounterpartyPage() {
  const { t } = useLanguage();
  const [bin, setBin] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => { loadHistory(); }, []);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await counterpartyApi.getHistory();
      setHistory(data);
    } catch (e) { console.error(e); } finally { setHistoryLoading(false); }
  };

  const handleCheck = async (e) => {
    e.preventDefault();
    if (bin.length !== 12) return;
    setLoading(true); setError('');
    try {
      const data = await counterpartyApi.check(bin);
      setResult(data);
      loadHistory();
    } catch (err) { setError(err.message || 'Ошибка проверки'); } finally { setLoading(false); }
  };

  const loadFromHistory = async (item) => {
    setLoading(true);
    try {
      const data = await counterpartyApi.getDetail(item.id);
      setResult(data);
      setBin(item.bin_number);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  return (
    <div className="h-full bg-[#050505] text-white font-sans selection:bg-white/20 relative lg:overflow-hidden overflow-y-auto custom-scrollbar flex flex-col">
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="max-w-7xl mx-auto w-full px-4 sm:px-8 flex-1 flex flex-col relative z-10 pb-6 lg:min-h-0"
      >
        
        {/* Dynamic Header / Hero Area */}
        <motion.div 
          variants={itemVariants}
          className="flex flex-col items-center justify-center pt-12 pb-8 text-center shrink-0"
          layout
          animate={{ paddingTop: result ? '2rem' : '10vh' }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/10 mb-6">
            <ShieldCheck size={14} className="text-white/40" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Государственные реестры РК</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-white">
            Анализ контрагентов
          </h1>
          {!result && (
            <p className="text-neutral-400 max-w-xl mx-auto leading-relaxed">
              Мгновенная проверка юридических лиц по открытым базам данных. Оцените риски, налоговые задолженности и статус компании.
            </p>
          )}

          <div className="w-full max-w-2xl mt-8">
            <form onSubmit={handleCheck} className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="text" value={bin}
                  onChange={e => { setBin(e.target.value.replace(/\D/g, '').slice(0, 12)); if (result) setResult(null); }}
                  placeholder="Введите БИН компании (12 цифр)"
                  className="w-full h-16 bg-white/[0.02] rounded-full border border-white/5 pl-14 pr-16 text-base text-white placeholder-neutral-600 focus:border-white/20 focus:bg-white/5 outline-none transition-all font-mono tracking-[0.1em] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]"
                />
                <span className={`absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black tracking-widest ${bin.length === 12 ? 'text-white' : 'text-neutral-600'}`}>
                  {bin.length}/12
                </span>
              </div>
              <button type="submit" disabled={bin.length !== 12 || loading}
                className="px-10 h-16 rounded-full bg-white text-black text-xs font-black uppercase tracking-widest hover:bg-neutral-200 disabled:bg-white/10 disabled:text-neutral-500 disabled:cursor-not-allowed transition-all active:scale-95 shadow-[0_10px_40px_rgba(255,255,255,0.15)] disabled:shadow-none">
                {loading ? 'Анализ...' : 'Проверить'}
              </button>
            </form>
            {error && (
              <div className="mt-6 rounded-2xl bg-red-500/5 border border-red-500/10 p-4 text-sm font-bold text-red-400 flex items-center justify-center gap-2">
                <AlertCircle size={16} /> {error}
              </div>
            )}
          </div>
        </motion.div>

        {/* Empty State / Defaults */}
        {!result && (
          <motion.div 
            variants={itemVariants}
            className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 overflow-y-auto custom-scrollbar pb-12 px-2"
          >
            {[
              { icon: <ShieldCheck size={20} className="text-white" />, title: 'Надежность', desc: 'Проверка налоговых задолженностей и статуса в реестре.' },
              { icon: <BarChart3 size={20} className="text-neutral-400" />, title: 'Аналитика рисков', desc: 'Оценка вероятности банкротства и судебных споров.' },
              { icon: <Zap size={20} className="text-neutral-600" />, title: 'Мгновенно', desc: 'Прямой доступ к государственным базам (КГД МФ РК).' },
            ].map((f, i) => (
              <motion.div 
                key={i} 
                variants={itemVariants}
                className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 shadow-2xl flex flex-col items-center text-center hover:bg-white/[0.04] transition-all"
              >
                <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-center mb-6 shadow-inner">
                  {f.icon}
                </div>
                <h3 className="text-base font-black text-white tracking-tight mb-3">{f.title}</h3>
                <p className="text-[13px] text-neutral-500 font-medium leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Results Layout */}
        <AnimatePresence mode="wait">
          {result && !loading && (
            <motion.div 
              key="results"
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
              variants={containerVariants}
              className="w-full flex flex-col-reverse lg:flex-row gap-8 pb-4 lg:flex-1 lg:min-h-0"
            >
              
              {/* ── Left Pane: Sticky Sidebar (History) ── */}
              <motion.div variants={itemVariants} className="lg:w-[30%] flex flex-col gap-6 lg:min-h-0 lg:h-full shrink-0">
                <div className="bg-[#050505] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] rounded-[2.5rem] p-6 lg:p-8 flex flex-col lg:min-h-0 h-full max-h-[400px] lg:max-h-none">
                  <div className="flex items-center justify-between mb-8 shrink-0">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-500 flex items-center gap-3">
                      <Clock size={14} /> История запросов
                    </h3>
                  </div>
                  
                  {historyLoading ? (
                    <div className="space-y-4">
                      {[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-[1.5rem] bg-white/5 animate-pulse" />)}
                    </div>
                  ) : history.length === 0 ? (
                    <div className="py-12 flex flex-col items-center text-center">
                      <div className="w-16 h-16 rounded-full bg-white/[0.02] flex items-center justify-center mb-4">
                        <Zap size={20} className="text-neutral-600" />
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">История пуста</p>
                    </div>
                  ) : (
                    <div className="space-y-3 min-h-0 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                      {history.map((item) => (
                        <button key={item.id} onClick={() => loadFromHistory(item)}
                          className="w-full text-left p-5 rounded-[1.5rem] bg-white/[0.02] hover:bg-white/[0.05] transition-all group outline-none border border-transparent hover:border-white/5">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-mono font-bold text-neutral-500 tracking-wider group-hover:text-neutral-400 transition-colors">{item.bin_number}</span>
                            <ChevronRight size={14} className="text-neutral-600 group-hover:text-white transition-colors" />
                          </div>
                          <p className="text-sm font-black text-white truncate mb-1">{item.company_name || 'Неизвестная компания'}</p>
                          <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-600">{new Date(item.created_at).toLocaleDateString('ru')}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>

              {/* ── Right Pane: Scrollable Content ── */}
              <motion.div variants={itemVariants} className="lg:w-[70%] flex flex-col gap-8 lg:min-h-0 lg:overflow-y-auto custom-scrollbar lg:pr-4 pb-12">
                
                {/* Header Profile Card */}
                <div className="shrink-0 rounded-[3rem] bg-gradient-to-br from-white/[0.04] to-transparent border border-white/5 p-6 lg:p-14 flex flex-col md:flex-row items-center justify-between gap-8 hover:bg-white/[0.02] transition-all cursor-default shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/[0.02] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                  
                  <div className="relative z-10 flex-1 w-full text-center md:text-left">
                    <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/[0.03] border border-white/10 mb-6 lg:mb-8 mx-auto md:mx-0">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">Досье компании</span>
                    </div>
                    <h2 className="text-3xl lg:text-5xl font-black tracking-tight text-white mb-6 leading-tight pb-2">{result.companyName}</h2>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs font-bold uppercase tracking-widest">
                      <span className="font-mono text-neutral-400 bg-white/5 px-4 py-2 rounded-xl">БИН: {result.bin}</span>
                      <span className={`px-4 py-2 rounded-xl border ${result.status === 'Действующее' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                        {result.status}
                      </span>
                    </div>
                  </div>

                  <div className="text-center md:text-right flex flex-col items-center md:items-end justify-center bg-[#050505] p-6 lg:p-8 rounded-[2rem] border border-white/5 shadow-xl shrink-0 mt-6 md:mt-0 w-full md:w-auto">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-3">AI Индекс Доверия</span>
                    <span className="text-5xl lg:text-6xl font-black text-white">{result.riskLevel}</span>
                  </div>
                </div>

                {/* Content Grid */}
                <div className="shrink-0 grid grid-cols-1 lg:grid-cols-2 gap-8">
                  
                  {/* Radar Card */}
                  <motion.div variants={itemVariants} className="shrink-0 rounded-[2.5rem] bg-[#050505] border border-white/5 shadow-2xl p-8 lg:p-10 flex flex-col w-full self-start hover:bg-white/[0.04] transition-all">
                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-8">
                      <Target size={14} /> Матрица Рисков
                    </div>
                    <div className="w-full flex items-center justify-center">
                      <RadarChart scores={computeRadarScores(result)} size={280} />
                    </div>
                  </motion.div>

                  <div className="flex flex-col gap-8">
                    {/* Basic Info */}
                    <div className="rounded-[2.5rem] bg-white/[0.02] border border-white/5 shadow-2xl p-8 lg:p-10 flex-1 hover:bg-white/[0.04] transition-all">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-8 flex items-center gap-3">
                        <Building2 size={14} /> Основные сведения
                      </h3>
                      <div className="space-y-6">
                        {[
                          { label: 'Регистрация', value: result.registrationDate },
                          { label: 'Руководитель', value: result.director },
                          { label: 'Юр. адрес', value: result.address },
                        ].map((item, idx) => (
                          <div key={idx} className="flex flex-col gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">{item.label}</span>
                            <span className="text-base font-medium text-white">{item.value || '—'}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Financial Stats Grid */}
                    <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="rounded-[2.5rem] bg-white/[0.02] border border-white/5 shadow-2xl p-8 flex flex-col justify-center hover:bg-white/[0.04] transition-all">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-3">Налоговый долг</span>
                        <span className="text-2xl lg:text-3xl font-black text-white leading-tight break-words">{result.taxDebt === '0 ₸' ? 'Нет долгов' : (result.taxDebt || 'Не найдено')}</span>
                      </div>
                      <div className="rounded-[2.5rem] bg-white/[0.02] border border-white/5 shadow-2xl p-8 flex flex-col justify-center hover:bg-white/[0.04] transition-all">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-3">Штат</span>
                        <span className="text-xl lg:text-2xl font-black text-white leading-tight break-words">{result.employees || '—'}</span>
                      </div>
                    </motion.div>
                  </div>

                </div>

                {/* Activity Box */}
                <motion.div variants={itemVariants} className="shrink-0 rounded-[2.5rem] bg-white/[0.02] border border-white/5 shadow-2xl p-8 lg:p-12 mb-12 hover:bg-white/[0.04] transition-all">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-6 flex items-center gap-3">
                    <BarChart3 size={14} /> Вид деятельности (ОКЭД)
                  </h3>
                  <p className="text-lg font-medium text-white/80 leading-relaxed">
                    {result.activity || 'Нет данных о деятельности.'}
                  </p>
                </motion.div>
                
              </motion.div>

            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
}
