import { FileText, Film, Music, Archive, Download, File } from "lucide-react";

function formatBytes(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(fileType) {
  switch (fileType) {
    case "video":    return Film;
    case "audio":    return Music;
    case "document": return FileText;
    default:         return File;
  }
}

async function downloadFile(fileUrl, fileName) {
  try {
    const res = await fetch(fileUrl);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName || "file";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    window.open(fileUrl, "_blank");
  }
}

export default function FileCard({ fileUrl, fileType, fileName, fileSize, isMine }) {
  if (!fileUrl) return null;

  const Icon = fileIcon(fileType);

  if (fileType === "video") {
    return (
      <div className="mb-1.5 rounded-xl overflow-hidden max-w-xs">
        <video
          src={fileUrl}
          controls
          className="w-full rounded-xl"
          preload="metadata"
        />
        {fileName && (
          <p className={`text-xs mt-1 ${isMine ? "text-white/60" : "text-base-content/50"}`}>
            {fileName}
          </p>
        )}
      </div>
    );
  }

  if (fileType === "audio") {
    return (
      <div className="mb-1.5">
        <audio src={fileUrl} controls className="w-full max-w-xs" />
        {fileName && (
          <p className={`text-xs mt-1 ${isMine ? "text-white/60" : "text-base-content/50"}`}>
            {fileName}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      role="button"
      onClick={() => downloadFile(fileUrl, fileName)}
      className={`flex items-center gap-3 mb-1.5 px-3 py-2.5 rounded-xl border transition-colors cursor-pointer ${
        isMine
          ? "border-white/20 hover:bg-white/10"
          : "border-base-300 hover:bg-base-300"
      }`}
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
        isMine ? "bg-white/20" : "bg-ember-500/15"
      }`}>
        <Icon size={18} className={isMine ? "text-white" : "text-ember-500"} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isMine ? "text-white" : "text-base-content"}`}>
          {fileName || "File"}
        </p>
        {fileSize > 0 && (
          <p className={`text-xs ${isMine ? "text-white/50" : "text-base-content/40"}`}>
            {formatBytes(fileSize)}
          </p>
        )}
      </div>
      <Download size={14} className={`flex-shrink-0 ${isMine ? "text-white/60" : "text-base-content/40"}`} />
    </div>
  );
}
