import { Routes, Route, useLocation } from 'react-router-dom';
import Home from './pages/Home.jsx';
import GroupChat from './pages/GroupChat.jsx';
import OneOnOne from './pages/OneOnOne.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import ConnectionBanner from './components/ConnectionBanner.jsx';
import IncomingRequestModal from './components/IncomingRequestModal.jsx';

export default function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <>
      {/* The admin dashboard runs its own separate socket connection and
          auth flow — the regular-user connection banner/request modal
          don't apply there. */}
      {!isAdminRoute && <ConnectionBanner />}
      {!isAdminRoute && <IncomingRequestModal />}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/group" element={<GroupChat />} />
        <Route path="/room/:roomId" element={<OneOnOne />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </>
  );
}
