export function MessageSkeleton() {
  const rows = [55, 40, 70, 45, 60];
  return (
    <div className="space-y-3 px-4 py-4">
      {rows.map((w, i) => (
        <div
          key={i}
          className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
        >
          <div
            className="h-9 rounded-2xl animate-pulse bg-base-300"
            style={{ width: `${w}%`, maxWidth: "260px" }}
          />
        </div>
      ))}
    </div>
  );
}

export function UserSkeleton() {
  return (
    <div className="space-y-0.5 px-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
        >
          <div className="w-10 h-10 rounded-full animate-pulse bg-base-300 flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div
              className="h-3.5 rounded animate-pulse bg-base-300"
              style={{ width: `${55 + (i % 3) * 15}%` }}
            />
            <div
              className="h-3 rounded animate-pulse bg-base-300"
              style={{ width: `${35 + (i % 2) * 20}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
