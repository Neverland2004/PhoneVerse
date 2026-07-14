import { ArrowLeft, Images, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { contentRepository } from "../../services/storage/contentRepository";
import type { Photo } from "../../types/models";

interface PhotosAppProps {
  onBack: () => void;
}

export function PhotosApp({ onBack }: PhotosAppProps) {
  const photos = useLiveQuery(() => contentRepository.getPhotos(), []);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  useEffect(() => {
    if (!selectedPhoto) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedPhoto(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedPhoto]);

  return (
    <motion.section
      className="app-screen photos-screen"
      initial={{ x: "8%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "8%", opacity: 0 }}
      transition={{ duration: 0.22 }}
    >
      <header className="app-header">
        <button type="button" className="icon-button" onClick={onBack} aria-label="关闭 Photos">
          <ArrowLeft size={22} />
        </button>
        <div>
          <p>Photos</p>
          <span>内置相册</span>
        </div>
        <span className="header-mark header-mark--photos">
          <Images size={19} aria-hidden="true" />
        </span>
      </header>

      <div className="photos-heading">
        <h1>照片</h1>
        <p>{photos ? `${photos.length} 张内置图片` : "正在载入…"}</p>
      </div>

      <div className="photo-grid">
        {photos?.map((photo) => (
          <button
            type="button"
            key={photo.id}
            className="photo-tile"
            onClick={() => setSelectedPhoto(photo)}
            aria-label={`预览：${photo.alt}`}
          >
            <img src={photo.src} alt={photo.alt} />
          </button>
        ))}
      </div>
      <div className="home-indicator home-indicator--dark" aria-hidden="true" />

      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            className="photo-preview"
            role="dialog"
            aria-modal="true"
            aria-label={selectedPhoto.alt}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <motion.img
              src={selectedPhoto.src}
              alt={selectedPhoto.alt}
              initial={{ scale: 0.96 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.98 }}
              transition={{ duration: 0.24 }}
            />
            <button
              type="button"
              className="preview-close"
              onClick={() => setSelectedPhoto(null)}
              aria-label="关闭图片预览"
              autoFocus
            >
              <X size={21} />
            </button>
            <p>{selectedPhoto.alt}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
