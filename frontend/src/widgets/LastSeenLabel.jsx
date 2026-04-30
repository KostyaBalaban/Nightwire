import {
  formatDistanceToNow,
  isToday,
  isYesterday,
  format,
} from "date-fns";

function humanize(date) {
  const d = new Date(date);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1)  return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;

  if (isToday(d))     return `today at ${format(d, "HH:mm")}`;
  if (isYesterday(d)) return `yesterday at ${format(d, "HH:mm")}`;

  return format(d, "d MMM");
}

export default function LastSeenLabel({ user, isOnline }) {
  if (isOnline) {
    return <span className="text-xs text-green-400">Online</span>;
  }

  if (!user?.lastSeen) {
    return <span className="text-xs text-base-content/40">Offline</span>;
  }

  return (
    <span className="text-xs text-base-content/40">
      last seen {humanize(user.lastSeen)}
    </span>
  );
}
