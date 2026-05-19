import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../i18n/LanguageContext';
import { Search, Building2, CheckCircle2, ShieldCheck, Download, BarChart3, AlertCircle, Clock, ChevronRight } from 'lucide-react';
import MagneticButton from '../components/MagneticButton';
import { counterpartyApi } from '../services/api';

/* ─── Pure SVG Radar Chart ─────────────────────────────────────── */
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

function RadarChart({ scores, size = 220 }) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.38;          // max radius
  const rings = [0.25, 0.5, 0.75, 1.0];
  const N = RADAR_AXES.length;
  const angleStep = (2 * Math.PI) / N;
  const startAngle = -Math.PI / 2; // top

  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const isLowRisk = avg >= 65;

  // Unique gradient id per instance
  const gradId = useMemo(() => 'radar-fill-' + Math.random().toString(36).slice(2, 8), []);
  const glowId = useMemo(() => 'radar-glow-' + Math.random().toString(36).slice(2, 8), []);

  const pointOnAxis = (i, pct) => {
    const angle = startAngle + i * angleStep;
    return [
      cx + R * pct * Math.cos(angle),
      cy + R * pct * Math.sin(angle),
    ];
  };

  // Pentagon ring path
  const ringPath = (pct) =>
    RADAR_AXES.map((_, i) => pointOnAxis(i, pct))
      .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`)
      .join(' ') + ' Z';

  // Data polygon
  const dataPath = scores
    .map((s, i) => pointOnAxis(i, s / 100))
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(' ') + ' Z';

  // Label positions — nudged outward
  const labelOffset = 1.22;
  const labels = RADAR_AXES.map((axis, i) => {
    const [lx, ly] = pointOnAxis(i, labelOffset);
    let anchor = 'middle';
    const angle = startAngle + i * angleStep;
    if (Math.cos(angle) < -0.1) anchor = 'end';
    else if (Math.cos(angle) > 0.1) anchor = 'start';
    return { ...axis, x: lx, y: ly, anchor, score: scores[i] };
  });

  const accentColor = isLowRisk ? '#34d399' : '#f87171'; // emerald-400 / red-400
  const accentDark  = isLowRisk ? '#065f46' : '#7f1d1d';

  return (
    <svg
      viewBox={`-50 -50 ${size + 100} ${size + 100}`}
      width="100%"
      height="100%"
      className="select-none max-w-[280px]"
      style={{ filter: `drop-shadow(0 0 18px ${isLowRisk ? 'rgba(16,185,129,0.15)' : 'rgba(248,113,113,0.15)'})` }}
    >
      <defs>
        <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
          <stop offset="0%"  stopColor={accentColor} stopOpacity="0.45" />
          <stop offset="100%" stopColor={accentDark}  stopOpacity="0.10" />
        </radialGradient>
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Grid rings */}
      {rings.map((r) => (
        <path key={r} d={ringPath(r)} fill="none" stroke="rgba(148,163,184,0.10)" strokeWidth="1" />
      ))}

      {/* Axis lines */}
      {RADAR_AXES.map((_, i) => {
        const [ex, ey] = pointOnAxis(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={ex} y2={ey} stroke="rgba(148,163,184,0.10)" strokeWidth="1" />;
      })}

      {/* Data fill */}
      <path d={dataPath} fill={`url(#${gradId})`} stroke={accentColor} strokeWidth="2" strokeLinejoin="round" filter={`url(#${glowId})`} />

      {/* Data dots */}
      {scores.map((s, i) => {
        const [dx, dy] = pointOnAxis(i, s / 100);
        return (
          <g key={i}>
            <circle cx={dx} cy={dy} r="4" fill={accentColor} opacity="0.9" />
            <circle cx={dx} cy={dy} r="2" fill="#fff" opacity="0.8" />
          </g>
        );
      })}

      {/* Labels + score */}
      {labels.map((l) => (
        <g key={l.key}>
          <text x={l.x} y={l.y - 5} textAnchor={l.anchor} fill="#94a3b8" fontSize="10" fontWeight="600" fontFamily="ui-monospace, monospace">
            {l.label}
          </text>
          <text x={l.x} y={l.y + 9} textAnchor={l.anchor} fill={accentColor} fontSize="11" fontWeight="700" fontFamily="ui-monospace, monospace">
            {l.score}
          </text>
        </g>
      ))}
    </svg>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } }
};

export default function CounterpartyPage() {
  const { t } = useLanguage();
  const [bin, setBin] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await counterpartyApi.getHistory();
      setHistory(data);
    } catch (e) {
      console.error('History load error:', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleCheck = async (e) => {
    e.preventDefault();
    if (bin.length !== 12) return;
    setLoading(true);
    setError('');
    try {
      const data = await counterpartyApi.check(bin);
      setResult(data);
      loadHistory(); // Refresh history after new check
    } catch (err) {
      setError(err.message || 'Ошибка проверки');
    } finally {
      setLoading(false);
    }
  };

  const loadFromHistory = async (item) => {
    try {
      const data = await counterpartyApi.getDetail(item.id);
      setResult(data);
      setBin(item.bin_number);
    } catch (e) {
      setError(e.message);
    }
  };

  const riskColor = (level) => {
    if (!level) return 'text-steel-400';
    const l = level.toLowerCase();
    if (l.includes('низк') || l === 'low') return 'text-emerald-400';
    if (l.includes('средн') || l === 'medium') return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-8 mt-4 pb-20">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
            
            {/* Header */}
            <motion.div variants={itemVariants} className="text-center sm:text-left mb-8">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center justify-center sm:justify-start gap-4 mb-2">
                <Search className="text-chrome-400" size={36} strokeWidth={2.5} />
                {t('counterparty_title')}
              </h1>
              <p className="text-steel-400 text-sm tracking-wide">Проверка юридических лиц по базам данных Республики Казахстан на предмет рисков.</p>
            </motion.div>

            {/* Search Form */}
            <motion.div variants={itemVariants} className="glass-card p-2 sm:p-2 overflow-hidden shadow-2xl">
              <AnimatePresence>
                {bin.length > 0 && !result && (
                  <motion.div
                    className="absolute top-0 bottom-0 w-32 bg-gradient-to-r from-transparent via-chrome-500/20 to-transparent skew-x-12 opacity-50"
                    animate={{ x: ['-200%', '800%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  />
                )}
              </AnimatePresence>

              <form onSubmit={handleCheck} className="flex flex-col sm:flex-row gap-3 relative z-10 w-full">
                <div className="flex-1 relative flex items-center">
                  <div className="absolute left-6 text-steel-500"><Building2 size={24} /></div>
                  <input
                    type="text" value={bin}
                    onChange={(e) => { const val = e.target.value.replace(/\D/g, '').slice(0, 12); setBin(val); if (result) setResult(null); }}
                    placeholder={t('counterparty_placeholder')}
                    className="w-full bg-obsidian-950/50 border border-obsidian-800 focus:border-chrome-500/50 rounded-xl py-6 pl-16 pr-16 text-xl tracking-[0.2em] font-mono text-white placeholder-obsidian-700 outline-none transition-all shadow-inner focus:shadow-[inset_0_2px_10px_rgba(0,0,0,0.5),0_0_15px_rgba(255,255,255,0.05)]"
                  />
                  <span className={`absolute right-6 text-xs font-mono font-bold tracking-widest ${bin.length === 12 ? 'text-emerald-400' : 'text-steel-600'}`}>
                    {bin.length}/12
                  </span>
                </div>
                <MagneticButton type="submit" disabled={bin.length !== 12 || loading}
                  className={`h-auto px-10 rounded-xl flex items-center justify-center border font-bold tracking-widest text-sm uppercase transition-all duration-300
                    ${bin.length === 12 && !loading 
                      ? 'btn-primary chrome-gradient text-obsidian-950 shadow-[0_0_20px_rgba(255,255,255,0.15)]' 
                      : 'bg-obsidian-800 border-obsidian-700/50 text-steel-500 cursor-not-allowed opacity-50 grayscale'}`}
                  strength={0.2}>
                  {loading ? (
                    <span className="flex items-center gap-3">
                      <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Ожидание...
                    </span>
                  ) : t('counterparty_check')}
                </MagneticButton>
              </form>
            </motion.div>

            {/* Loading */}
            <AnimatePresence>
              {loading && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="glass-card p-8 border border-chrome-500/30 bg-obsidian-900 shadow-[inset_0_0_50px_rgba(255,255,255,0.02)] flex flex-col items-center justify-center text-center overflow-hidden">
                  <div className="w-16 h-1 rounded-full bg-obsidian-800 overflow-hidden mb-6 relative">
                    <motion.div className="absolute left-0 top-0 bottom-0 bg-chrome-400 shadow-[0_0_10px_#fff]"
                      animate={{ width: ['0%', '100%'] }} transition={{ duration: 2, ease: "easeInOut" }} />
                  </div>
                  <p className="font-mono text-chrome-400 text-sm tracking-widest animate-pulse">ОБРАЩЕНИЕ К БАЗЕ ДАННЫХ...</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            {error && (
              <div className="glass-card p-4 border border-red-500/30 text-red-400 text-sm flex items-center gap-3">
                <AlertCircle size={18} /> {error}
              </div>
            )}

            {/* Results */}
            <AnimatePresence>
              {result && !loading && (
                <motion.div initial={{ opacity: 0, y: 40, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 100 }}>
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-obsidian-700">
                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                      <CheckCircle2 className="text-emerald-400" /> {t('counterparty_result')}
                    </h2>
                    <span className="segment-b2b flex items-center gap-1"><Building2 size={12}/> B2B</span>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6 mb-6">
                    <div className="glass-card p-6 shadow-xl">
                      <h3 className="text-xs text-steel-500 uppercase tracking-widest font-bold mb-5 flex items-center gap-2">
                        <Building2 size={14} className="text-chrome-400" /> Основная информация
                      </h3>
                      <div className="space-y-4">
                        {[['Наименование', result.companyName], ['БИН', result.bin],
                          ['Статус', result.status, result.status === 'Действующее' ? 'text-emerald-400' : 'text-amber-400'],
                          ['Дата регистрации', result.registrationDate], ['Руководитель', result.director],
                        ].map(([label, value, colorClass]) => (
                          <div key={label} className="flex justify-between items-center border-b border-obsidian-800/50 pb-2">
                            <span className="text-xs text-steel-500">{label}</span>
                            <span className={`text-sm font-medium ${colorClass || 'text-chrome-100'} text-right max-w-[60%]`}>{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="glass-card p-6 shadow-xl">
                      <h3 className="text-xs text-steel-500 uppercase tracking-widest font-bold mb-5 flex items-center gap-2">
                        <BarChart3 size={14} className="text-chrome-400" /> Детали компании
                      </h3>
                      <div className="space-y-4">
                        {[['Адрес', result.address], ['Вид деятельности', result.activity],
                          ['Кол-во сотрудников', result.employees],
                          ['Налоговая задолженность', result.taxDebt, result.taxDebt === '0 ₸' ? 'text-emerald-400' : 'text-red-400'],
                        ].map(([label, value, colorClass]) => (
                          <div key={label} className="flex flex-col sm:flex-row justify-between sm:items-center gap-1 border-b border-obsidian-800/50 pb-2">
                            <span className="text-xs text-steel-500">{label}</span>
                            <span className={`text-sm font-medium ${colorClass || 'text-chrome-100'} sm:text-right max-w-[80%]`}>{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Risk + Radar */}
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', damping: 22, stiffness: 90, delay: 0.25 }}
                    className="glass-premium p-6 border border-emerald-500/10 shadow-[0_0_50px_rgba(16,185,129,0.02)] relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                    <h3 className="text-xs text-steel-500 uppercase tracking-widest font-bold mb-6 flex items-center gap-2">
                      <ShieldCheck size={14} className="text-emerald-400" /> AI Оценка рисков
                    </h3>

                    <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8 relative z-10">
                      {/* Left: text info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-5 mb-4">
                          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                            <ShieldCheck size={32} className="text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-xl font-bold text-emerald-400 mb-1 tracking-wide">Уровень риска: {result.riskLevel}</p>
                            <p className="text-sm text-steel-400 font-medium">Контрагент прошёл первичную проверку ИИ.</p>
                          </div>
                        </div>

                        {/* Mini score breakdown */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                          {(() => {
                            const s = computeRadarScores(result);
                            return RADAR_AXES.map((axis, i) => (
                              <div key={axis.key} className="flex items-center gap-2 bg-obsidian-900/60 rounded-lg px-3 py-2 border border-obsidian-800/60">
                                <span className={`text-lg font-bold font-mono ${s[i] >= 65 ? 'text-emerald-400' : s[i] >= 45 ? 'text-amber-400' : 'text-red-400'}`}>{s[i]}</span>
                                <span className="text-[10px] text-steel-500 leading-tight">{axis.label}</span>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>

                      {/* Right: Radar Chart */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.7, rotate: -15 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', damping: 18, stiffness: 80, delay: 0.5 }}
                        className="flex-shrink-0 mx-auto lg:mx-0"
                      >
                        <RadarChart scores={computeRadarScores(result)} size={220} />
                      </motion.div>
                    </div>

                    {result.aiAnalysis && (
                      <p className="mt-4 text-sm text-steel-400 border-t border-obsidian-700/50 pt-4">{result.aiAnalysis}</p>
                    )}
                    <p className="mt-4 text-[10px] text-steel-500 italic text-center">
                      * Данные получены из открытых источников методом ИИ-поиска. Рекомендуется сверка с egov.kz.
                    </p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* History sidebar */}
        <div className="w-full lg:w-72 flex-shrink-0">
          <div className="glass-card p-5 sticky top-24 shadow-2xl">
            <h3 className="text-xs text-steel-500 uppercase tracking-widest font-bold mb-4 flex items-center gap-2">
              <Clock size={14} className="text-chrome-400" /> История проверок
            </h3>
            {historyLoading ? (
              <p className="text-xs text-steel-600 animate-pulse">Загрузка...</p>
            ) : history.length === 0 ? (
              <p className="text-xs text-steel-600">Пока нет проверок</p>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {history.map((item) => (
                  <button key={item.id} onClick={() => loadFromHistory(item)}
                    className="w-full text-left p-3 rounded-xl bg-obsidian-800/40 hover:bg-obsidian-800/80 border border-transparent hover:border-obsidian-600/50 transition-all duration-200 group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-chrome-300 tracking-wider">{item.bin_number}</span>
                      <ChevronRight size={12} className="text-steel-600 group-hover:text-chrome-400 transition-colors" />
                    </div>
                    <p className="text-xs text-steel-400 truncate">{item.company_name || 'Компания'}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-[10px] font-bold ${riskColor(item.risk_level)}`}>{item.risk_level || '—'}</span>
                      <span className="text-[10px] text-steel-600">{new Date(item.created_at).toLocaleDateString('ru')}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
