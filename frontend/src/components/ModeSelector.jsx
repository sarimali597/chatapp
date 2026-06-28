import { Link } from 'react-router-dom';
import { Users, Shuffle, Loader2, X } from 'lucide-react';

export default function ModeSelector({ searching, onFindPartner, onCancelSearch }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Link
        to="/group"
        className="group rounded-2xl border border-white/10 bg-jet-black p-5 transition-colors hover:border-royal-blue/40 hover:bg-jet-black/70"
      >
        <Users className="size-6 text-royal-blue-light" />
        <h3 className="font-display mt-3 text-base font-semibold text-white">Group chat</h3>
        <p className="mt-1 text-sm text-white/55">Jump into the one shared room — everyone online is here.</p>
      </Link>

      {!searching ? (
        <button
          onClick={onFindPartner}
          className="group rounded-2xl border border-white/10 bg-jet-black p-5 text-left transition-colors hover:border-ocean-mist/40 hover:bg-jet-black/70"
        >
          <Shuffle className="size-6 text-ocean-mist-light" />
          <h3 className="font-display mt-3 text-base font-semibold text-white">Random partner</h3>
          <p className="mt-1 text-sm text-white/55">Get matched 1:1 with whoever's next in line.</p>
        </button>
      ) : (
        <div className="flex flex-col items-start justify-between rounded-2xl border border-ocean-mist/30 bg-jet-black p-5">
          <div>
            <Loader2 className="size-6 animate-spin text-ocean-mist-light" />
            <h3 className="font-display mt-3 text-base font-semibold text-white">Finding you a partner…</h3>
            <p className="mt-1 text-sm text-white/55">Hang tight, this is usually quick.</p>
          </div>
          <button
            onClick={onCancelSearch}
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-white/50 hover:text-white"
          >
            <X className="size-3.5" /> Cancel
          </button>
        </div>
      )}
    </div>
  );
}
