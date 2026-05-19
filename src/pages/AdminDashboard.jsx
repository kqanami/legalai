import { useState, useEffect } from 'react';
import { adminApi } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, Users, Server, Zap, RefreshCw, LogIn, Shield, Trash2, 
  CheckCircle, XCircle, AlertCircle, AlertTriangle, Search, Filter, 
  Settings, Award, TrendingUp, BarChart2, Cpu, Edit, Clock, Globe, Save, 
  Trash, FileText, ChevronRight, Terminal, Code, Download, DollarSign, Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [escalations, setEscalations] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [scraperStatus, setScraperStatus] = useState({ is_running: false, current_key: null, logs: [] });
  const [selectedKey, setSelectedKey] = useState('all');
  const [scraperLoading, setScraperLoading] = useState(false);

  // Live clock and resources simulation
  const [timeStr, setTimeStr] = useState(new Date().toLocaleTimeString());
  const [resources, setResources] = useState({ cpu: 28, ram: 52, disk: 14 });

  useEffect(() => {
    const clockTimer = setInterval(() => {
      setTimeStr(new Date().toLocaleTimeString());
    }, 1000);

    const resourceTimer = setInterval(() => {
      setResources(prev => ({
        cpu: Math.min(95, Math.max(5, prev.cpu + Math.floor(Math.random() * 5) - 2)),
        ram: Math.min(95, Math.max(10, prev.ram + Math.floor(Math.random() * 3) - 1)),
        disk: prev.disk
      }));
    }, 3000);

    return () => {
      clearInterval(clockTimer);
      clearInterval(resourceTimer);
    };
  }, []);
  
  // Advanced filters & RAG tester
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userPlanFilter, setUserPlanFilter] = useState('all');
  const [selectedLawyer, setSelectedLawyer] = useState(null);
  
  // Vector search test state
  const [ragQuery, setRagQuery] = useState('');
  const [ragResults, setRagResults] = useState([]);
  const [ragLoading, setRagLoading] = useState(false);

  const [settings, setSettings] = useState({
    maintenanceMode: false,
    activeRouting: 'gemini',
    ragMinSimilarity: 0.35,
    llmTemperature: 0.1
  });

  const [llmTestProvider, setLlmTestProvider] = useState('gemini');
  const [llmTestPrompt, setLlmTestPrompt] = useState('');
  const [llmTestResult, setLlmTestResult] = useState(null);
  const [llmTestLoading, setLlmTestLoading] = useState(false);
  const [systemLogs, setSystemLogs] = useState([]);
  const [tokenAnalytics, setTokenAnalytics] = useState(null);

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
      } else if (activeTab === 'audit_logs') {
        const data = await adminApi.getAuditLogs();
        setAuditLogs(data);
      } else if (activeTab === 'settings') {
        const data = await adminApi.getSettings();
        setSettings(data);
      } else if (activeTab === 'system_logs') {
        const data = await adminApi.getSystemLogs(200);
        setSystemLogs(data.logs);
      } else if (activeTab === 'billing') {
        const data = await adminApi.getTokenAnalytics();
        setTokenAnalytics(data);
      }
    } catch (e) {
      console.error('Failed to load admin data', e);
      addToast('Ошибка соединения с API: ' + e.message, 'error');
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
      addToast('Ошибка сидирования: ' + e.message, 'error');
    } finally {
      setSeeding(false);
    }
  };

  const handleImpersonate = async (userId, role) => {
    try {
      await adminApi.impersonate(userId);
      addToast('Переключение сессии...', 'success');
      setTimeout(() => {
        window.location.href = role === 'lawyer' ? '/lawyer' : '/dashboard';
      }, 800);
    } catch (e) {
      addToast('Ошибка входа: ' + e.message, 'error');
    }
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await adminApi.deleteUser(userToDelete);
      setUsers(users.filter(u => u.id !== userToDelete));
      addToast('Пользователь успешно удален', 'success');
    } catch (e) {
      addToast('Ошибка удаления: ' + e.message, 'error');
    } finally {
      setUserToDelete(null);
    }
  };

  const handlePlanChange = async (userId, newPlan) => {
    try {
      await adminApi.updateUser(userId, { plan: newPlan });
      setUsers(users.map(u => u.id === userId ? { ...u, plan: newPlan } : u));
      addToast(`Тариф пользователя #${userId} изменен на ${newPlan.toUpperCase()}`, 'success');
    } catch (e) {
      addToast('Ошибка изменения тарифа: ' + e.message, 'error');
    }
  };

  const handleVerifyLawyer = async (lawyerId, verifyStatus) => {
    try {
      await adminApi.verifyLawyer(lawyerId, verifyStatus);
      setLawyers(lawyers.map(l => l.id === lawyerId ? { ...l, verified: verifyStatus } : l));
      if (selectedLawyer && selectedLawyer.id === lawyerId) {
        setSelectedLawyer({ ...selectedLawyer, verified: verifyStatus });
      }
      addToast(verifyStatus ? 'Профиль юриста верифицирован' : 'Верификация отозвана', 'success');
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

  const runVectorSearch = async () => {
    if (!ragQuery.trim()) return;
    setRagLoading(true);
    try {
      const data = await adminApi.testRagSearch(ragQuery);
      setRagResults(data);
      addToast(`Найдено ${data.length} совпадений в ChromaDB`, 'success');
    } catch (e) {
      addToast('Ошибка поиска ChromaDB: ' + e.message, 'error');
    } finally {
      setRagLoading(false);
    }
  };

  // Maintenance tools
  const handleClearChats = async () => {
    if (!confirm('Вы уверены, что хотите удалить ВСЕ сообщения и сессии чатов во всей системе? Это действие необратимо.')) return;
    try {
      const res = await adminApi.clearChats();
      addToast(res.message, 'success');
    } catch (e) {
      addToast('Ошибка: ' + e.message, 'error');
    }
  };

  const handleResetVerifications = async () => {
    if (!confirm('Вы уверены, что хотите аннулировать верификацию у ВСЕХ юристов?')) return;
    try {
      const res = await adminApi.resetVerifications();
      addToast(res.message, 'success');
      loadData();
    } catch (e) {
      addToast('Ошибка: ' + e.message, 'error');
    }
  };

  const handleDeleteSeeded = async () => {
    if (!confirm('Вы уверены, что хотите удалить ВСЕХ сгенерированных юристов?')) return;
    try {
      const res = await adminApi.deleteSeededLawyers();
      addToast(res.message, 'success');
      loadData();
    } catch (e) {
      addToast('Ошибка: ' + e.message, 'error');
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      const res = await adminApi.updateSettings(newSettings);
      setSettings(res);
      addToast('Настройки системы обновлены на сервере', 'success');
    } catch (e) {
      addToast('Не удалось обновить настройки: ' + e.message, 'error');
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
                          u.phone.includes(userSearch);
    const matchesRole = userRoleFilter === 'all' || 
                        (userRoleFilter === 'lawyer' && u.is_lawyer) || 
                        (userRoleFilter === 'citizen' && !u.is_lawyer);
    const matchesPlan = userPlanFilter === 'all' || u.plan === userPlanFilter;
    return matchesSearch && matchesRole && matchesPlan;
  });

  const tabs = [
    { id: 'overview', label: 'ОБЗОР', icon: <Server size={14} /> },
    { id: 'users', label: 'ЮЗЕРЫ', icon: <Users size={14} /> },
    { id: 'lawyers', label: 'ЮРИСТЫ', icon: <Shield size={14} /> },
    { id: 'escalations', label: 'ЭКСКАЛАЦИИ', icon: <RefreshCw size={14} /> },
    { id: 'scraper', label: 'ПАРСИНГ RAG', icon: <Database size={14} /> },
    { id: 'audit_logs', label: 'АКТИВНОСТЬ', icon: <Clock size={14} /> },
    { id: 'playground', label: 'ПЕСОЧНИЦА ИИ', icon: <Terminal size={14} /> },
    { id: 'system_logs', label: 'ЛОГИ СЕРВЕРА', icon: <Code size={14} /> },
    { id: 'billing', label: 'БИЛЛИНГ API', icon: <DollarSign size={14} /> },
    { id: 'export', label: 'ЭКСПОРТ БД', icon: <Download size={14} /> },
    { id: 'settings', label: 'НАСТРОЙКИ', icon: <Settings size={14} /> },
  ];

  const runLlmTest = async () => {
    if (!llmTestPrompt.trim()) return;
    setLlmTestLoading(true);
    setLlmTestResult(null);
    try {
      const res = await adminApi.testLlmProvider(llmTestProvider, llmTestPrompt);
      setLlmTestResult(res);
      addToast(`Ответ получен за ${res.latency_ms}мс`, 'success');
    } catch (e) {
      addToast('Ошибка тестирования LLM: ' + e.message, 'error');
    } finally {
      setLlmTestLoading(false);
    }
  };

  // Custom CSS Bar Chart Data
  const hourlyData = [12, 28, 45, 12, 8, 3, 14, 25, 48, 65, 82, 95, 70, 85, 90, 110, 125, 105, 95, 78, 60, 52, 38, 20];
  const totalRequestsToday = hourlyData.reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-obsidian-950 p-4 md:p-8 font-mono text-sm">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.15)] animate-pulse">
              <Cpu size={24} className="text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">System<span className="text-indigo-400">Admin</span></h1>
                <span className="text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded uppercase tracking-wider font-bold">PRE-SEED v1.6</span>
              </div>
              <p className="text-xs text-steel-400">ПАНЕЛЬ УПРАВЛЕНИЯ И АВТОМАТИЗАЦИИ ЭКОСИСТЕМЫ</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="flex items-center gap-2 bg-obsidian-900 border border-white/[0.04] px-3 py-2 rounded-xl">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[11px] font-bold text-steel-200">API: <span className="text-emerald-400">Online</span></span>
            </div>
            <div className="flex flex-col text-right justify-center bg-obsidian-900 border border-white/[0.04] px-4 py-1.5 rounded-xl min-w-[110px]">
              <span className="text-[8px] text-steel-500 uppercase tracking-widest font-bold">SYSTEM TIME</span>
              <span className="text-[11px] font-mono font-bold text-indigo-400 mt-0.5">{timeStr}</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center overflow-x-auto gap-1 border-b border-white/[0.04] mb-8 pb-px custom-scrollbar">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => { setActiveTab(t.id); loadData(); }}
              className={`flex items-center gap-2 px-5 py-3 font-bold uppercase tracking-wider transition-colors border-b-2 text-xs shrink-0 ${
                activeTab === t.id 
                  ? 'border-indigo-400 text-indigo-300 bg-indigo-500/5' 
                  : 'border-transparent text-steel-500 hover:text-steel-300'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {loading && activeTab !== 'scraper' && activeTab !== 'overview' ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 text-indigo-400">
            <RefreshCw size={36} className="animate-spin" />
            <span className="animate-pulse text-xs tracking-widest uppercase">Получение данных от сервера...</span>
          </div>
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
                <div className="space-y-6">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: 'Всего пользователей', value: stats?.total_users, desc: '+4 за последние 24ч', color: 'text-blue-400', icon: <Users size={16} /> },
                      { label: 'Юристы в базе', value: `${stats?.total_lawyers} (${stats?.verified_lawyers} V)`, desc: '2 на очереди проверки', color: 'text-emerald-400', icon: <Shield size={16} /> },
                      { label: 'Дела на ведении', value: `${stats?.total_cases} (${stats?.active_cases} Act)`, desc: '7 завершено за неделю', color: 'text-amber-400', icon: <Award size={16} /> },
                      { label: 'Эскалации лидов (AI)', value: `${stats?.total_escalations} (${stats?.accepted_escalations} Acc)`, desc: 'Конверсия 65%', color: 'text-rose-400', icon: <TrendingUp size={16} /> },
                    ].map((s, i) => (
                      <div key={i} className="glass-card p-5 border border-white/[0.05] relative overflow-hidden group">
                        <div className="absolute top-4 right-4 text-steel-600 group-hover:text-indigo-400/40 transition-colors">
                          {s.icon}
                        </div>
                        <div className={`text-[10px] font-bold tracking-widest uppercase mb-1 ${s.color}`}>{s.label}</div>
                        <div className="text-3xl font-black text-white">{s.value || 0}</div>
                        <div className="text-[10px] text-steel-500 mt-2 flex items-center gap-1">
                          <Clock size={10} /> {s.desc}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* System & Hardware Health */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* CSS Custom Bar Chart for Requests */}
                    <div className="glass-card p-6 border border-white/[0.05] lg:col-span-2">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="text-white font-bold flex items-center gap-2">
                            <BarChart2 size={16} className="text-indigo-400" />
                            Активность шлюза API (Запросы за день)
                          </h3>
                          <p className="text-xs text-steel-400">Почасовой трафик юридического ассистента</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-black text-indigo-400">{totalRequestsToday}</span>
                          <span className="text-[10px] text-steel-500 block">Всего запросов</span>
                        </div>
                      </div>

                      {/* Bar chart container */}
                      <div className="flex items-end justify-between h-32 gap-1 px-2 pt-4 bg-obsidian-950/40 rounded-xl border border-white/[0.02]">
                        {hourlyData.map((val, idx) => (
                          <div key={idx} className="group relative flex-1 flex flex-col items-center">
                            <div 
                              className="w-full rounded-t-sm bg-indigo-500/20 group-hover:bg-indigo-400 transition-all duration-300 relative"
                              style={{ height: `${(val / 130) * 100}%` }}
                            >
                              <div className="absolute inset-0 bg-indigo-400/20 opacity-0 group-hover:opacity-100 blur-sm rounded-t-sm transition-opacity" />
                            </div>
                            <span className="text-[8px] text-steel-500 mt-1 select-none">{idx}ч</span>
                            <div className="absolute bottom-full mb-1 bg-obsidian-900 border border-white/10 text-white text-[9px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 whitespace-nowrap">
                              {val} запр.
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Resources & Hardware Monitor */}
                    <div className="glass-card p-6 border border-white/[0.05] flex flex-col justify-between">
                      <div>
                        <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                          <Cpu size={16} className="text-indigo-400" />
                          Монитор ресурсов
                        </h3>
                        <div className="space-y-4">
                          {[
                            { name: 'Загрузка CPU', value: resources.cpu, color: 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.3)]' },
                            { name: 'Оперативная память (RAM)', value: resources.ram, color: 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' },
                            { name: 'Дисковое пространство', value: resources.disk, color: 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.3)]' },
                          ].map((res, idx) => (
                            <div key={idx} className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs font-bold">
                                <span className="text-steel-400">{res.name}</span>
                                <span className="text-white">{res.value}%</span>
                              </div>
                              <div className="w-full bg-obsidian-950 rounded-full h-1.5 overflow-hidden border border-white/[0.02]">
                                <div className={`h-full ${res.color}`} style={{ width: `${res.value}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="border-t border-white/[0.04] pt-4 mt-4 flex items-center justify-between text-xs text-steel-400">
                        <span>База данных: sqlite3 (v3.42)</span>
                        <span className="text-emerald-400 flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> 
                          Здорова
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Seed Section */}
                  <div className="glass-card p-6 border border-indigo-500/20 bg-indigo-500/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h3 className="text-white font-bold mb-1 flex items-center gap-1.5">
                        <Database size={16} className="text-indigo-400" />
                        Инструмент сидирования данных
                      </h3>
                      <p className="text-xs text-steel-400">Сгенерирует 15 фейковых юристов со специализациями, случайными рейтингами и отзывами для локальной отладки.</p>
                    </div>
                    <button 
                      onClick={handleSeed}
                      disabled={seeding}
                      className="px-6 py-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-bold flex items-center gap-2 disabled:opacity-50 transition-all shrink-0"
                    >
                      <Database size={16} /> {seeding ? 'Генерация...' : 'Запустить сид БД'}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB: USERS */}
              {activeTab === 'users' && (
                <div className="space-y-4">
                  {/* Search and Filters bar */}
                  <div className="flex flex-col md:flex-row items-center gap-4 bg-obsidian-900 border border-white/[0.04] p-4 rounded-xl">
                    <div className="relative flex-1 w-full">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-500" />
                      <input
                        type="text"
                        placeholder="Поиск пользователей по имени, телефону..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="w-full bg-obsidian-950 border border-white/[0.06] rounded-lg py-2 pl-10 pr-4 font-mono text-xs text-white focus:outline-none focus:border-indigo-500/50"
                      />
                    </div>
                    
                    <div className="flex items-center gap-3 w-full md:w-auto self-start md:self-auto">
                      <div className="flex items-center gap-1.5 text-xs text-steel-400">
                        <Filter size={14} />
                        <span>Роль:</span>
                      </div>
                      <select
                        value={userRoleFilter}
                        onChange={(e) => setUserRoleFilter(e.target.value)}
                        className="bg-obsidian-950 border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50 cursor-pointer"
                      >
                        <option value="all">Все роли</option>
                        <option value="citizen">Только граждане</option>
                        <option value="lawyer">Только юристы</option>
                      </select>

                      <div className="flex items-center gap-1.5 text-xs text-steel-400 ml-2">
                        <span>Тариф:</span>
                      </div>
                      <select
                        value={userPlanFilter}
                        onChange={(e) => setUserPlanFilter(e.target.value)}
                        className="bg-obsidian-950 border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50 cursor-pointer"
                      >
                        <option value="all">Все тарифы</option>
                        <option value="freemium">Freemium</option>
                        <option value="go">GO / ИП</option>
                        <option value="ip">ИП Pro</option>
                        <option value="business">Business</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-obsidian-900 rounded-xl border border-white/[0.04] overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-obsidian-950 text-steel-500 text-[10px] uppercase tracking-wider border-b border-white/[0.04]">
                        <tr>
                          <th className="px-4 py-3">Пользователь / ID</th>
                          <th className="px-4 py-3">Телефон</th>
                          <th className="px-4 py-3">Роль / Статус</th>
                          <th className="px-4 py-3">Тарифный план</th>
                          <th className="px-4 py-3 text-right">Действия</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.02]">
                        {filteredUsers.length > 0 ? (
                          filteredUsers.map(u => (
                            <tr key={u.id} className="hover:bg-white/[0.01] transition-colors">
                              <td className="px-4 py-3 text-white">
                                <div className="font-bold">{u.name}</div>
                                <div className="text-[9px] text-steel-500 flex items-center gap-1.5 mt-0.5">
                                  <span>ID: #{u.id}</span>
                                  <span>•</span>
                                  <span>Рег: {new Date(u.created_at).toLocaleDateString()}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-steel-300 font-mono text-xs">{u.phone}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                                  u.is_lawyer ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                }`}>
                                  {u.is_lawyer ? 'Юрист' : 'Гражданин'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <select
                                  value={u.plan || 'freemium'}
                                  onChange={(e) => handlePlanChange(u.id, e.target.value)}
                                  className="bg-obsidian-950 border border-white/[0.08] rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500/50 cursor-pointer"
                                >
                                  <option value="freemium">Freemium</option>
                                  <option value="go">GO / ИП</option>
                                  <option value="ip">ИП Pro</option>
                                  <option value="business">Business</option>
                                </select>
                              </td>
                              <td className="px-4 py-3 text-right space-x-2">
                                <button 
                                  onClick={() => handleImpersonate(u.id, u.is_lawyer ? 'lawyer' : 'citizen')} 
                                  className="px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500 hover:text-white font-bold transition-all text-xs"
                                  title="Войти под пользователем"
                                >
                                  Войти
                                </button>
                                <button 
                                  onClick={() => setUserToDelete(u.id)} 
                                  className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white font-bold transition-all text-xs"
                                  title="Удалить"
                                >
                                  Удалить
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="5" className="px-4 py-12 text-center text-steel-500 italic">Пользователи по заданным критериям не найдены.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB: LAWYERS VERIFICATION */}
              {activeTab === 'lawyers' && (
                <div className="bg-obsidian-900 rounded-xl border border-white/[0.04] overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-obsidian-950 text-steel-500 text-[10px] uppercase tracking-wider border-b border-white/[0.04]">
                      <tr>
                        <th className="px-4 py-3">Юрист</th>
                        <th className="px-4 py-3">Специализация</th>
                        <th className="px-4 py-3">Рейтинг / Win-Rate</th>
                        <th className="px-4 py-3">Статус верификации</th>
                        <th className="px-4 py-3 text-right">Инспекция</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.02]">
                      {lawyers.map(l => (
                        <tr key={l.id} className="hover:bg-white/[0.01] transition-colors">
                          <td className="px-4 py-3">
                            <div className="text-white font-bold">{l.name}</div>
                            <div className="text-[9px] text-steel-500">ИИН: {l.iin}</div>
                          </td>
                          <td className="px-4 py-3 text-steel-300 text-xs">{l.specialization}</td>
                          <td className="px-4 py-3 text-xs">
                            <span className="text-amber-400 font-bold">{l.rating} ⭐</span>
                            <br/>
                            <span className="text-[10px] text-emerald-400">Выиграно: {l.cases_won} / {l.cases_total}</span>
                          </td>
                          <td className="px-4 py-3">
                            {l.verified ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-400">
                                <CheckCircle size={10} /> ПОДТВЕРЖДЕН
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[9px] font-bold text-amber-400">
                                <AlertCircle size={10} /> ОЖИДАЕТ
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button 
                              onClick={() => setSelectedLawyer(l)}
                              className="px-3 py-1.5 rounded-lg bg-white/[0.04] text-steel-300 hover:bg-white/10 hover:text-white transition-all text-xs font-bold"
                            >
                              Инспектировать
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB: ESCALATIONS */}
              {activeTab === 'escalations' && (
                <div className="bg-obsidian-900 rounded-xl border border-white/[0.04] overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-obsidian-950 text-steel-500 text-[10px] uppercase tracking-wider border-b border-white/[0.04]">
                      <tr>
                        <th className="px-4 py-3">Запрос / ID</th>
                        <th className="px-4 py-3">Клиент</th>
                        <th className="px-4 py-3">Категория / Срочность</th>
                        <th className="px-4 py-3">Статус лида</th>
                        <th className="px-4 py-3 text-right">Исполнитель</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.02]">
                      {escalations.length > 0 ? (
                        escalations.map(e => (
                          <tr key={e.id} className="hover:bg-white/[0.01] transition-colors">
                            <td className="px-4 py-3 text-steel-400">
                              <span className="font-bold">#LEAD-{e.id}</span>
                              <br/>
                              <span className="text-[9px] opacity-60">{new Date(e.created_at).toLocaleDateString()}</span>
                            </td>
                            <td className="px-4 py-3 text-white font-medium">{e.user_name}</td>
                            <td className="px-4 py-3">
                              <span className="text-white text-xs font-bold">{e.category}</span>
                              <br/>
                              <span className={`inline-block text-[9px] font-extrabold uppercase mt-0.5 ${
                                e.urgency === 'critical' ? 'text-red-400' : 'text-amber-400'
                              }`}>
                                {e.urgency === 'critical' ? '⚡ КРИТИЧЕСКАЯ' : 'НОРМАЛЬНАЯ'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                                e.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                e.status === 'declined' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                                'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              }`}>
                                {e.status === 'accepted' ? 'ПРИНЯТ' : e.status === 'declined' ? 'ОТКЛОНЕН' : 'АКТИВЕН'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-xs text-steel-400 font-bold">{e.assigned_lawyer || '—'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="px-4 py-12 text-center text-steel-500 italic">Экскалации на услуги юристов еще не зафиксированы.</td>
                        </tr>
                      )}
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
                          Парсинг законодательства РК и RAG векторный импорт
                        </h2>
                        <p className="text-xs text-steel-400 max-w-xl leading-relaxed">
                          Автоматически скачивает кодексы и законы с adilet.zan.kz, преобразует статьи в эмбеддинги Gemini v3 и сохраняет в ChromaDB с 20-секундной задержкой батчей для обхода лимитов API.
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
                            <option value="all">Импортировать ВСЕ кодексы</option>
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
                            ? `АКТИВНЫЙ ИМПОРТ: ${scraperStatus.current_key === 'all' ? 'Все законодательство' : scraperStatus.current_key}` 
                            : 'СТАТУС: ПРОЦЕСС ЗАВЕРШЕН / ОСТАНОВЛЕН'}
                        </span>
                        <span className="text-[10px] text-steel-500 mt-0.5 block leading-normal">
                          {scraperStatus.is_running 
                            ? 'Прогресс парсинга передается в реальном времени в консоль ниже...' 
                            : 'Для принудительного обновления или добавления нового закона в RAG выберите закон и нажмите "Запустить".'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Monospace Terminal console */}
                    <div className="glass-card border border-white/[0.05] bg-[#030305] rounded-2xl overflow-hidden flex flex-col h-[50vh] lg:col-span-2">
                      {/* Console Header */}
                      <div className="bg-[#0b0c10] border-b border-white/[0.03] px-4 py-3 flex items-center justify-between text-xs text-steel-400 select-none">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 mr-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                            <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                          </div>
                          <span className="font-bold tracking-wider text-[10px] text-steel-500 uppercase">ВЫВОД КОНСОЛИ ИМПОРТА</span>
                        </div>
                        <span className="font-mono text-[9px] text-indigo-400 bg-indigo-950/30 border border-indigo-900/40 px-2 py-0.5 rounded font-bold">
                          {scraperStatus.is_running ? 'STREAMING...' : 'DISCONNECTED'}
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
                            Логи консоли пусты. Выберите кодекс и запустите скрапер.
                          </div>
                        )}
                        <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} />
                      </div>
                    </div>

                    {/* Live RAG Vector Search Tester */}
                    <div className="glass-card p-5 border border-white/[0.05] bg-obsidian-900/40 flex flex-col h-[50vh]">
                      <h3 className="text-white font-bold flex items-center gap-2 mb-3 text-xs">
                        <Search size={14} className="text-indigo-400" />
                        Тест поиска ChromaDB
                      </h3>
                      
                      <div className="flex gap-2 mb-4 shrink-0">
                        <input
                          type="text"
                          placeholder="Запрос к базе знаний..."
                          value={ragQuery}
                          onChange={(e) => setRagQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && runVectorSearch()}
                          className="flex-1 bg-obsidian-950 border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white placeholder-steel-500 focus:outline-none focus:border-indigo-500/50"
                        />
                        <button
                          onClick={runVectorSearch}
                          disabled={ragLoading}
                          className="px-3 rounded bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs"
                        >
                          {ragLoading ? '...' : 'Искать'}
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                        {ragResults.length > 0 ? (
                          ragResults.map((r, idx) => (
                            <div key={idx} className="p-3 bg-obsidian-950/60 rounded-xl border border-white/[0.03] text-[11px] leading-relaxed">
                              <div className="flex items-center justify-between text-[9px] font-bold text-steel-500 mb-1 border-b border-white/[0.02] pb-1">
                                <span className="text-indigo-300">Релевантность: {(r.score * 100).toFixed(0)}%</span>
                                <span>ID: {r.id.slice(0, 10)}...</span>
                              </div>
                              <p className="text-steel-200 line-clamp-4 hover:line-clamp-none transition-all duration-300 cursor-pointer">{r.text}</p>
                              {r.metadata && (
                                <div className="mt-1.5 flex flex-wrap gap-1 text-[8px]">
                                  {r.metadata.source && <span className="bg-white/5 border border-white/10 px-1 rounded text-steel-400">{r.metadata.source}</span>}
                                  {r.metadata.category && <span className="bg-indigo-500/10 border border-indigo-500/20 px-1 rounded text-indigo-300">{r.metadata.category}</span>}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-steel-600 italic text-center text-xs py-20">
                            Введите поисковый запрос, чтобы проверить релевантность выдачи ChromaDB.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: AUDIT LOGS */}
              {activeTab === 'audit_logs' && (
                <div className="glass-card p-6 border border-white/[0.05] space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                        <Clock size={18} className="text-indigo-400" />
                        Журнал активности (Audit Trail)
                      </h2>
                      <p className="text-xs text-steel-400">Хронологический список последних системных событий.</p>
                    </div>
                    <button 
                      onClick={loadData}
                      className="px-4 py-2 rounded bg-white/[0.04] hover:bg-white/10 text-steel-300 font-bold text-xs flex items-center gap-1.5"
                    >
                      <RefreshCw size={12} /> Обновить
                    </button>
                  </div>

                  <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    {auditLogs.length > 0 ? (
                      auditLogs.map((log, idx) => {
                        let badgeColor = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                        if (log.category === 'ESCALATION') badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                        if (log.category === 'LEGAL_CASE') badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';

                        return (
                          <div key={idx} className="flex items-start gap-4 p-4 rounded-xl border border-white/[0.03] bg-obsidian-900/40 hover:bg-obsidian-900/60 transition-colors">
                            <span className={`px-2.5 py-1 rounded text-[9px] font-extrabold border shrink-0 ${badgeColor}`}>
                              {log.category}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-steel-100 font-medium leading-relaxed">{log.message}</p>
                              <span className="text-[9px] text-steel-500 mt-1 block">
                                {new Date(log.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <ChevronRight size={16} className="text-steel-600 self-center" />
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-20 text-steel-500 italic text-xs">Логи активности пусты или не загружены.</div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: SYSTEM SETTINGS */}
              {activeTab === 'settings' && (
                <div className="space-y-6">
                  {/* Global settings form */}
                  <div className="glass-card p-6 border border-white/[0.05] space-y-6">
                    <div>
                      <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                        <Settings size={18} className="text-indigo-400" />
                        Глобальные параметры системы
                      </h2>
                      <p className="text-xs text-steel-400">Настройки маршрутизации и конфигурация модели ИИ-ассистента.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/[0.04]">
                      <div className="space-y-4">
                        {/* LLM Routing */}
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-steel-300">Активный провайдер и маршрутизация LLM</label>
                          <select
                            value={settings.activeRouting}
                            onChange={(e) => saveSettings({ ...settings, activeRouting: e.target.value })}
                            className="w-full bg-obsidian-950 border border-white/[0.06] rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-indigo-500/50 cursor-pointer"
                          >
                            <option value="gemini">Google Gemini 1.5 Pro (Рекомендуемый)</option>
                            <option value="groq">Groq LLaMA 3.3 (Экономичный)</option>
                            <option value="claude">Anthropic Claude 3.5 (Премиум)</option>
                          </select>
                          <span className="text-[10px] text-steel-500 block leading-normal">
                            Выберите провайдер нейросети, который будет обрабатывать все юридические вопросы и консультации пользователей.
                          </span>
                        </div>

                        {/* Temperature Slider */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-bold text-steel-300">
                            <label>Креативность / Температура ИИ</label>
                            <span className="text-indigo-400">{settings.llmTemperature}</span>
                          </div>
                          <input 
                            type="range" 
                            min="0" 
                            max="1.0" 
                            step="0.1" 
                            value={settings.llmTemperature}
                            onChange={(e) => saveSettings({ ...settings, llmTemperature: parseFloat(e.target.value) })}
                            className="w-full accent-indigo-500 bg-obsidian-950 h-1.5 rounded-lg appearance-none cursor-pointer"
                          />
                          <span className="text-[10px] text-steel-500 block">Меньшие значения делают ответы детерминированными и сухими, высокие - более творческими.</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {/* RAG Minimum Similarity */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-bold text-steel-300">
                            <label>Минимальный порог релевантности RAG</label>
                            <span className="text-indigo-400">{settings.ragMinSimilarity}</span>
                          </div>
                          <input 
                            type="range" 
                            min="0.1" 
                            max="0.8" 
                            step="0.05" 
                            value={settings.ragMinSimilarity}
                            onChange={(e) => saveSettings({ ...settings, ragMinSimilarity: parseFloat(e.target.value) })}
                            className="w-full accent-indigo-500 bg-obsidian-950 h-1.5 rounded-lg appearance-none cursor-pointer"
                          />
                          <span className="text-[10px] text-steel-500 block">Отсекает нерелевантные статьи кодексов при поиске в векторной БД ChromaDB.</span>
                        </div>

                        {/* Maintenance mode */}
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-steel-300">Режим технического обслуживания</label>
                          <div className="flex items-center justify-between p-3 rounded-xl bg-obsidian-950/60 border border-white/[0.04]">
                            <span className="text-xs text-steel-400">Сайт заблокирован для пользователей</span>
                            <button
                              onClick={() => saveSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })}
                              className={`px-3 py-1.5 rounded-lg font-bold text-xs uppercase transition-all ${
                                settings.maintenanceMode 
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                                  : 'bg-steel-500/10 text-steel-400 border border-white/[0.06] hover:bg-white/[0.03]'
                              }`}
                            >
                              {settings.maintenanceMode ? 'ВКЛЮЧЕН' : 'ВЫКЛЮЧЕН'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Database Maintenance Actions */}
                  <div className="glass-card p-6 border border-white/[0.05] space-y-4">
                    <div>
                      <h3 className="text-white font-bold flex items-center gap-2 text-xs">
                        <Trash size={14} className="text-red-400" />
                        Сервисные операции базы данных (Опасная зона)
                      </h3>
                      <p className="text-[10px] text-steel-500">Действия по очистке и пересбросу состояния базы данных.</p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={handleClearChats}
                        className="px-4 py-2.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/20 text-xs font-bold transition-all"
                      >
                        Очистить все чаты
                      </button>
                      <button
                        onClick={handleResetVerifications}
                        className="px-4 py-2.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-obsidian-950 border border-amber-500/20 text-xs font-bold transition-all"
                      >
                        Сбросить верификации
                      </button>
                      <button
                        onClick={handleDeleteSeeded}
                        className="px-4 py-2.5 rounded-lg bg-white/[0.04] text-steel-300 hover:bg-white/10 border border-white/[0.06] text-xs font-bold transition-all"
                      >
                        Удалить тестовых юристов
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: PLAYGROUND */}
              {activeTab === 'playground' && (
                <div className="space-y-6">
                  <div className="glass-card p-6 border border-white/[0.05] space-y-6">
                    <div>
                      <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                        <Terminal size={18} className="text-indigo-400" />
                        Песочница ИИ (LLM Testing)
                      </h2>
                      <p className="text-xs text-steel-400">Тестируйте сырые запросы к моделям в обход RAG, чтобы замерять пинг и качество ответов.</p>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-white/[0.04]">
                      <div className="flex gap-4">
                        <div className="flex-1 space-y-2">
                          <label className="text-xs font-bold text-steel-300">Провайдер</label>
                          <select
                            value={llmTestProvider}
                            onChange={(e) => setLlmTestProvider(e.target.value)}
                            className="w-full bg-obsidian-950 border border-white/[0.06] rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                          >
                            <option value="gemini">Google Gemini</option>
                            <option value="claude">Anthropic Claude</option>
                            <option value="groq">Groq LLaMA</option>
                          </select>
                        </div>
                        <div className="flex-[3] space-y-2">
                          <label className="text-xs font-bold text-steel-300">Сырой промпт</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={llmTestPrompt}
                              onChange={(e) => setLlmTestPrompt(e.target.value)}
                              placeholder="Задайте вопрос нейросети напрямую..."
                              className="w-full bg-obsidian-950 border border-white/[0.06] rounded-xl px-4 py-3 font-mono text-xs text-white focus:outline-none focus:border-indigo-500/50"
                              onKeyDown={(e) => e.key === 'Enter' && runLlmTest()}
                            />
                            <button
                              onClick={runLlmTest}
                              disabled={llmTestLoading}
                              className="px-6 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs disabled:opacity-50 transition-all flex items-center justify-center min-w-[120px]"
                            >
                              {llmTestLoading ? <RefreshCw size={14} className="animate-spin" /> : 'Отправить'}
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {llmTestResult && (
                        <div className="bg-obsidian-950 p-4 rounded-xl border border-white/[0.04]">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] uppercase font-bold text-indigo-400">Ответ модели ({llmTestResult.provider})</span>
                            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Latency: {llmTestResult.latency_ms} ms</span>
                          </div>
                          <div className="text-xs text-white font-mono whitespace-pre-wrap leading-relaxed">
                            {llmTestResult.success ? llmTestResult.response : <span className="text-red-400">Ошибка: {llmTestResult.error}</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: SYSTEM LOGS */}
              {activeTab === 'system_logs' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Code size={18} className="text-emerald-400" />
                        Живые логи сервера (FastAPI)
                      </h2>
                    </div>
                    <button onClick={loadData} className="px-4 py-2 bg-obsidian-900 border border-white/[0.06] hover:bg-white/5 rounded-lg text-xs font-bold text-steel-300 flex items-center gap-2">
                      <RefreshCw size={14} /> Обновить
                    </button>
                  </div>
                  <div className="bg-[#0c0c0c] border border-white/[0.06] rounded-xl p-4 h-[60vh] overflow-y-auto custom-scrollbar font-mono text-[10px] leading-relaxed shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
                    {systemLogs.length > 0 ? (
                      systemLogs.map((log, i) => (
                        <div key={i} className={`py-0.5 ${log.includes('ERROR') ? 'text-red-400 font-bold' : log.includes('WARNING') ? 'text-amber-400' : 'text-emerald-500/80'}`}>
                          {log}
                        </div>
                      ))
                    ) : (
                      <div className="text-steel-600 italic">Логи пусты или недоступны...</div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: EXPORT */}
              {activeTab === 'export' && (
                <div className="glass-card p-6 border border-white/[0.05] space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                      <Download size={18} className="text-blue-400" />
                      Экспорт данных (Бэкап)
                    </h2>
                    <p className="text-xs text-steel-400">Скачивание массивов данных в формате CSV для Excel, финансового учета и аналитики.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/[0.04]">
                    <div className="bg-obsidian-950 p-5 rounded-xl border border-white/[0.04] flex flex-col items-start gap-4">
                      <div>
                        <h4 className="text-white font-bold mb-1">Пользователи и Лиды</h4>
                        <p className="text-[10px] text-steel-500">Полный список юзеров, контакты и тарифы.</p>
                      </div>
                      <a href={adminApi.getExportUrl('users')} target="_blank" rel="noreferrer" className="px-5 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg text-xs font-bold transition-colors">
                        Скачать CSV
                      </a>
                    </div>
                    <div className="bg-obsidian-950 p-5 rounded-xl border border-white/[0.04] flex flex-col items-start gap-4">
                      <div>
                        <h4 className="text-white font-bold mb-1">База Юристов</h4>
                        <p className="text-[10px] text-steel-500">Анкеты, рейтинги, статусы верификации.</p>
                      </div>
                      <a href={adminApi.getExportUrl('lawyers')} target="_blank" rel="noreferrer" className="px-5 py-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg text-xs font-bold transition-colors">
                        Скачать CSV
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: BILLING */}
              {activeTab === 'billing' && tokenAnalytics && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                      <DollarSign size={18} className="text-emerald-400" />
                      Биллинг и Расход Токенов
                    </h2>
                    <p className="text-xs text-steel-400">Аналитика затрат на API нейросетей. Помогает оценивать Unit-экономику платформы.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="glass-card p-5 border border-emerald-500/20 bg-emerald-500/5">
                      <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block mb-1">Затраты API (USD)</span>
                      <span className="text-3xl font-black text-white">${tokenAnalytics.estimated_cost_usd}</span>
                    </div>
                    <div className="glass-card p-5 border border-white/[0.05]">
                      <span className="text-[10px] text-steel-400 font-bold uppercase tracking-wider block mb-1">Потрачено B2C</span>
                      <span className="text-2xl font-bold text-white">{tokenAnalytics.b2c_tokens.toLocaleString()} <span className="text-xs text-steel-500">ток.</span></span>
                    </div>
                    <div className="glass-card p-5 border border-white/[0.05]">
                      <span className="text-[10px] text-steel-400 font-bold uppercase tracking-wider block mb-1">Потрачено B2B</span>
                      <span className="text-2xl font-bold text-indigo-400">{tokenAnalytics.b2b_tokens.toLocaleString()} <span className="text-xs text-steel-500">ток.</span></span>
                    </div>
                  </div>

                  {/* Token Chart Simulation */}
                  <div className="glass-card p-6 border border-white/[0.05]">
                    <h3 className="text-sm font-bold text-white mb-6">Сжигание токенов за неделю</h3>
                    <div className="flex items-end justify-between h-40 gap-2">
                      {tokenAnalytics.daily_burn.map((day, idx) => {
                        const maxTokens = Math.max(...tokenAnalytics.daily_burn.map(d => d.tokens));
                        const heightPct = (day.tokens / maxTokens) * 100;
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                            <div className="w-full bg-obsidian-950 rounded-t-md relative flex items-end justify-center" style={{ height: '100%' }}>
                              <div className="w-full bg-emerald-500/40 group-hover:bg-emerald-400 transition-all rounded-t-sm" style={{ height: `${heightPct}%` }}></div>
                              <div className="absolute bottom-full mb-2 bg-obsidian-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">
                                {day.tokens.toLocaleString()} ток.
                              </div>
                            </div>
                            <span className="text-[10px] text-steel-400 font-bold uppercase">{day.day}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        )}

        {/* Sliding Drawer: Lawyer detailed inspector */}
        <AnimatePresence>
          {selectedLawyer && (
            <motion.div 
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-end"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLawyer(null)}
            >
              <motion.div 
                className="w-full max-w-md bg-obsidian-900 border-l border-white/[0.06] h-full p-6 overflow-y-auto flex flex-col justify-between"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-white/[0.04] pb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Shield size={18} className="text-indigo-400" />
                      Инспекция юриста
                    </h3>
                    <button 
                      onClick={() => setSelectedLawyer(null)}
                      className="text-steel-500 hover:text-white font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Profile avatar / bio */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-2xl font-bold text-white uppercase shadow-[inset_0_0_20px_rgba(99,102,241,0.2)]">
                        {selectedLawyer.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-white font-extrabold text-base leading-tight">{selectedLawyer.name}</h4>
                        <span className="text-xs text-steel-400">ИИН: {selectedLawyer.iin}</span>
                        <div className="mt-1 flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${
                            selectedLawyer.verified 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' 
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                          }`}>
                            {selectedLawyer.verified ? 'Активен' : 'Ожидает верификации'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-obsidian-950 p-4 rounded-xl space-y-3 border border-white/[0.02]">
                      <div>
                        <span className="text-[10px] text-steel-500 block uppercase font-bold">Специализация</span>
                        <span className="text-xs text-white font-medium">{selectedLawyer.specialization}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-steel-500 block uppercase font-bold">Номер лицензии</span>
                        <span className="text-xs text-indigo-300 font-mono">{selectedLawyer.license_number}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-steel-500 block uppercase font-bold">Город</span>
                        <span className="text-xs text-white font-medium">{selectedLawyer.city || 'Не указан'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Statistics & Win Rate */}
                  <div className="space-y-3">
                    <h5 className="text-xs font-bold text-white uppercase tracking-wider">Судебные дела и рейтинг</h5>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-obsidian-950/60 border border-white/[0.04] p-3.5 rounded-xl text-center">
                        <span className="text-[9px] text-steel-500 block uppercase font-bold mb-1">Оценка</span>
                        <span className="text-lg font-black text-amber-400">{selectedLawyer.rating} ⭐</span>
                      </div>
                      <div className="bg-obsidian-950/60 border border-white/[0.04] p-3.5 rounded-xl text-center">
                        <span className="text-[9px] text-steel-500 block uppercase font-bold mb-1">Win Rate</span>
                        <span className="text-lg font-black text-emerald-400">{(selectedLawyer.win_rate * 100).toFixed(0)}%</span>
                      </div>
                    </div>

                    <div className="p-3 bg-obsidian-950/30 rounded-xl flex items-center justify-between text-xs text-steel-300 border border-white/[0.02]">
                      <span>Выиграно дел:</span>
                      <span className="text-white font-bold">{selectedLawyer.cases_won} из {selectedLawyer.cases_total}</span>
                    </div>
                  </div>
                </div>

                {/* Actions bottom */}
                <div className="border-t border-white/[0.04] pt-4 mt-6 flex items-center gap-3">
                  {selectedLawyer.verified ? (
                    <button
                      onClick={() => handleVerifyLawyer(selectedLawyer.id, false)}
                      className="flex-1 py-3 rounded-xl bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-obsidian-950 font-bold text-xs uppercase tracking-wider transition-colors border border-amber-500/30"
                    >
                      Отозвать верификацию
                    </button>
                  ) : (
                    <button
                      onClick={() => handleVerifyLawyer(selectedLawyer.id, true)}
                      className="flex-1 py-3 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-obsidian-950 font-bold text-xs uppercase tracking-wider transition-colors border border-emerald-500/30"
                    >
                      Подтвердить профиль
                    </button>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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
                <p className="text-sm text-steel-400 mb-6 font-sans">
                  Это действие сотрет все связанные данные пользователя безвозвратно, включая документы, сессии чата и связанные профили юристов.
                </p>
                
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
