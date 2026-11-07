import { useEffect, useRef, useState } from "react";

interface ImageLightboxProps {
  imageUrl: string | null;
  title?: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ImageLightbox({ imageUrl, title, isOpen, onClose }: ImageLightboxProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgSize, setImgSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !imageUrl) {
      setImgSize(null);
      return;
    }
    const img = new Image();
    img.onload = () => {
      setImgSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = imageUrl;
  }, [imageUrl, isOpen]);

  if (!isOpen || !imageUrl) return null;

  // Calculate display size preserving aspect ratio, fitting within 90vw x 85vh
  let displayW = "auto";
  let displayH = "auto";
  let maxW = "90vw";
  let maxH = "85vh";

  if (imgSize) {
    const aspect = imgSize.width / imgSize.height;
    const vw = window.innerWidth * 0.9;
    const vh = window.innerHeight * 0.85;
    if (aspect > vw / vh) {
      // Width constrained
      displayW = `${vw}px`;
      displayH = `${vw / aspect}px`;
    } else {
      // Height constrained
      displayH = `${vh}px`;
      displayW = `${vh * aspect}px`;
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-colors z-10"
        style={{ background: "rgba(255,255,255,0.15)" }}
      >
        <i className="ri-close-line text-white text-xl"></i>
      </button>

      {/* Image container */}
      <div
        className="relative flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: maxW, maxHeight: maxH }}
      >
        <img
          ref={imgRef}
          src={imageUrl}
          alt={title ?? "Imagem"}
          className="rounded-xl"
          style={{
            width: displayW,
            height: displayH,
            maxWidth: "90vw",
            maxHeight: "85vh",
            objectFit: "contain",
          }}
        />
      </div>

      {/* Title */}
      {title && (
        <p className="mt-4 text-white font-bold text-lg text-center px-4">
          {title}
        </p>
      )}

      {/* Hint */}
      <p className="mt-1 text-white/40 text-xs text-center">
        Clique fora ou pressione ESC para fechar
      </p>
    </div>
  );
}