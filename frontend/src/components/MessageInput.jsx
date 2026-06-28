import { useRef, useState } from 'react';
import { Image as ImageIcon, Send, Loader2 } from 'lucide-react';
import { useSocket } from '../hooks/useSocket.js';
import { uploadMedia } from '../lib/uploadMedia.js';
import AudioRecorder from './AudioRecorder.jsx';

const MAX_IMAGE_MB = 5; // mirrors backend MAX_IMAGE_MB default

export default function MessageInput({ roomId }) {
  const { sendMessage, setTyping } = useSocket();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  function handleTextChange(e) {
    setText(e.target.value);
    setTyping(roomId, true);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setTyping(roomId, false), 1500);
  }

  async function handleSendText(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setText('');
    setTyping(roomId, false);
    const res = await sendMessage(roomId, 'text', trimmed);
    if (!res.success) setError(res.error);
  }

  async function handleImagePick(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setError(`Image is larger than ${MAX_IMAGE_MB}MB.`);
      return;
    }

    setBusy(true);
    setUploadProgress(0);
    setError(null);
    try {
      const { url } = await uploadMedia(file, 'image', setUploadProgress);
      const res = await sendMessage(roomId, 'image', url);
      if (!res.success) setError(res.error);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      setUploadProgress(null);
    }
  }

  async function handleVoiceSend(blob, durationSeconds) {
    setBusy(true);
    setUploadProgress(0);
    setError(null);
    try {
      const { url, durationSeconds: serverDuration } = await uploadMedia(blob, 'video', setUploadProgress);
      const res = await sendMessage(roomId, 'voice', url, serverDuration || durationSeconds);
      if (!res.success) setError(res.error);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      setUploadProgress(null);
    }
  }

  return (
    <div className="border-t border-white/10 bg-ink-black px-3 py-3">
      {error && (
        <p className="mb-2 px-2 text-xs text-red-300">
          {error}{' '}
          <button onClick={() => setError(null)} className="underline underline-offset-2">
            dismiss
          </button>
        </p>
      )}

      {uploadProgress !== null && (
        <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-jet-black">
          <div className="h-full bg-ocean-mist transition-all" style={{ width: `${uploadProgress}%` }} />
        </div>
      )}

      <form onSubmit={handleSendText} className="flex items-end gap-1.5">
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImagePick} className="hidden" />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          aria-label="Attach an image"
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-ocean-mist-light transition-colors disabled:opacity-40"
        >
          <ImageIcon className="size-5" />
        </button>

        <AudioRecorder onSend={handleVoiceSend} disabled={busy} />

        <textarea
          value={text}
          onChange={handleTextChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendText(e);
            }
          }}
          rows={1}
          placeholder="Say something…"
          disabled={busy}
          className="min-h-10 flex-1 resize-none rounded-2xl bg-jet-black px-4 py-2.5 text-[15px] text-white placeholder:text-white/40 focus:outline-none disabled:opacity-60 scroll-thin"
        />

        <button
          type="submit"
          disabled={!text.trim() || busy}
          aria-label="Send message"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-royal-blue text-white transition-colors hover:bg-royal-blue-dark disabled:opacity-30"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </button>
      </form>
    </div>
  );
}
