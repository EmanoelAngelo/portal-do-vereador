import { useState, useRef } from "react";
import { getEdgeFunctionUrl } from "@/lib/supabase";

interface PortfolioUploaderProps {
  currentPhotos: string;
  userId: string;
  onPhotosChange: (photos: string) => void;
}

export default function PortfolioUploader({ currentPhotos, userId, onPhotosChange }: PortfolioUploaderProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const photos = (currentPhotos || "").split("|").filter(Boolean);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (photos.length >= 6) {
      setError("Máximo de 6 fotos. Remova uma antes de adicionar outra.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Apenas imagens JPG, PNG ou WEBP.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Cada foto deve ter no máximo 5MB.");
      return;
    }

    setUploading(true);
    setError("");

    try {
      // Compress before upload
      const compressed = await compressImage(file, 800, 800, 0.75);
      const compressedFile = new File([compressed], file.name, { type: compressed.type || "image/jpeg" });

      const formData = new FormData();
      formData.append("file", compressedFile);
      formData.append("user_id", userId);

      const url = getEdgeFunctionUrl("upload-portfolio-photo");
      const res = await fetch(url, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({} as Record<string, unknown>));
        throw new Error((data as { error?: string }).error || `Erro ${res.status}`);
      }

      const data = await res.json() as { url: string };
      const publicUrl = data.url;

      if (!publicUrl) {
        throw new Error("URL pública não retornada");
      }

      const newPhotos = [...photos, publicUrl].join("|");
      onPhotosChange(newPhotos);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao enviar foto";
      setError(`${msg}. Tente novamente.`);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleRemove = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index).join("|");
    onPhotosChange(newPhotos);
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
        <i className="ri-image-line mr-1" style={{ color: "#E8A020" }}></i>
        Fotos do Portfólio ({photos.length}/6)
      </label>

      <div className="grid grid-cols-3 gap-2 mb-2">
        {photos.map((url, i) => (
          <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200 group">
            <img src={url} alt={`Portfólio ${i + 1}`} className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            <button
              type="button"
              onClick={() => handleRemove(i)}
              className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <i className="ri-close-line text-xs"></i>
            </button>
          </div>
        ))}
        {photos.length < 6 && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-green-400 hover:text-green-600 transition-all cursor-pointer disabled:opacity-50 bg-gray-50"
          >
            {uploading ? (
              <div className="w-5 h-5 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <i className="ri-add-line text-xl"></i>
                <span className="text-xs font-semibold">Adicionar</span>
              </>
            )}
          </button>
        )}
      </div>

      {error && (
        <p className="text-red-500 text-xs flex items-center gap-1 mb-1">
          <i className="ri-error-warning-line"></i> {error}
        </p>
      )}

      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleUpload} />

      <p className="text-gray-400 text-xs">
        Adicione até 6 fotos dos seus serviços. Isso ajuda clientes a conhecerem seu trabalho.
      </p>
    </div>
  );
}

function compressImage(file: File, maxW = 800, maxH = 800, quality = 0.7): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > maxW) { h = Math.round(h * (maxW / w)); w = maxW; }
        if (h > maxH) { w = Math.round(w * (maxH / h)); h = maxH; }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Falha ao processar imagem"));
        }, "image/jpeg", quality);
      };
      img.onerror = () => reject(new Error("Falha ao processar imagem"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Falha ao ler arquivo"));
    reader.readAsDataURL(file);
  });
}