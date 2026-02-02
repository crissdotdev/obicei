import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthScreen from './components/AuthScreen';
import HabitListView from './components/HabitListView';
import HabitDetailView from './components/HabitDetailView';

function AppRoutes() {
  const { isLoggedIn, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-mono text-[var(--secondary)]">
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
    </Routes>
  );
}

export default function App() {
  return (
    <div className="mx-auto w-full max-w-[600px]">
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}
