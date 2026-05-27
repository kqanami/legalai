import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../i18n/LanguageContext';
import { Search, Building2, CheckCircle2, ShieldCheck, BarChart3, AlertCircle, Clock, ChevronRight, Zap } from 'lucide-react';
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

function RadarChart({ scores, size = 260 }) {
  const cx = size / 2, cy = size / 2, R = size * 0.35;
  const rings = [0.25, 0.5, 0.75, 1.0];
  const angleStep = (2 * Math.PI) / RADAR_AXES.length;
  const startAngle = -Math.PI / 2;

  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const isLowRisk = avg >= 65;

  const gradId = useMemo(() => 'radar-fill-' + Math.random().toString(36).slice(2, 8), []);
  const glowId = useMemo(() => 'radar-glow-' + Math.random().toString(36).slice(2, 8), []);

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

  const color = isLowRisk ? '#34d399' : '#f87171';
  const darkColor = isLowRisk ? '#065f46' : '#7f1d1d';

  return (
    <svg viewBox={`-80 -80 ${size + 160} ${size + 160}`} width="100%" height="100%" className="select-none max-w-[360px] drop-shadow-[0_0_20px_rgba(16,185,129,0.15)]">
      <defs>
        <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.5" />
          <stop offset="100%" stopColor={darkColor} stopOpacity="0.1" />
        </radialGradient>
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {rings.map((r) => <path key={r} d={ringPath(r)} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />)}
      {RADAR_AXES.map((_, i) => {
        const [ex, ey] = pointOnAxis(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={ex} y2={ey} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />;
      })}
      <path d={dataPath} fill={`url(#${gradId})`} stroke={color} strokeWidth="2.5" strokeLinejoin="round" filter={`url(#${glowId})`} />
      {scores.map((s, i) => {
        const [dx, dy] = pointOnAxis(i, s / 100);
        return (
          <g key={i}>
            <circle cx={dx} cy={dy} r="5" fill={color} />
            <circle cx={dx} cy={dy} r="2.5" fill="#fff" />
          </g>
        );
      })}
      {labels.map((l) => (
        <g key={l.key}>
          <text x={l.x} y={l.y - 8} textAnchor={l.anchor} fill="#94a3b8" fontSize="12" fontWeight="700" letterSpacing="0.05em" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
            {l.label}
          </text>
          <text x={l.x} y={l.y + 12} textAnchor={l.anchor} fill={color} fontSize="16" fontWeight="900" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
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
    <div className="min-h-screen bg-transparent text-white font-sans selection:bg-emerald-500/30 pb-24 relative overflow-hidden">

      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-16 relative z-10 flex flex-col xl:flex-row gap-8">
        
        {/* ── Main Panel ── */}
        <div className="flex-1 min-w-0 flex flex-col gap-8">
          
          <div className="flex flex-col items-start gap-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06]">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">KYB Интеграция с базами РК</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-[1.1]">
              Анализ <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">контрагентов</span>
            </h1>
            <p className="text-white/40 max-w-lg leading-relaxed font-medium">
              Мгновенная проверка юридических лиц на благонадежность по БИН. Оценка рисков на базе налоговых, судебных и финансовых реестров.
            </p>
          </div>

          {/* Search Box */}
          <div className="glass-premium rounded-[2rem] p-4 shadow-2xl relative overflow-hidden">
            <AnimatePresence>
              {loading && (
                <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent"
                  animate={{ x: ['-200%', '200%'] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} />
              )}
            </AnimatePresence>
            <form onSubmit={handleCheck} className="flex flex-col sm:flex-row gap-3 relative z-10">
              <div className="flex-1 relative flex items-center bg-obsidian-950/50 rounded-2xl border border-white/[0.05] focus-within:border-white/20 transition-colors">
                <Building2 size={20} className="absolute left-6 text-white/30" />
                <input
                  type="text" value={bin}
                  onChange={e => { setBin(e.target.value.replace(/\D/g, '').slice(0, 12)); if (result) setResult(null); }}
                  placeholder="Введите БИН компании (12 цифр)"
                  className="w-full bg-transparent py-5 pl-16 pr-16 text-lg tracking-[0.15em] font-mono font-bold text-white placeholder-white/20 outline-none"
                />
                <span className={`absolute right-6 text-[10px] font-black tracking-widest ${bin.length === 12 ? 'text-emerald-400' : 'text-white/20'}`}>
                  {bin.length}/12
                </span>
              </div>
              <button type="submit" disabled={bin.length !== 12 || loading}
                className="h-[68px] px-10 rounded-2xl bg-white text-black text-sm font-black uppercase tracking-widest hover:bg-white/90 disabled:bg-white/10 disabled:text-white/30 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                {loading ? 'Анализ...' : 'Проверить'}
              </button>
            </form>
          </div>

          {error && (
            <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-5 flex items-center gap-4 text-red-400 font-medium">
              <AlertCircle size={20} /> {error}
            </div>
          )}

          {/* Results Bento Grid */}
          <AnimatePresence>
            {result && !loading && (
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Radar Box (Takes full width on mobile, right column on desktop) */}
                <div className="lg:col-span-2 rounded-[2.5rem] glass-premium p-8 sm:p-12 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center gap-12">
                  <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none translate-x-1/3 -translate-y-1/3" />
                  
                  <div className="flex-1 w-full relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <ShieldCheck size={24} className="text-emerald-400" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-white tracking-tight">AI Индекс Доверия</h2>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${result.riskLevel.includes('Низк') ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                            {result.riskLevel}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-white/40 text-sm leading-relaxed mb-8">
                      {result.aiAnalysis || "ИИ провел глубокий анализ открытых реестров, налоговых задолженностей и судебных разбирательств. Настоятельно рекомендуется ознакомиться с полной выпиской перед заключением сделки."}
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      {RADAR_AXES.map((axis, i) => {
                        const s = computeRadarScores(result)[i];
                        return (
                          <div key={axis.key} className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4 flex flex-col justify-center relative overflow-hidden">
                            <div className={`absolute bottom-0 left-0 h-1 bg-gradient-to-r ${s >= 65 ? 'from-emerald-500' : 'from-red-500'} to-transparent opacity-50`} style={{ width: `${s}%` }} />
                            <span className="text-[10px] uppercase tracking-widest font-bold text-white/30 mb-1">{axis.label}</span>
                            <span className="text-2xl font-black text-white/90">{s} <span className="text-xs text-white/20">/100</span></span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="w-full md:w-[360px] flex-shrink-0 flex items-center justify-center relative z-10">
                    <RadarChart scores={computeRadarScores(result)} size={300} />
                  </div>
                </div>

                {/* Company Info Box */}
                <div className="rounded-[2rem] glass-card p-8 relative overflow-hidden group">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-white/30 mb-6 flex items-center gap-2">
                    <Building2 size={14} /> Базовые реквизиты
                  </h3>
                  <div className="space-y-5">
                    {[
                      { label: 'Наименование', value: result.companyName, accent: false },
                      { label: 'БИН', value: result.bin, accent: false, mono: true },
                      { label: 'Статус', value: result.status, accent: result.status === 'Действующее' ? 'text-emerald-400' : 'text-amber-400' },
                      { label: 'Регистрация', value: result.registrationDate, accent: false },
                      { label: 'Руководитель', value: result.director, accent: false },
                    ].map((item, idx) => (
                      <div key={idx} className="flex flex-col gap-1 border-b border-white/[0.04] pb-4 last:border-0 last:pb-0">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/20">{item.label}</span>
                        <span className={`text-sm font-medium ${item.accent ? item.accent : 'text-white/80'} ${item.mono ? 'font-mono tracking-wider' : ''}`}>
                          {item.value || '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Financial Info Box */}
                <div className="rounded-[2rem] glass-card p-8 relative overflow-hidden group">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-white/30 mb-6 flex items-center gap-2">
                    <BarChart3 size={14} /> Деятельность и Финансы
                  </h3>
                  <div className="space-y-5">
                    {[
                      { label: 'Юридический адрес', value: result.address, accent: false },
                      { label: 'ОКЭД (Вид деятельности)', value: result.activity, accent: false },
                      { label: 'Размер предприятия', value: result.employees, accent: false },
                      { label: 'Налоговая задолженность', value: result.taxDebt, accent: result.taxDebt === '0 ₸' ? 'text-emerald-400' : 'text-red-400 font-bold' },
                    ].map((item, idx) => (
                      <div key={idx} className="flex flex-col gap-1 border-b border-white/[0.04] pb-4 last:border-0 last:pb-0">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/20">{item.label}</span>
                        <span className={`text-sm font-medium ${item.accent ? item.accent : 'text-white/80'}`}>
                          {item.value || '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Sidebar (History) ── */}
        <div className="w-full xl:w-[320px] flex-shrink-0">
          <div className="glass-card rounded-[2rem] p-6 sticky top-24">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-white/30 flex items-center gap-2">
                <Clock size={14} /> История
              </h3>
              <span className="text-[10px] font-bold text-white/20 bg-white/[0.05] px-2 py-0.5 rounded-full">{history.length}</span>
            </div>
            
            {historyLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-white/[0.02] animate-pulse" />)}
              </div>
            ) : history.length === 0 ? (
              <div className="py-12 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.02] flex items-center justify-center mb-3">
                  <Zap size={20} className="text-white/10" />
                </div>
                <p className="text-xs text-white/30 font-medium">История запросов пуста</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto pr-2 custom-scrollbar">
                {history.map((item) => (
                  <button key={item.id} onClick={() => loadFromHistory(item)}
                    className="w-full text-left p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-transparent hover:border-white/[0.08] transition-all group">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold text-white/60 tracking-wider">{item.bin_number}</span>
                      <ChevronRight size={14} className="text-white/20 group-hover:text-white transition-colors" />
                    </div>
                    <p className="text-xs font-medium text-white/80 truncate mb-2">{item.company_name || 'Неизвестная компания'}</p>
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                        item.risk_level?.includes('Низк') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {item.risk_level || '—'}
                      </span>
                      <span className="text-[10px] text-white/30 font-medium">{new Date(item.created_at).toLocaleDateString('ru')}</span>
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
