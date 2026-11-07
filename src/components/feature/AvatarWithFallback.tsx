import { useState, useEffect } from "react";

interface AvatarWithFallbackProps {
  url: string | null;
  name: string | null;
  className?: string;
  fallbackClassName?: string;
  fallbackStyle?: React.CSSProperties;
}

export default function AvatarWithFallback({
  url,
  name,
  className,
  fallbackClassName,
  fallbackStyle,
}: AvatarWithFallbackProps) {
  const [error, setError] = useState(false);

  // Resetar erro quando a URL mudar — garante que imagens novas sejam tentadas
  useEffect(() => {
    setError(false);
  }, [url]);

  if (!url || error) {
    return (
      <div className={fallbackClassName} style={fallbackStyle}>
        {(name ?? "?").charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={name ?? "Usuário"}
      className={className}
      crossOrigin="anonymous"
      onError={() => setError(true)}
    />
  );
}