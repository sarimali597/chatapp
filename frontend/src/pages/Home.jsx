import { useState } from 'react';
import { useSocket } from '../hooks/useSocket.js';
import JoinScreen from '../components/JoinScreen.jsx';
import ModeSelector from '../components/ModeSelector.jsx';
import RoomList from '../components/RoomList.jsx';

export default function Home() {
  const { username, findPartner, leaveQueue } = useSocket();
  const [searching, setSearching] = useState(false);

  if (!username) return <JoinScreen />;

  async function handleFindPartner() {
    setSearching(true);
    const res = await findPartner();
    if (!res.success) setSearching(false);
  }

  async function handleCancelSearch() {
    await leaveQueue();
    setSearching(false);
  }

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-8">
          <h1 className="font-display text-2xl font-bold text-white">
            Hey, <span className="text-ocean-mist-light">{username}</span>
          </h1>
          <p className="mt-1 text-sm text-white/55">Pick how you want to talk.</p>
        </header>

        <ModeSelector
          searching={searching}
          onFindPartner={handleFindPartner}
          onCancelSearch={handleCancelSearch}
        />

        <div className="mt-4">
          <RoomList />
        </div>
      </div>
    </div>
  );
}
