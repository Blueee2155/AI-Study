import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './components/layout/Dashboard';
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import ChatPanel from './components/chat/ChatPanel';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('ai-tutor-auth');
  if (!token) {
    window.location.href = '/login';
    return null;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>}>
          <Route index element={<ChatPanel />} />
          <Route path="chat/:sessionId" element={<ChatPanel />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}