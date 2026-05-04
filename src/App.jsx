import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './i18n/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './components/Toast';
import { ChatProvider } from './contexts/ChatContext';
import { Scale } from 'lucide-react';
import { motion } from 'framer-motion';

// Strict Metallic Suspense Loader
const LoadingUI = () => (
  <div className="flex h-screen w-screen items-center justify-center bg-obsidian-950 overflow-hidden relative">
    <motion.div
      className="relative w-24 h-24"
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
    >
      <div className="absolute inset-0 rounded-3xl chrome-gradient shadow-[0_0_40px_rgba(255,255,255,0.1)] opacity-70" />
      <div className="absolute inset-[2px] rounded-[22px] bg-obsidian-900 flex items-center justify-center border border-obsidian-700">
        <motion.span
          className="text-white"
          animate={{ scale: [1, 1.1, 1], filter: ['brightness(1)', 'brightness(1.5)', 'brightness(1)'] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Scale size={32} strokeWidth={1.5} />
        </motion.span>
      </div>
      <motion.div
        className="absolute -inset-4 rounded-full border border-chrome-500/20 border-dashed"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      />
    </motion.div>
    <div className="absolute bottom-1/3 text-chrome-400 text-xs font-bold tracking-[0.3em] uppercase animate-pulse">
      Инициализация систем
    </div>
  </div>
);

// Lazy Load Pages for Performance
const LandingPage = lazy(() => import('./pages/LandingPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const CounterpartyPage = lazy(() => import('./pages/CounterpartyPage'));
const AuditPage = lazy(() => import('./pages/AuditPage'));
const DashboardLayout = lazy(() => import('./layouts/DashboardLayout'));
const LawyerLayout = lazy(() => import('./layouts/LawyerLayout'));
const LawyerDashboard = lazy(() => import('./pages/LawyerDashboard'));
const LawyerClients = lazy(() => import('./pages/LawyerClients'));
const LawyerCases = lazy(() => import('./pages/LawyerCases'));

// Route guard components
const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" />;
  return children;
};

// Lazy loaded placeholders for unfinished routes (Fallback)
const Placeholder = ({ title }) => (
  <div className="flex items-center justify-center h-full text-steel-400 text-lg font-light tracking-wide">
    Модуль: <span className="text-chrome-200 font-bold ml-2">{title}</span> <span className="ml-2 opacity-50 text-sm">(В разработке)</span>
  </div>
);

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingUI />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<PublicRoute><AuthPage /></PublicRoute>} />
        
        <Route path="/dashboard" element={
          <PrivateRoute>
            <ChatProvider>
              <DashboardLayout />
            </ChatProvider>
          </PrivateRoute>
        }>
          <Route index element={<ChatPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="counterparty" element={<CounterpartyPage />} />
          <Route path="audit" element={<AuditPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        <Route path="/lawyer" element={
          <PrivateRoute>
            <LawyerLayout />
          </PrivateRoute>
        }>
          <Route index element={<LawyerDashboard />} />
          <Route path="audit" element={<AuditPage />} />
          <Route path="clients" element={<LawyerClients />} />
          <Route path="cases" element={<LawyerCases />} />
          <Route path="templates" element={<Placeholder title="Шаблоны" />} />
          <Route path="ai" element={<Placeholder title="AI Ассистент" />} />
          <Route path="profile" element={<Placeholder title="Профиль юриста" />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <ToastProvider>
              <div className="min-h-screen font-inter bg-obsidian-950 text-white selection:bg-chrome-500/30 selection:text-white">
                <AppRoutes />
              </div>
            </ToastProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
