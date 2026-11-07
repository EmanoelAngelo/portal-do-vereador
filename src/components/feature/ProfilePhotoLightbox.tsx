import { useEffect } from "react";

interface ProfilePhotoLightboxProps {
  imageUrl: string | null;
  userName: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfilePhotoLightbox({
  imageUrl,
  userName,
  isOpen,
  onClose,
}: ProfilePhotoLightboxProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      {/* Botão fechar */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-colors z-10"
        style={{ background: "rgba(255,255,255,0.15)" }}
      >
        <i className="ri-close-line text-white text-xl"></i>
      </button>

      {/* Foto — object-contain para não cortar */}
      <div
        className="flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt={userName ?? "Foto de perfil"}
          className="rounded-2xl border-4 border-white/10"
          style={{
            maxWidth: "90vw",
            maxHeight: "80vh",
            objectFit: "contain",
          }}
        />
      </div>

      {/* Nome do usuário */}
      {userName && (
        <p className="mt-4 text-white font-bold text-lg text-center">
          {userName}
        </p>
      )}

      {/* Dica */}
      <p className="mt-1 text-white/50 text-xs text-center">
        Clique fora ou pressione ESC para fechar
      </p>
    </div>
  );
}