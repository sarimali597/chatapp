import { VolumeX, ShieldAlert, Power } from 'lucide-react';
import { Badge } from '../common/UI';

export function StatsCards({ stats }) {
  if (!stats) return null;

  const cards = [
    { label: 'Online Users', value: stats.onlineUsers },
    { label: 'Private Rooms', value: stats.privateRooms },
    { label: 'Random Rooms', value: stats.randomRooms },
    { label: 'Queue Waiting', value: stats.queueLength },
    { label: 'Uptime (s)', value: stats.uptimeSeconds },
  ];

  return (
    <div className="stats-grid">
      {cards.map((c) => (
        <div className="stat-card" key={c.label}>
          <div className="stat-card-label">{c.label}</div>
          <div className="stat-card-value">{c.value}</div>
        </div>
      ))}
    </div>
  );
}

function userStatusBadge(user) {
  if (user.isRestricted) return <Badge variant="restricted">Restricted</Badge>;
  if (user.isMuted) return <Badge variant="muted">Muted</Badge>;
  return <Badge variant="online">Online</Badge>;
}

export function UsersTable({ users, onMute, onRestrict, onDisconnect }) {
  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h3>Online Users ({users.length})</h3>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Username</th>
            <th>Status</th>
            <th>Current View</th>
            <th>Joined</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr>
              <td colSpan={5} className="empty-row">
                No users online.
              </td>
            </tr>
          ) : (
            users.map((u) => (
              <tr key={u.username}>
                <td>{u.username}</td>
                <td>{userStatusBadge(u)}</td>
                <td className="mono">{u.currentView}</td>
                <td className="mono">{new Date(u.joinedAt).toLocaleTimeString()}</td>
                <td>
                  <div className="table-actions">
                    <button className="icon-btn" title="Mute" onClick={() => onMute(u.username)}>
                      <VolumeX size={14} />
                    </button>
                    <button className="icon-btn" title="Restrict" onClick={() => onRestrict(u.username)}>
                      <ShieldAlert size={14} />
                    </button>
                    <button className="icon-btn" title="Disconnect" onClick={() => onDisconnect(u.username)}>
                      <Power size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function RoomsTable({ rooms }) {
  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h3>Active Rooms ({rooms.length})</h3>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Participants</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {rooms.length === 0 ? (
            <tr>
              <td colSpan={3} className="empty-row">
                No active private or random rooms.
              </td>
            </tr>
          ) : (
            rooms.map((r) => (
              <tr key={r.id}>
                <td>
                  <Badge variant={r.type === 'random' ? 'neutral' : 'online'}>{r.type}</Badge>
                </td>
                <td>{r.participants.join(' & ')}</td>
                <td className="mono">{new Date(r.createdAt).toLocaleTimeString()}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
