export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 px-1 animate-msg-in">
      <div className="flex items-center gap-1 bg-neutral px-3 py-2.5 rounded-2xl rounded-bl-sm">
        <span
          className="w-1.5 h-1.5 bg-base-content/50 rounded-full animate-bounce"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="w-1.5 h-1.5 bg-base-content/50 rounded-full animate-bounce"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="w-1.5 h-1.5 bg-base-content/50 rounded-full animate-bounce"
          style={{ animationDelay: "300ms" }}
        />
      </div>
      <span className="text-xs text-base-content/40">typing…</span>
    </div>
  );
}
