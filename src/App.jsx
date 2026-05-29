import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './i18n/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './components/Toast';
import { ChatProvider } from './contexts/ChatContext';
import ErrorBoundary from './components/ErrorBoundary';
import CommandPalette from './components/CommandPalette';
import { Scale } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Minimalist Loading UI
const LoadingUI = () => (
  <div className="flex h-screen w-screen items-center justify-center bg-black overflow-hidden relative">
    <motion.div
      className="relative w-16 h-16 flex items-center justify-center bg-white rounded-2xl shadow-[0_0_40px_rgba(255,255,255,0.2)]"
      animate={{ scale: [0.95, 1.05, 0.95] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    >
      <Scale size={32} className="text-black" strokeWidth={2} />
    </motion.div>
  </div>
);

// Lazy Load Pages for Performance
const LandingPage = lazy(() => import('./pages/LandingPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const DocumentWorkspace = lazy(() => import('./pages/DocumentWorkspace'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const CounterpartyPage = lazy(() => import('./pages/CounterpartyPage'));
const DashboardLayout = lazy(() => import('./layouts/DashboardLayout'));
const LawyerLayout = lazy(() => import('./layouts/LawyerLayout'));
const LawyerDashboard = lazy(() => import('./pages/LawyerDashboard'));
const LawyerClients = lazy(() => import('./pages/LawyerClients'));
const LawyerCases = lazy(() => import('./pages/LawyerCases'));
const LawyerLeads = lazy(() => import('./pages/LawyerLeads'));
const LawyerTemplates = lazy(() => import('./pages/LawyerTemplates'));
const LawyerProfile = lazy(() => import('./pages/LawyerProfile'));
const LawyerMarketplace = lazy(() => import('./pages/LawyerMarketplace'));
const LawyerPublicProfile = lazy(() => import('./pages/LawyerPublicProfile'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

// Route guard components
const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  if (user) {
    if (user.role === 'lawyer') return <Navigate to="/lawyer" />;
    if (user.role === 'admin') return <Navigate to="/admin" />;
    return <Navigate to="/dashboard" />;
  }
  return children;
};

const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user || user.role !== 'admin') return <Navigate to="/dashboard" />;
  return children;
};

// Command palette wrapper
const AuthenticatedCommandPalette = () => {
  const { user } = useAuth();
  if (!user) return null;
  return <CommandPalette />;
};

const Placeholder = ({ title }) => (
  <div className="flex items-center justify-center h-full text-neutral-500 text-lg font-medium tracking-wide">
    {title} <span className="ml-2 opacity-50 text-sm">(В разработке)</span>
  </div>
);

// Page transition wrapper
const PageWrapper = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
    exit={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
    transition={{ duration: 0.3, ease: 'easeOut' }}
    className="h-full w-full"
  >
    {children}
  </motion.div>
);

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname.split('/')[1] || '/'}>
        <Route path="/" element={<PageWrapper><LandingPage /></PageWrapper>} />
        <Route path="/pricing" element={<PageWrapper><PricingPage /></PageWrapper>} />
        <Route path="/auth" element={<PageWrapper><PublicRoute><AuthPage /></PublicRoute></PageWrapper>} />
        <Route path="/admin" element={<PageWrapper><AdminRoute><AdminDashboard /></AdminRoute></PageWrapper>} />
        <Route path="/lawyers" element={<PageWrapper><LawyerMarketplace /></PageWrapper>} />
        <Route path="/lawyers/rankings" element={<PageWrapper><Placeholder title="Глобальный рейтинг юристов" /></PageWrapper>} />
        <Route path="/lawyers/:id" element={<PageWrapper><LawyerPublicProfile /></PageWrapper>} />
        
        <Route path="/dashboard" element={
          <PageWrapper>
            <PrivateRoute>
              <ChatProvider>
                <DashboardLayout />
              </ChatProvider>
            </PrivateRoute>
          </PageWrapper>
        }>
          <Route index element={<ChatPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="documents/:id" element={<DocumentWorkspace />} />
          <Route path="counterparty" element={<CounterpartyPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        <Route path="/lawyer" element={
          <PageWrapper>
            <PrivateRoute>
              <ChatProvider>
                <LawyerLayout />
              </ChatProvider>
            </PrivateRoute>
          </PageWrapper>
        }>
          <Route index element={<LawyerDashboard />} />
          <Route path="leads" element={<LawyerLeads />} />
          <Route path="clients" element={<LawyerClients />} />
          <Route path="cases" element={<LawyerCases />} />
          <Route path="templates" element={<LawyerTemplates />} />
          <Route path="ai" element={<ChatPage />} />
          <Route path="profile" element={<LawyerProfile />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <ToastProvider>
                <div className="min-h-screen font-sans bg-black text-white selection:bg-white/30 selection:text-white relative">
                  {/* Premium Global Ambient Background (Serious/Slate Tone) */}
                  <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                    <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-slate-400/5 blur-[150px]" />
                    <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-white/5 blur-[150px]" />
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] mix-blend-overlay" />
                  </div>
                  
                  <div className="relative z-10 h-full w-full">
                    <AuthenticatedCommandPalette />
                    <Suspense fallback={<LoadingUI />}>
                      <AnimatedRoutes />
                    </Suspense>
                  </div>
                </div>
              </ToastProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
