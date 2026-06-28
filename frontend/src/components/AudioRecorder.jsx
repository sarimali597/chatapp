import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Send, Trash2 } from 'lucide-react';

// Mirrors the backend default (MAX_VOICE_SECONDS) — if you change that
// env var, update this too so the recorder cuts off at the same point
// the server expects.
const MAX_SECONDS = 60;

export default function AudioRecorder({ onSend, onCancel, disabled }) {
  const [phase, setPhase] = useState('idle'); // idle | recording | preview
  const [seconds, setSeconds] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const blobRef = useRef(null);

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        blobRef.current = blob;
        setPreviewUrl(URL.createObjectURL(blob));
        setPhase('preview');
        streamRef.current?.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setPhase('recording');
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) {
            stopRecording();
            return MAX_SECONDS;
          }
          return s + 1;
        });
      }, 1000);
    } catch (err) {
      setError('Microphone access was denied or is unavailable.');
    }
  }

  function stopRecording() {
    clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
  }

  function discard() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    blobRef.current = null;
    setPreviewUrl(null);
    setPhase('idle');
    setSeconds(0);
    onCancel?.();
  }

  function send() {
    if (blobRef.current) {
      onSend(blobRef.current, seconds);
      discard();
    }
  }

  if (error) {
    return <p className="text-xs text-red-300 px-2">{error}</p>;
  }

  if (phase === 'idle') {
    return (
      <button
        type="button"
        onClick={startRecording}
        disabled={disabled}
        aria-label="Record a voice note"
        className="flex size-10 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-ocean-mist-light transition-colors disabled:opacity-40"
      >
        <Mic className="size-5" />
      </button>
    );
  }

  if (phase === 'recording') {
    return (
      <div className="flex items-center gap-2 rounded-full bg-jet-black px-3 py-1.5">
        <span className="size-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-sm tabular-nums text-white/80">
          {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')} / {Math.floor(MAX_SECONDS / 60)}:
          {String(MAX_SECONDS % 60).padStart(2, '0')}
        </span>
        <button
          type="button"
          onClick={stopRecording}
          aria-label="Stop recording"
          className="flex size-7 items-center justify-center rounded-full bg-royal-blue text-white hover:bg-royal-blue-dark transition-colors"
        >
          <Square className="size-3.5" />
        </button>
      </div>
    );
  }

  // preview
  return (
    <div className="flex items-center gap-2 rounded-full bg-jet-black px-3 py-1.5">
      <audio controls src={previewUrl} className="h-8 max-w-40" />
      <button
        type="button"
        onClick={discard}
        aria-label="Discard voice note"
        className="flex size-7 items-center justify-center rounded-full text-white/70 hover:bg-white/10 transition-colors"
      >
        <Trash2 className="size-4" />
      </button>
      <button
        type="button"
        onClick={send}
        aria-label="Send voice note"
        className="flex size-7 items-center justify-center rounded-full bg-ocean-mist text-ink-black hover:bg-ocean-mist-light transition-colors"
      >
        <Send className="size-3.5" />
      </button>
    </div>
  );
}
