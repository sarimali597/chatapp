import { useState } from 'react';
import { DURATION_OPTIONS } from '../../utils/constants';

export default function RestrictionModal({ username, actionLabel, onConfirm, onCancel }) {
  const [duration, setDuration] = useState('10m');

  if (!username) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">
          {actionLabel} {username}
        </div>
        <div className="modal-body">Choose how long this restriction should last. It will lift automatically.</div>

        <div className="modal-duration-options">
          {DURATION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`duration-pill ${duration === opt.value ? 'is-selected' : ''}`}
              onClick={() => setDuration(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={() => onConfirm(duration)}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
