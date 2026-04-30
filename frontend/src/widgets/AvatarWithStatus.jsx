const sizeMap = {
  sm: { avatar: "w-8 h-8 text-xs",  dot: "w-2 h-2" },
  md: { avatar: "w-10 h-10 text-sm", dot: "w-2.5 h-2.5" },
  lg: { avatar: "w-14 h-14 text-lg", dot: "w-3 h-3" },
};

export default function AvatarWithStatus({ src, name, size = "md", online = false }) {
  const { avatar, dot } = sizeMap[size] || sizeMap.md;

  const initials = name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "?";

  return (
    <div className="relative inline-flex flex-shrink-0">
      {src ? (
        <img
          src={src}
          alt={name}
          className={`${avatar} rounded-full object-cover ring-2 ring-base-300`}
        />
      ) : (
        <div
          className={`${avatar} rounded-full bg-ember-600 flex items-center justify-center font-semibold text-white ring-2 ring-base-300`}
        >
          {initials}
        </div>
      )}
      {online && (
        <span
          className={`${dot} absolute bottom-0 right-0 rounded-full bg-green-400 border-2 border-base-100`}
        />
      )}
    </div>
  );
}
