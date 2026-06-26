import { X } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

export default function NotificationStack() {
  const { notifications, dismiss } = useNotifications();

  if (notifications.length === 0) return null;

  return (
    <div className="notification-stack">
      {notifications.map((n) => (
        <div className={`notification-toast is-${n.variant}`} key={n.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <div className="notification-title">{n.title}</div>
            <button className="icon-btn" style={{ width: 22, height: 22, flexShrink: 0 }} onClick={() => dismiss(n.id)} aria-label="Dismiss">
              <X size={12} />
            </button>
          </div>
          {n.body && <div className="notification-body">{n.body}</div>}
        </div>
      ))}
    </div>
  );
}
