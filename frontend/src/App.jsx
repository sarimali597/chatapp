import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { NotificationProvider } from './context/NotificationContext';
import { UserProvider } from './context/UserContext';
import { SocketProvider } from './context/SocketContext';
import { ChatProvider } from './context/ChatContext';

import Login from './pages/Login';
import Chat from './pages/Chat';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <UserProvider>
          <SocketProvider>
            <ChatProvider>
              <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </ChatProvider>
          </SocketProvider>
        </UserProvider>
      </NotificationProvider>
    </BrowserRouter>
  );
}
