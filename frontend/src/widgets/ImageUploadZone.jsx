import { Upload, X } from "lucide-react";
import toast from "react-hot-toast";

export default function ImageUploadZone({ onSelect, onClear, preview }) {
  const handleChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onSelect(reader.result);
    reader.readAsDataURL(file);
  };

  if (preview) {
    return (
      <div className="relative inline-block">
        <img
          src={preview}
          alt="preview"
          className="h-32 rounded-xl object-cover border border-base-300"
        />
        <button
          type="button"
          onClick={onClear}
          className="absolute -top-2 -right-2 btn btn-circle btn-xs btn-error"
        >
          <X size={10} />
        </button>
      </div>
    );
  }

  return (
    <label className="cursor-pointer block">
      <div className="border-2 border-dashed border-base-300 rounded-xl p-6 flex flex-col items-center gap-2 hover:border-primary transition-colors">
        <Upload size={20} className="text-base-content/40" />
        <p className="text-sm text-base-content/50">Click to upload image</p>
        <p className="text-xs text-base-content/30">PNG, JPG · max 5 MB</p>
      </div>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
    </label>
  );
}
