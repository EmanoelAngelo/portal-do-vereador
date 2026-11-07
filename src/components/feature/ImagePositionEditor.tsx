import { useState, useEffect } from "react";

interface ImagePositionEditorProps {
  imageUrl: string;
  positionX: number;
  positionY: number;
  zoom: number;
  onPositionXChange: (val: number) => void;
  onPositionYChange: (val: number) => void;
  onZoomChange: (val: number) => void;
}

export default function ImagePositionEditor({
  imageUrl,
  positionX,
  positionY,
  zoom,
  onPositionXChange,
  onPositionYChange,
  onZoomChange,
}: ImagePositionEditorProps) {
  const [localX, setLocalX] = useState(positionX);
  const [localY, setLocalY] = useState(positionY);
  const [localZoom, setLocalZoom] = useState(zoom);

  useEffect(() => {
    setLocalX(positionX);
    setLocalY(positionY);
    setLocalZoom(zoom);
  }, [positionX, positionY, zoom]);

  return (
    <div className="space-y-4">
      <label className="block text-gray-700 text-sm font-semibold">Ajustar Imagem no Card</label>
      <p className="text-gray-400 text-xs">
        Ajuste a posicao e o zoom da imagem para enquadrar corretamente no card do feed.
      </p>

      {/* Preview card — mesmo aspect ratio do feed */}
      <div className="relative rounded-xl overflow-hidden bg-gray-100 border border-gray-200" style={{ aspectRatio: "16/10" }}>
        <img
          src={imageUrl}
          alt="Preview"
          className="w-full h-full"
          style={{
            objectFit: "cover",
            objectPosition: `${localX}% ${localY}%`,
            transform: `scale(${localZoom})`,
            transformOrigin: `calc(${localX}% - ${((localZoom - 1) * 100) / 2}%) calc(${localY}% - ${((localZoom - 1) * 100) / 2}%)`,
            transition: "transform 0.15s ease, object-position 0.15s ease",
          }}
        />
      </div>

      {/* Posicao Y (Cima/Baixo) */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-gray-600">Posicao Vertical</span>
          <span className="text-xs text-gray-400">{localY}%</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const v = Math.max(0, localY - 5);
              setLocalY(v);
              onPositionYChange(v);
            }}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 cursor-pointer shrink-0"
          >
            <i className="ri-arrow-up-line"></i>
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={localY}
            onChange={(e) => {
              const v = Number(e.target.value);
              setLocalY(v);
              onPositionYChange(v);
            }}
            className="flex-1 accent-[#0369A1] cursor-pointer"
          />
          <button
            type="button"
            onClick={() => {
              const v = Math.min(100, localY + 5);
              setLocalY(v);
              onPositionYChange(v);
            }}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 cursor-pointer shrink-0"
          >
            <i className="ri-arrow-down-line"></i>
          </button>
        </div>
      </div>

      {/* Posicao X (Esquerda/Direita) */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-gray-600">Posicao Horizontal</span>
          <span className="text-xs text-gray-400">{localX}%</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const v = Math.max(0, localX - 5);
              setLocalX(v);
              onPositionXChange(v);
            }}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 cursor-pointer shrink-0"
          >
            <i className="ri-arrow-left-line"></i>
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={localX}
            onChange={(e) => {
              const v = Number(e.target.value);
              setLocalX(v);
              onPositionXChange(v);
            }}
            className="flex-1 accent-[#0369A1] cursor-pointer"
          />
          <button
            type="button"
            onClick={() => {
              const v = Math.min(100, localX + 5);
              setLocalX(v);
              onPositionXChange(v);
            }}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 cursor-pointer shrink-0"
          >
            <i className="ri-arrow-right-line"></i>
          </button>
        </div>
      </div>

      {/* Zoom */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-gray-600">Zoom</span>
          <span className="text-xs text-gray-400">{localZoom.toFixed(2)}x</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const v = Math.max(0.5, localZoom - 0.1);
              setLocalZoom(Math.round(v * 100) / 100);
              onZoomChange(Math.round(v * 100) / 100);
            }}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 cursor-pointer shrink-0"
          >
            <i className="ri-zoom-out-line"></i>
          </button>
          <input
            type="range"
            min={0.5}
            max={2.0}
            step={0.05}
            value={localZoom}
            onChange={(e) => {
              const v = Number(e.target.value);
              setLocalZoom(v);
              onZoomChange(v);
            }}
            className="flex-1 accent-[#0369A1] cursor-pointer"
          />
          <button
            type="button"
            onClick={() => {
              const v = Math.min(2.0, localZoom + 0.1);
              setLocalZoom(Math.round(v * 100) / 100);
              onZoomChange(Math.round(v * 100) / 100);
            }}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 cursor-pointer shrink-0"
          >
            <i className="ri-zoom-in-line"></i>
          </button>
        </div>
      </div>

      {/* Reset */}
      <button
        type="button"
        onClick={() => {
          setLocalX(50);
          setLocalY(50);
          setLocalZoom(1.0);
          onPositionXChange(50);
          onPositionYChange(50);
          onZoomChange(1.0);
        }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 cursor-pointer whitespace-nowrap transition-all"
      >
        <i className="ri-reset-left-line"></i> Resetar
      </button>
    </div>
  );
}