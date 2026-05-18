import { useState, useEffect } from 'react';
import { adminApi } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Users, Server, Zap, RefreshCw, LogIn, Shield, Trash2, CheckCircle, XCircle, AlertCircle, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [escalations, setEscalations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [scraperStatus, setScraperStatus] = useState({ is_running: false, current_key: null, logs: [] });
  const [selectedKey, setSelectedKey] = useState('all');
  const [scraperLoading, setScraperLoading] = useState(false);
  const navigate = useNavigate();
  const { addToast } = useToast();

  useEffect(() => {
    loadData();
  }, [activeTab]);

  // Poll scraper status in real-time when the scraper tab is active
  useEffect(() => {
    let interval = null;
    
    const fetchStatus = async () => {
      try {
        const data = await adminApi.getScraperStatus();
        setScraperStatus(data);
      } catch (e) {
        console.error('Failed to fetch scraper status', e);
      }
    };

    if (activeTab === 'scraper') {
      fetchStatus();
      interval = setInterval(fetchStatus, 1500);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview') {
        const data = await adminApi.getStats();
        setStats(data);
      } else if (activeTab === 'users') {
        const data = await adminApi.getUsers();
        setUsers(data);
      } else if (activeTab === 'lawyers') {
        const data = await adminApi.getLawyers();
        setLawyers(data);
      } else if (activeTab === 'escalations') {
        const data = await adminApi.getEscalations();
        setEscalations(data);
      }
    } catch (e) {
      console.error('Failed to load admin data', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await adminApi.seedDatabase();
      addToast(res.message, 'success');
      loadData();
    } catch (e) {
      addToast('Ошибка: ' + e.message, 'error');
    } finally {
      setSeeding(false);
    }
  };

  const handleImpersonate = async (userId, role) => {
    try {
      await adminApi.impersonate(userId);
      window.location.href = role === 'lawyer' ? '/lawyer' : '/dashboard';
    } catch (e) {
      addToast('Ошибка входа: ' + e.message, 'error');
    }
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await adminApi.deleteUser(userToDelete);
      setUsers(users.filter(u => u.id !== userToDelete));
      addToast('Пользователь удален', 'success');
    } catch (e) {
      addToast('Ошибка: ' + e.message, 'error');
    } finally {
      setUserToDelete(null);
    }
  };

  const handleVerifyLawyer = async (lawyerId, verifyStatus) => {
    try {
      await adminApi.verifyLawyer(lawyerId, verifyStatus);
      setLawyers(lawyers.map(l => l.id === lawyerId ? { ...l, verified: verifyStatus } : l));
      addToast(verifyStatus ? 'Галочка выдана' : 'Галочка отозвана', 'success');
    } catch (e) {
      addToast('Ошибка: ' + e.message, 'error');
    }
  };

  const handleStartScraper = async () => {
    setScraperLoading(true);
    try {
      const res = await adminApi.startScraper(selectedKey);
      addToast(res.detail, 'success');
      const data = await adminApi.getScraperStatus();
      setScraperStatus(data);
    } catch (e) {
      addToast('Ошибка запуска: ' + e.message, 'error');
    } finally {
      setScraperLoading(false);
    }
  };

  const handleStopScraper = async () => {
    setScraperLoading(true);
    try {
      const res = await adminApi.stopScraper();
      addToast(res.detail, 'success');
      const data = await adminApi.getScraperStatus();
      setScraperStatus(data);
    } catch (e) {
      addToast('Ошибка остановки: ' + e.message, 'error');
    } finally {
      setScraperLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'ОБЗОР', icon: <Server size={14} /> },
    { id: 'users', label: 'ПОЛЬЗОВАТЕЛИ', icon: <Users size={14} /> },
    { id: 'lawyers', label: 'ВЕРИФИКАЦИЯ', icon: <Shield size={14} /> },
    { id: 'escalations', label: 'ЭКСКАЛАЦИИ', icon: <RefreshCw size={14} /> },
    { id: 'scraper', label: 'ПАРСИНГ RAG', icon: <Database size={14} /> },
  ];

  return (
    <div className="min-h-screen bg-obsidian-950 p-6 md:p-10 font-mono text-sm">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/50 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.2)]">
            <Server size={24} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">System<span className="text-indigo-400">Admin</span></h1>
            <p className="text-xs text-steel-400">ПАНЕЛЬ УПРАВЛЕНИЯ ЭКОСИСТЕМОЙ</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-white/[0.05] mb-8 pb-px">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-6 py-3 font-bold uppercase tracking-wider transition-colors border-b-2 ${
                activeTab === t.id 
                  ? 'border-indigo-400 text-indigo-300 bg-indigo-500/5' 
                  : 'border-transparent text-steel-500 hover:text-steel-300'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center text-indigo-400 animate-pulse">Загрузка данных...</div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* TAB: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Всего юзеров', value: stats?.total_users, color: 'text-blue-400' },
                      { label: 'Юристов', value: `${stats?.total_lawyers} (${stats?.verified_lawyers} V)`, color: 'text-emerald-400' },
                      { label: 'Судебных дел', value: `${stats?.total_cases} (${stats?.active_cases} Act)`, color: 'text-amber-400' },
                      { label: 'Лидов AI', value: `${stats?.total_escalations} (${stats?.accepted_escalations} Acc)`, color: 'text-rose-400' },
                    ].map((s, i) => (
                      <div key={i} className="glass-card p-5 border border-white/[0.05]">
                        <div className={`text-[10px] font-bold tracking-widest uppercase mb-2 ${s.color}`}>{s.label}</div>
                        <div className="text-3xl font-black text-white">{s.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="glass-card p-6 border border-indigo-500/30 bg-indigo-500/5 flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-bold mb-1">Сгенерировать тестовые данные (Seed)</h3>
                      <p className="text-xs text-steel-400">Создаст 15 юристов с отзывами для тестирования.</p>
                    </div>
                    <button 
                      onClick={handleSeed}
                      disabled={seeding}
                      className="px-6 py-2 rounded bg-indigo-500 hover:bg-indigo-400 text-white font-bold flex items-center gap-2 disabled:opacity-50"
                    >
                      <Database size={16} /> {seeding ? 'Генерация...' : 'Запустить Seed'}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB: USERS */}
              {activeTab === 'users' && (
                <div className="bg-obsidian-900 rounded-xl border border-white/[0.05] overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-obsidian-950 text-steel-500 text-[10px] uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">ID / Дата</th>
                        <th className="px-4 py-3">Имя / Телефон</th>
                        <th className="px-4 py-3">Роль</th>
                        <th className="px-4 py-3 text-right">Действия</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.02]">
                      {users.map(u => (
                        <tr key={u.id} className="hover:bg-white/[0.02]">
                          <td className="px-4 py-3 text-steel-400">#{u.id}<br/><span className="text-[10px] opacity-50">{new Date(u.created_at).toLocaleDateString()}</span></td>
                          <td className="px-4 py-3 text-white">{u.name}<br/><span className="text-xs text-steel-500">{u.phone}</span></td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                              u.is_lawyer ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                            }`}>
                              {u.is_lawyer ? 'Юрист' : 'Гражданин'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right space-x-2">
                            <button onClick={() => handleImpersonate(u.id, u.is_lawyer ? 'lawyer' : 'citizen')} className="px-3 py-1 rounded bg-chrome-500/10 text-chrome-300 hover:bg-chrome-500 hover:text-obsidian-950 font-bold transition-colors">
                              Войти
                            </button>
                            <button onClick={() => setUserToDelete(u.id)} className="px-3 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white font-bold transition-colors">
                              Удалить
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB: LAWYERS VERIFICATION */}
              {activeTab === 'lawyers' && (
                <div className="bg-obsidian-900 rounded-xl border border-white/[0.05] overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-obsidian-950 text-steel-500 text-[10px] uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Юрист / ИИН</th>
                        <th className="px-4 py-3">Специализация</th>
                        <th className="px-4 py-3">Рейтинг / Win-Rate</th>
                        <th className="px-4 py-3">Статус</th>
                        <th className="px-4 py-3 text-right">Управление</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.02]">
                      {lawyers.map(l => (
                        <tr key={l.id} className="hover:bg-white/[0.02]">
                          <td className="px-4 py-3 text-white">{l.name}<br/><span className="text-[10px] text-steel-500">ИИН: {l.iin}</span></td>
                          <td className="px-4 py-3 text-steel-300">{l.specialization}</td>
                          <td className="px-4 py-3 text-chrome-300 font-bold">{l.rating} ⭐<br/><span className="text-[10px] text-emerald-400">WinRate: {(l.win_rate * 100).toFixed(0)}%</span></td>
                          <td className="px-4 py-3">
                            {l.verified ? (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400"><CheckCircle size={12}/> ВЕРИФИЦИРОВАН</span>
                            ) : (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400"><AlertCircle size={12}/> ОЖИДАЕТ</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {l.verified ? (
                              <button onClick={() => handleVerifyLawyer(l.id, false)} className="px-3 py-1 rounded bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-obsidian-950 font-bold transition-colors">
                                Отозвать галочку
                              </button>
                            ) : (
                              <button onClick={() => handleVerifyLawyer(l.id, true)} className="px-3 py-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-obsidian-950 font-bold transition-colors">
                                Выдать галочку
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB: ESCALATIONS */}
              {activeTab === 'escalations' && (
                <div className="bg-obsidian-900 rounded-xl border border-white/[0.05] overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-obsidian-950 text-steel-500 text-[10px] uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">ID / Дата</th>
                        <th className="px-4 py-3">Пользователь</th>
                        <th className="px-4 py-3">Категория / Срочность</th>
                        <th className="px-4 py-3">Статус</th>
                        <th className="px-4 py-3">Назначенный Юрист</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.02]">
                      {escalations.map(e => (
                        <tr key={e.id} className="hover:bg-white/[0.02]">
                          <td className="px-4 py-3 text-steel-400">#{e.id}<br/><span className="text-[10px]">{new Date(e.created_at).toLocaleDateString()}</span></td>
                          <td className="px-4 py-3 text-white font-medium">{e.user_name}</td>
                          <td className="px-4 py-3 text-chrome-300">{e.category}<br/><span className={`text-[10px] font-bold uppercase ${e.urgency === 'critical' ? 'text-red-400' : 'text-amber-400'}`}>{e.urgency}</span></td>
                          <td className="px-4 py-3">
                             <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                e.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-400' :
                                e.status === 'declined' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
                             }`}>
                                {e.status}
                             </span>
                          </td>
                          <td className="px-4 py-3 text-steel-400">{e.assigned_lawyer || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB: LEGISLATION SCRAPER & TERMINAL LOGS */}
              {activeTab === 'scraper' && (
                <div className="space-y-6">
                  <div className="glass-card p-6 border border-white/[0.05] bg-obsidian-900/50">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      <div>
                        <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                          <Database size={18} className="text-indigo-400" />
                          Фоновый импорт и парсинг законодательства РК (RAG)
                        </h2>
                        <p className="text-xs text-steel-400 max-w-xl leading-relaxed">
                          Скрипт подключается к официальному порталу adilet.zan.kz, скачивает нормативно-правовые акты РК, парсит их на отдельные статьи и загружает в векторную базу знаний ChromaDB с лимитом Gemini API.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 shrink-0">
                        <div className="relative">
                          <select
                            value={selectedKey}
                            onChange={(e) => setSelectedKey(e.target.value)}
                            disabled={scraperStatus.is_running}
                            className="appearance-none bg-obsidian-950 border border-obsidian-850 rounded px-4 py-2.5 pr-10 font-mono text-xs text-white focus:outline-none focus:border-indigo-500/50 disabled:opacity-50"
                          >
                            <option value="all">Импортировать ВСЁ по очереди</option>
                            <option value="civil_general">Гражданский кодекс (Общая)</option>
                            <option value="civil_special">Гражданский кодекс (Особая)</option>
                            <option value="labor">Трудовой кодекс</option>
                            <option value="tax">Налоговый кодекс</option>
                            <option value="entrepreneurial">Предпринимательский кодекс</option>
                            <option value="administrative">Кодекс об адм. правонарушениях</option>
                            <option value="criminal">Уголовный кодекс</option>
                            <option value="law_too">Закон о ТОО</option>
                            <option value="law_procurement">Закон о госзакупках</option>
                            <option value="constitution">Конституция РК</option>
                          </select>
                          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-steel-500 text-[10px]">▼</div>
                        </div>

                        {!scraperStatus.is_running ? (
                          <button
                            onClick={handleStartScraper}
                            disabled={scraperLoading}
                            className="px-5 py-2.5 rounded bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(99,102,241,0.15)] flex items-center gap-2 disabled:opacity-50"
                          >
                            Запустить
                          </button>
                        ) : (
                          <button
                            onClick={handleStopScraper}
                            disabled={scraperLoading}
                            className="px-5 py-2.5 rounded bg-red-500 hover:bg-red-400 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(239,68,68,0.25)] flex items-center gap-2 animate-pulse disabled:opacity-50"
                          >
                            Остановить
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Scraper Status Panel */}
                    <div className="mt-6 flex items-center gap-4 p-4 rounded-xl border border-white/[0.04] bg-obsidian-950/60">
                      <div className="relative flex h-3 w-3 shrink-0">
                        {scraperStatus.is_running ? (
                          <>
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                          </>
                        ) : (
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500/50"></span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-white block">
                          {scraperStatus.is_running 
                            ? `АКТИВНЫЙ ИМПОРТ: ${scraperStatus.current_key === 'all' ? 'Все кодексы' : scraperStatus.current_key}` 
                            : 'СТАТУС: ПРОЦЕСС ОСТАНОВЛЕН / ЗАВЕРШЕН'}
                        </span>
                        <span className="text-[10px] text-steel-500 mt-0.5 block leading-normal">
                          {scraperStatus.is_running 
                            ? 'Gemini Embeddings V3 + ChromaDB (пауза 20 сек между батчами для избежания лимитов)' 
                            : 'Для добавления/обновления законодательства в базе знаний выберите кодекс и нажмите "Запустить".'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Monospace Terminal console */}
                  <div className="glass-card border border-white/[0.05] bg-[#030305] rounded-2xl overflow-hidden flex flex-col h-[52vh]">
                    {/* Console Header */}
                    <div className="bg-[#0b0c10] border-b border-white/[0.03] px-4 py-3 flex items-center justify-between text-xs text-steel-400 select-none">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 mr-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                          <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                        </div>
                        <span className="font-bold tracking-wider text-[10px] text-steel-500">TERMINAL OUTPUT — RAG SCRAPER</span>
                      </div>
                      <span className="font-mono text-[9px] text-indigo-400 bg-indigo-950/30 border border-indigo-900/40 px-2 py-0.5 rounded">
                        {scraperStatus.is_running ? 'STREAMING...' : 'IDLE'}
                      </span>
                    </div>

                    {/* Terminal logs container */}
                    <div className="flex-1 overflow-y-auto p-5 font-mono text-[11px] leading-relaxed text-chrome-400 custom-scrollbar space-y-1.5 scroll-smooth">
                      {scraperStatus.logs && scraperStatus.logs.length > 0 ? (
                        scraperStatus.logs.map((log, idx) => {
                          let textClass = 'text-chrome-300';
                          if (log.includes('Error') || log.includes('❌') || log.includes('Failed')) {
                            textClass = 'text-red-400 font-bold';
                          } else if (log.includes('✅') || log.includes('complete') || log.includes('Ingested') || log.includes('complete')) {
                            textClass = 'text-emerald-400 font-semibold';
                          } else if (log.includes('🚀') || log.includes('===')) {
                            textClass = 'text-indigo-400 font-bold';
                          } else if (log.includes('💤') || log.includes('Sleeping')) {
                            textClass = 'text-amber-500 opacity-90';
                          } else if (log.startsWith('[SYSTEM]')) {
                            textClass = 'text-indigo-300/85 italic';
                          }
                          return (
                            <div key={idx} className={textClass}>
                              {log}
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-steel-600 italic flex items-center justify-center h-full select-none text-xs">
                          Логи консоли пусты. Запустите парсинг для начала вывода.
                        </div>
                      )}
                      <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} />
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        )}

        {/* Confirm Delete Modal */}
        <AnimatePresence>
          {userToDelete && (
            <motion.div 
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <motion.div 
                className="glass-card w-full max-w-sm p-6 text-center border-red-500/30"
                initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              >
                <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle size={32} />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Удалить пользователя?</h2>
                <p className="text-sm text-steel-400 mb-6">Это действие необратимо. Будут удалены все связанные с ним данные, включая профиль юриста, дела и отзывы.</p>
                
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setUserToDelete(null)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-steel-300 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    Отмена
                  </button>
                  <button 
                    onClick={confirmDeleteUser}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                  >
                    Удалить
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
