export default function TypingIndicator({ name }) {
  return (
    <div className="flex items-center gap-2 px-1 text-xs text-white/40">
      <span className="flex gap-0.5">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ocean-mist [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ocean-mist [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ocean-mist" />
      </span>
      {name} is typing…
    </div>
  );
}
