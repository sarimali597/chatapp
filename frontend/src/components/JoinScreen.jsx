import { useState } from "react";

export default function JoinScreen({ onJoin, defaultName }) {
  const [name, setName] = useState(defaultName || "");

  function handleSubmit(e) {
    e.preventDefault();
    onJoin(name);
  }

  return (
    <div className="flex h-screen items-center justify-center bg-ink-black px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-jet-black p-8 shadow-2xl"
      >
        <div className="mb-6 flex items-center gap-2">
          <span className="pulse-dot h-2.5 w-2.5 rounded-full bg-ocean-mist" />
          <p className="text-xs font-medium uppercase tracking-widest text-ocean-mist">
            Live chat
          </p>
        </div>

        <h1 className="font-display text-2xl font-semibold text-white">
          Pick a name to join
        </h1>
        <p className="mt-1 text-sm text-white/50">
          Everyone in the room will see your messages instantly.
        </p>

        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={24}
          placeholder="e.g. Sarim"
          className="mt-6 w-full rounded-lg border border-white/10 bg-ink-black px-4 py-3 text-white placeholder-white/30 outline-none focus:border-ocean-mist focus:ring-2 focus:ring-ocean-mist/40"
        />

        <button
          type="submit"
          disabled={!name.trim()}
          className="mt-4 w-full rounded-lg bg-royal-blue px-4 py-3 font-medium text-white transition hover:bg-royal-blue/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Join chat
        </button>
      </form>
    </div>
  );
}
