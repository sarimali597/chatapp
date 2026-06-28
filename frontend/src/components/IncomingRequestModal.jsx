import { MessageCircleQuestion } from 'lucide-react';
import { useSocket } from '../hooks/useSocket.js';

export default function IncomingRequestModal() {
  const { incomingRequest, respondToRequest } = useSocket();

  if (!incomingRequest) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-jet-black p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-royal-blue/20 text-royal-blue-light">
          <MessageCircleQuestion className="size-6" />
        </div>
        <h2 className="font-display text-lg font-semibold text-white">
          {incomingRequest.fromUsername} wants to chat
        </h2>
        <p className="mt-1 text-sm text-white/60">Accepting opens a private chat just between you two.</p>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => respondToRequest(incomingRequest.requestId, false)}
            className="flex-1 rounded-full border border-white/15 px-4 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/5"
          >
            Decline
          </button>
          <button
            onClick={() => respondToRequest(incomingRequest.requestId, true)}
            className="flex-1 rounded-full bg-ocean-mist px-4 py-2.5 text-sm font-semibold text-ink-black transition-colors hover:bg-ocean-mist-light"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
