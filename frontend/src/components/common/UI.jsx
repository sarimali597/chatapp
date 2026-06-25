export function Avatar({ name, size = 'md', online = false }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  const sizeClass = size === 'sm' ? 'avatar-sm' : size === 'lg' ? 'avatar-lg' : '';

  return (
    <div className={`avatar ${sizeClass}`} aria-hidden="true">
      {initial}
      {online && <span className="avatar-presence" />}
    </div>
  );
}

export function Badge({ variant = 'neutral', children }) {
  return <span className={`badge badge-${variant}`}>{children}</span>;
}

export function Button({ variant = 'primary', size, className = '', children, ...rest }) {
  const sizeClass = size === 'sm' ? 'btn-sm' : '';
  return (
    <button className={`btn btn-${variant} ${sizeClass} ${className}`.trim()} {...rest}>
      {children}
    </button>
  );
}

export function Spinner() {
  return <span className="spinner" role="status" aria-label="Loading" />;
}

/**
 * Signature brand motif: three bars pulsing in sequence, evoking a live
 * signal / data flow — the visual shorthand for "ChatFlow" used throughout
 * the app instead of a generic chat-bubble icon.
 */
export function SignalMark() {
  return (
    <span className="signal-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}
