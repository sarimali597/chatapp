import { useEffect, useState } from 'react';
import { Check, X, Loader2, ArrowRight } from 'lucide-react';
import { useSocket } from '../hooks/useSocket.js';

export default function JoinScreen() {
  const { joinAsUsername, checkUsernameAvailability, connectionStatus } = useSocket();
  const [value, setValue] = useState('');
  const [availability, setAvailability] = useState(null); // null | { available, reason }
  const [checking, setChecking] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState(null);

  useEffect(() => {
    if (!value.trim()) {
      setAvailability(null);
      return;
    }
    setChecking(true);
    const handle = setTimeout(async () => {
      const res = await checkUsernameAvailability(value.trim());
      setAvailability(res);
      setChecking(false);
    }, 350);
    return () => clearTimeout(handle);
  }, [value, checkUsernameAvailability]);

  async function handleSubmit(e) {
    e.preventDefault();
    const name = value.trim();
    if (!name || joining) return;
    setJoining(true);
    setJoinError(null);
    const res = await joinAsUsername(name);
    if (!res.success) {
      setJoinError(res.error);
      setJoining(false);
    }
    // on success, context flips `username` and Home re-renders past this screen
  }

  const canSubmit = value.trim().length >= 2 && availability?.available && !checking && connectionStatus === 'connected';

  return (
    <div className="gradient-bottom-right flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold text-white">ChatFlow</h1>
          <p className="mt-2 text-sm text-white/60">
            No signup. No saved messages. Pick a name, start talking, leave nothing behind.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-jet-black/60 p-5 backdrop-blur">
          <label htmlFor="username" className="mb-1.5 block text-xs font-medium text-white/60">
            Pick a username
          </label>
          <div className="relative">
            <input
              id="username"
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g. midnight_owl"
              maxLength={20}
              className="w-full rounded-xl bg-ink-black px-4 py-3 pr-10 text-[15px] text-white placeholder:text-white/30 focus:outline-none"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              {checking && <Loader2 className="size-4 animate-spin text-white/40" />}
              {!checking && availability?.available && <Check className="size-4 text-ocean-mist-light" />}
              {!checking && availability && !availability.available && <X className="size-4 text-red-400" />}
            </span>
          </div>

          {availability && !availability.available && (
            <p className="mt-1.5 text-xs text-red-300">{availability.reason}</p>
          )}
          {joinError && <p className="mt-1.5 text-xs text-red-300">{joinError}</p>}

          <button
            type="submit"
            disabled={!canSubmit || joining}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-royal-blue px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-royal-blue-dark disabled:opacity-30"
          >
            {joining ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
            Enter ChatFlow
          </button>

          <p className="mt-3 text-center text-[11px] text-white/30">
            2-20 characters · letters, numbers, _ or - · released a few seconds after you leave
          </p>
        </form>
      </div>
    </div>
  );
}
