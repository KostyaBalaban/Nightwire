import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, ChevronLeft, ChevronRight } from "lucide-react";

export default function ImageModal({ src, images = [], onClose }) {
  const startIdx = images.indexOf(src);
  const [idx, setIdx] = useState(startIdx >= 0 ? startIdx : 0);

  const currentSrc = images.length > 0 ? images[idx] : src;
  const hasNav = images.length > 1;

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape")     onClose();
      if (e.key === "ArrowLeft")  go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [idx]);

  const go = (dir) =>
    setIdx((i) => (i + dir + images.length) % images.length);

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = currentSrc;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/92 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Controls top-right */}
      <div
        className="absolute top-4 right-4 flex gap-2 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleDownload}
          className="btn btn-circle btn-sm bg-white/10 border-none hover:bg-white/20 text-white"
          title="Download"
        >
          <Download size={15} />
        </button>
        <button
          onClick={onClose}
          className="btn btn-circle btn-sm bg-white/10 border-none hover:bg-white/20 text-white"
        >
          <X size={15} />
        </button>
      </div>

      {/* Image */}
      <AnimatePresence mode="wait">
        <motion.img
          key={currentSrc}
          initial={{ opacity: 0, scale: 0.93 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.93 }}
          transition={{ duration: 0.15 }}
          src={currentSrc}
          alt="Full size"
          className="max-h-[88vh] max-w-[88vw] object-contain rounded-xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      </AnimatePresence>

      {/* Navigation */}
      {hasNav && (
        <>
          <button
            className="absolute left-4 btn btn-circle btn-sm bg-white/10 border-none hover:bg-white/20 text-white"
            onClick={(e) => { e.stopPropagation(); go(-1); }}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="absolute right-4 btn btn-circle btn-sm bg-white/10 border-none hover:bg-white/20 text-white"
            onClick={(e) => { e.stopPropagation(); go(1); }}
          >
            <ChevronRight size={18} />
          </button>
          <p className="absolute bottom-4 text-white/50 text-sm select-none">
            {idx + 1} / {images.length}
          </p>
        </>
      )}
    </motion.div>
  );
}
