import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthScreen from './components/AuthScreen';
import HabitListView from './components/HabitListView';
import HabitDetailView from './components/HabitDetailView';
import SettingsView from './components/SettingsView';

function AppRoutes() {
  const { isLoggedIn, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center font-mono text-[var(--secondary)]">
        Loading...
      </div>
    );
  }

  if (!isLoggedIn) {
    return <AuthScreen />;
  }

  return (
    <Routes>
      <Route path="/" element={<HabitListView />} />
      <Route path="/habit/:id" element={<HabitDetailView />} />
      <Route path="/settings" element={<SettingsView />} />
    </Routes>
  );
}

export default function App() {
  return (
    <div className="mx-auto w-full max-w-[600px] h-dvh bg-[var(--background)] flex flex-col overflow-hidden" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)' }}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}
