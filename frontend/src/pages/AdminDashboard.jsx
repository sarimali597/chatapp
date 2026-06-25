import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ShieldCheck, EyeOff } from 'lucide-react';
import { adminApi, setAdminToken } from '../services/api';
import { getAdminSocket, disconnectAdminSocket } from '../services/socket';
import { ADMIN_SESSION_KEY } from '../utils/constants';
import { StatsCards, UsersTable, RoomsTable } from '../components/admin/AdminTables';
import RestrictionModal from '../components/admin/RestrictionModal';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState(null);
  const [connectionError, setConnectionError] = useState(null);
  const [pendingAction, setPendingAction] = useState(null); // { username, type: 'mute'|'restrict' }
  const socketRef = useRef(null);

  useEffect(() => {
    const token = sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (!token) {
      navigate('/admin/login');
      return undefined;
    }

    setAdminToken(token);

    const socket = getAdminSocket(token);
    socketRef.current = socket;
    socket.connect();

    socket.on('admin:snapshot', setSnapshot);
    socket.on('connect_error', (err) => setConnectionError(err.message));

    // REST fallback in case the socket hasn't delivered a snapshot yet.
    adminApi.getStats().then((stats) => setSnapshot((s) => s || { stats, users: [], rooms: [] })).catch(() => {});

    return () => {
      disconnectAdminSocket();
    };
  }, [navigate]);

  function handleLogout() {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    setAdminToken(null);
    disconnectAdminSocket();
    navigate('/admin/login');
  }

  async function handleDisconnect(username) {
    if (!window.confirm(`Disconnect ${username} from ChatFlow?`)) return;
    try {
      await adminApi.disconnectUser(username);
    } catch (err) {
      alert(err?.response?.data?.error || 'Could not disconnect this user.');
    }
  }

  async function handleConfirmRestriction(duration) {
    const { username, type } = pendingAction;
    try {
      if (type === 'mute') await adminApi.muteUser(username, duration);
      else await adminApi.restrictUser(username, duration);
    } catch (err) {
      alert(err?.response?.data?.error || 'Action failed.');
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <div className="topbar-brand">
          <ShieldCheck size={18} color="var(--accent-secondary)" />
          <span className="topbar-brand-name">
            Chat<span>Flow</span> Admin
          </span>
        </div>
        <button className="icon-btn" onClick={handleLogout} title="Sign out">
          <LogOut size={15} />
        </button>
      </header>

      <div className="admin-content">
        <div className="admin-note">
          <EyeOff size={18} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>
            <strong>Privacy by design.</strong> This dashboard only ever shows usernames, presence, and room
            metadata. No message content is stored or accessible from the admin panel, by anyone.
          </span>
        </div>

        {connectionError && <div className="auth-error">Live connection issue: {connectionError}</div>}

        <h2 className="admin-section-title">Server Overview</h2>
        <StatsCards stats={snapshot?.stats} />

        <UsersTable
          users={snapshot?.users || []}
          onMute={(username) => setPendingAction({ username, type: 'mute' })}
          onRestrict={(username) => setPendingAction({ username, type: 'restrict' })}
          onDisconnect={handleDisconnect}
        />

        <RoomsTable rooms={snapshot?.rooms || []} />
      </div>

      <RestrictionModal
        username={pendingAction?.username}
        actionLabel={pendingAction?.type === 'mute' ? 'Mute' : 'Restrict'}
        onConfirm={handleConfirmRestriction}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
}
