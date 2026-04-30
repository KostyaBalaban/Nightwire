export default function ReplyQuote({ replyTo, snippet, isMine, onScrollTo }) {
  if (!replyTo) return null;

  return (
    <div
      onClick={onScrollTo}
      className={`border-l-2 pl-2 mb-1.5 py-0.5 rounded-sm cursor-pointer transition-opacity hover:opacity-80 ${
        isMine
          ? "border-white/40 bg-white/10"
          : "border-primary/50 bg-primary/5"
      }`}
    >
      {replyTo.isDeletedForEveryone ? (
        <p className="text-[11px] italic opacity-50">Message deleted</p>
      ) : (
        <p className="text-[11px] opacity-70 truncate max-w-[200px]">
          {replyTo.image && !(snippet || replyTo.text) ? "📷 Photo" : (snippet || replyTo.text)}
        </p>
      )}
    </div>
  );
}
