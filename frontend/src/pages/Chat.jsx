import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useChat } from '../context/ChatContext';
import TopBar from '../components/layout/TopBar';
import Sidebar from '../components/layout/Sidebar';
import ChatWindow from '../components/chat/ChatWindow';
import RequestModal from '../components/modals/RequestModal';
import NotificationStack from '../components/notifications/NotificationStack';

export default function Chat() {
  const { username } = useChat();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close the mobile drawer automatically on wider viewports.
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth > 880) setSidebarOpen(false);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!username) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="app-shell">
      <TopBar onToggleSidebar={() => setSidebarOpen((v) => !v)} />
      <div className="app-body">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <ChatWindow />
      </div>
      <RequestModal />
      <NotificationStack />
    </div>
  );
}
