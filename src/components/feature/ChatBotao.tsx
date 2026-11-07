import { useState, useRef, useEffect, useCallback } from "react";
import { useChatCidadao } from "@/hooks/useChatCidadao";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { supabase, supabaseUrl, supabaseAnonKey } from "@/lib/supabase";

interface ChatBotaoProps {
  onClose?: () => void;
}

// Utilidade: verifica horario de atendimento em Sao Paulo (fuso correto)
function isBusinessHours(): boolean {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'short',
    hour12: false,
  }).formatToParts(now);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value;
  const hour = parseInt(getPart('hour') || '0');
  const minute = parseInt(getPart('minute') || '0');
  const dayStr = getPart('weekday') || '';
  const dayMap: Record<string, number> = {
    Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0,
  };
  const day = dayMap[dayStr] ?? 0;
  const timeDecimal = hour + minute / 60;
  const isWeekday = day >= 1 && day <= 5;
  const isWithinHours = timeDecimal >= 8.0 && timeDecimal < 18.0;
  return isWeekday && isWithinHours;
}

function getBusinessHoursText(): string {
  return "Segunda a sexta, das 8h00 às 18h00";
}

function compressChatImage(file: File, maxW = 500, maxH = 500, quality = 0.6): Promise<Blob> {
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

export default function ChatBotao({ onClose }: ChatBotaoProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [nome, setNome] = useState("Anônimo");
  const [novaMsg, setNovaMsg] = useState("");
  const [displayError, setDisplayError] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageToSend, setImageToSend] = useState<string | null>(null);
  const [outsideHours, setOutsideHours] = useState(false);
  const [contactInfo, setContactInfo] = useState({ whatsapp: "", email: "" });
  const [contactSubmitted, setContactSubmitted] = useState(false);

  // Re-verifica horario de atendimento a cada minuto (atualiza automaticamente)
  useEffect(() => {
    const check = () => setOutsideHours(!isBusinessHours());
    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const {
    chatId,
    messages,
    loading,
    error: hookError,
    isClosed,
    startChat,
    sendMessage,
    clearChat,
  } = useChatCidadao();

  // Typing indicator — mostra quando o assessor está digitando
  const { typingUsers, sendTyping } = useTypingIndicator(chatId, nome.trim() || "Anônimo");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current && chatStarted) {
      inputRef.current.focus();
    }
  }, [isOpen, chatStarted]);

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  const handleOpen = () => {
    setIsOpen(true);
    setDisplayError(null);
    setOutsideHours(!isBusinessHours());
  };

  const handleClose = () => {
    setIsOpen(false);
    setDisplayError(null);
    setNovaMsg("");
    setEditingName(false);
    setImagePreview(null);
    setImageToSend(null);
    setOutsideHours(false);
    setContactSubmitted(false);
    setContactInfo({ whatsapp: "", email: "" });
    onClose?.();
  };

  const handleStartChat = async () => {
    const hasText = novaMsg.trim().length > 0;
    const hasImage = imageToSend !== null;
    if (!hasText && !hasImage) return;

    setDisplayError(null);
    setChatStarted(true);

    const msgText = hasText ? novaMsg.trim() : "[Imagem]";
    const result = await startChat(nome.trim(), "anonimo@anonimo.com", "", msgText);

    if (result.success) {
      setNovaMsg("");
      if (hasImage && result.firstMessage) {
        setTimeout(() => {
          sendMessage(
            nome.trim(),
            "",
            imageToSend.startsWith("http") ? imageToSend : undefined,
            imageToSend.startsWith("data:") ? imageToSend : undefined
          );
        }, 500);
      }
      setImagePreview(null);
      setImageToSend(null);
    } else {
      setChatStarted(false);
    }
  };

  const handleSendMessage = async () => {
    const hasText = novaMsg.trim().length > 0;
    const hasImage = imageToSend !== null;
    if ((!hasText && !hasImage) || isClosed) return;

    setDisplayError(null);
    const msgText = hasText ? novaMsg.trim() : "";
    await sendMessage(
      nome.trim(),
      msgText,
      imageToSend?.startsWith("http") ? imageToSend : undefined,
      imageToSend?.startsWith("data:") ? imageToSend : undefined
    );

    setNovaMsg("");
    setImagePreview(null);
    setImageToSend(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!chatStarted) {
        handleStartChat();
      } else {
        handleSendMessage();
      }
    }
  };

  const handleClear = () => {
    clearChat();
    setNome("Anônimo");
    setNovaMsg("");
    setDisplayError(null);
    setEditingName(false);
    setChatStarted(false);
    setImagePreview(null);
    setImageToSend(null);
    setOutsideHours(!isBusinessHours());
    setContactSubmitted(false);
    setContactInfo({ whatsapp: "", email: "" });
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      setEditingName(false);
      inputRef.current?.focus();
    }
    if (e.key === "Escape") {
      setEditingName(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setDisplayError("Por favor, selecione uma imagem (JPEG, PNG, WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setDisplayError("A imagem deve ter no máximo 5MB.");
      return;
    }

    setUploadingImage(true);
    setDisplayError(null);

    try {
      const compressedBlob = await compressChatImage(file, 500, 500, 0.6);

      if (chatStarted && chatId) {
        const uniqueId = Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
        const storagePath = `chat_${chatId}/${uniqueId}.jpg`;

        try {
          const { error: uploadErr } = await supabase.storage
            .from("chat-images")
            .upload(storagePath, compressedBlob, {
              contentType: "image/jpeg",
              cacheControl: "public, max-age=31536000, immutable",
              upsert: true,
            });

          if (!uploadErr) {
            const { data: urlData } = supabase.storage.from("chat-images").getPublicUrl(storagePath);
            const publicUrl = urlData?.publicUrl || `${supabaseUrl}/storage/v1/object/public/chat-images/${storagePath}`;
            setImagePreview(publicUrl);
            setImageToSend(publicUrl);
            return;
          }
        } catch (_) {
          // Fallback para base64
        }
      }

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Falha ao ler imagem"));
        reader.readAsDataURL(compressedBlob);
      });

      setImagePreview(dataUrl);
      setImageToSend(dataUrl);
    } catch (err) {
      setDisplayError("Falha ao processar imagem. Tente novamente.");
      setImagePreview(null);
      setImageToSend(null);
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setImageToSend(null);
  };

  const hasContent = novaMsg.trim().length > 0 || imageToSend !== null;

  const handleContactSubmit = async () => {
    if (!contactInfo.whatsapp.trim() && !contactInfo.email.trim()) {
      setDisplayError("Por favor, informe seu WhatsApp ou e-mail.");
      return;
    }
    setDisplayError(null);

    // Envia o contato para o banco via edge function
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/chat-cidadao-anonimo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          nome: nome.trim() || "Anônimo",
          email: "anonimo@anonimo.com",
          mensagem: "",
          whatsapp: contactInfo.whatsapp.trim(),
          contactEmail: contactInfo.email.trim(),
          isContactOnly: true,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        console.warn("[ChatBotao] Falha ao salvar contato:", data.error);
        // Mesmo com erro no servidor, confirmamos pro usuário (UX)
      }
    } catch (err) {
      console.error("[ChatBotao] Erro ao salvar contato:", err);
    }

    setContactSubmitted(true);
  };

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={handleOpen}
        aria-label="Falar com o Gabinete"
        title="Falar com o Gabinete"
        className="self-end flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-accent-600 hover:bg-accent-700 text-white ring-4 ring-accent-300/60 hover:ring-accent-400/80 transition-all duration-200 cursor-pointer z-50 relative"
        style={{
          boxShadow: "0 0 0 6px rgba(20, 184, 166, 0.25), 0 8px 32px rgba(0, 0, 0, 0.35)",
        }}
      >
        <i className="ri-chat-3-line text-3xl md:text-4xl"></i>
        <span className="absolute -top-1 -right-1 w-5 h-5 md:w-6 md:h-6 bg-accent-500 rounded-full flex items-center justify-center animate-pulse">
          <i className="ri-message-3-line text-white text-xs md:text-sm"></i>
        </span>
      </button>

      {/* Drawer de chat */}
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-end p-0 md:p-4 md:items-end md:justify-end">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleClose}
          ></div>

          <div className="relative w-full h-[85dvh] md:w-[420px] md:h-[560px] bg-white rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slideUp">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-background-200/70 bg-accent-500">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <i className="ri-government-line text-white text-lg"></i>
                </div>
                <div className="min-w-0">
                  <h3 className="text-white font-bold text-sm truncate">Falar com o Gabinete</h3>
                  {editingName ? (
                    <div className="flex items-center gap-1">
                      <input
                        ref={nameInputRef}
                        type="text"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        onKeyDown={handleNameKeyDown}
                        onBlur={() => setEditingName(false)}
                        placeholder="Seu nome"
                        className="text-xs text-white bg-white/20 border border-white/30 rounded px-2 py-0.5 w-32 focus:outline-none focus:ring-1 focus:ring-white/50 placeholder:text-white/50"
                      />
                    </div>
                  ) : (
                    <p className="text-white/80 text-xs flex items-center gap-1">
                      <span className="truncate">{nome}</span>
                      <button
                        onClick={() => setEditingName(true)}
                        className="text-white/60 hover:text-white cursor-pointer transition-colors"
                        title="Mudar nome"
                      >
                        <i className="ri-pencil-line text-[10px]"></i>
                      </button>
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={handleClear}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/20 text-white/80 cursor-pointer transition-colors"
                  title="Nova conversa"
                >
                  <i className="ri-add-line text-base"></i>
                </button>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/20 text-white cursor-pointer transition-colors"
                >
                  <i className="ri-close-line text-base"></i>
                </button>
              </div>
            </div>

            {/* Banner de horário de atendimento */}
            <div className="bg-accent-50 rounded-none px-4 py-2 border-b border-accent-200/70">
              <div className="flex items-start gap-2">
                <i className="ri-time-line text-accent-600 mt-0.5 shrink-0 text-sm"></i>
                <p className="text-xs text-accent-900 leading-relaxed">
                  <strong>Horário de atendimento:</strong> {getBusinessHoursText()}
                  {!isBusinessHours() && (
                    <span className="block mt-0.5 text-accent-700">
                      No momento estamos fora do horário de atendimento.
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background-50">
              {/* Estado: antes de iniciar */}
              {!chatStarted && messages.length === 0 && !loading && (
                <div className="flex items-center justify-center h-full text-center">
                  <div>
                    <i className="ri-chat-3-line text-4xl text-foreground-300 mb-2"></i>
                    <p className="text-sm text-foreground-500">Digite sua mensagem abaixo para iniciar a conversa</p>
                  </div>
                </div>
              )}

              {/* Estado: carregando */}
              {chatStarted && messages.length === 0 && loading && (
                <div className="flex items-center justify-center h-full text-center">
                  <div>
                    <div className="w-6 h-6 border-2 border-accent-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-sm text-foreground-500">Conectando com o gabinete...</p>
                  </div>
                </div>
              )}

              {/* Estado: sem mensagens mas chat iniciado (fallback) */}
              {chatStarted && messages.length === 0 && !loading && (
                <div className="flex items-center justify-center h-full text-center">
                  <div>
                    <div className="w-6 h-6 border-2 border-accent-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-sm text-foreground-500">Carregando suas mensagens...</p>
                    <button
                      onClick={() => {
                        setDisplayError(null);
                        window.location.reload();
                      }}
                      className="mt-3 text-xs text-accent-500 hover:text-accent-600 underline cursor-pointer"
                    >
                      Tentar novamente
                    </button>
                  </div>
                </div>
              )}

              {/* Mensagens */}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_role === "citizen" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm ${
                      msg.sender_role === "citizen"
                        ? "bg-accent-500 text-white rounded-br-sm"
                        : "bg-white border border-background-200/70 text-foreground-900 rounded-bl-sm"
                    }`}
                  >
                    <p className="text-xs font-semibold mb-0.5 opacity-80">
                      {msg.sender_name}
                    </p>
                    {msg.message && (
                      <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.message}</p>
                    )}
                    {(msg.image_url || msg.image_data) && (
                      <a href={msg.image_url || msg.image_data || "#"} target="_blank" rel="noopener noreferrer" className="block mt-2">
                        <img
                          src={msg.image_url || msg.image_data || ""}
                          alt="Imagem enviada"
                          className="rounded-lg max-w-full max-h-48 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                        />
                      </a>
                    )}
                    <p className={`text-xs mt-1 ${msg.sender_role === "citizen" ? "text-white/60" : "text-foreground-500"}`}>
                      {new Date(msg.created_at).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "America/Sao_Paulo",
                      })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef}></div>
              {/* Typing indicator */}
              {typingUsers.filter(u => u.name !== (nome.trim() || "Anônimo")).length > 0 && (
                <div className="flex items-center gap-2 px-1 pb-1">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce bg-accent-500" style={{ animationDelay: "0ms" }}></span>
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce bg-accent-500" style={{ animationDelay: "150ms" }}></span>
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce bg-accent-500" style={{ animationDelay: "300ms" }}></span>
                  </div>
                  <span className="text-xs text-accent-700">
                    {typingUsers.filter(u => u.name !== (nome.trim() || "Anônimo")).map(u => u.name).join(", ")} digitando...
                  </span>
                </div>
              )}
            </div>

            {/* Input area */}
            {isClosed ? (
              <div className="p-4 text-center border-t border-background-200/70">
                <p className="text-sm text-foreground-600 font-semibold">
                  <i className="ri-check-double-line mr-1 text-accent-500"></i>
                  Conversa encerrada pelo gabinete
                </p>
                <p className="text-xs text-foreground-500 mt-1">
                  O histórico será apagado em 24 horas. Se precisar de mais ajuda, inicie uma nova conversa.
                </p>
                <button
                  onClick={handleClear}
                  className="mt-2 text-sm text-accent-500 hover:text-accent-600 font-semibold cursor-pointer"
                >
                  <i className="ri-add-line mr-1"></i>
                  Nova conversa
                </button>
              </div>
            ) : (
              <div className="p-3 border-t border-background-200/70">
                {/* Fora do horário — pedir contato */}
                {outsideHours && !contactSubmitted && (
                  <div className="bg-secondary-50 border border-secondary-200 rounded-lg p-3 mb-2">
                    <p className="text-xs text-secondary-900 font-semibold mb-2">
                      <i className="ri-time-line mr-1"></i>
                      Fora do horário de atendimento
                    </p>
                    <p className="text-xs text-secondary-700 mb-2">
                      Nosso gabinete responde de {getBusinessHoursText()}. Deixe seu contato que nossa equipe entra em contato assim que possível.
                    </p>
                    <div className="flex flex-col gap-2">
                      <input
                        type="tel"
                        placeholder="WhatsApp (com DDD)"
                        value={contactInfo.whatsapp}
                        onChange={(e) => setContactInfo(prev => ({ ...prev, whatsapp: e.target.value }))}
                        className="w-full text-xs rounded-md border border-secondary-300 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent-400 bg-white text-foreground-900"
                      />
                      <input
                        type="email"
                        placeholder="E-mail"
                        value={contactInfo.email}
                        onChange={(e) => setContactInfo(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full text-xs rounded-md border border-secondary-300 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent-400 bg-white text-foreground-900"
                      />
                      <button
                        onClick={handleContactSubmit}
                        className="w-full text-xs bg-accent-500 hover:bg-accent-600 text-white font-semibold rounded-md py-2 cursor-pointer transition-colors"
                      >
                        Enviar contato
                      </button>
                    </div>
                  </div>
                )}

                {contactSubmitted && (
                  <div className="bg-accent-50 border border-accent-200 rounded-lg p-3 mb-2">
                    <p className="text-xs text-accent-900 font-semibold">
                      <i className="ri-check-line mr-1"></i>
                      Contato enviado!
                    </p>
                    <p className="text-xs text-accent-700 mt-1">
                      Nossa equipe vai entrar em contato em breve. Você também pode deixar uma mensagem abaixo.
                    </p>
                  </div>
                )}

                {(displayError || hookError) && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700 mb-2 flex items-start gap-2">
                    <i className="ri-error-warning-line mt-0.5 shrink-0"></i>
                    <span className="flex-1">{displayError || hookError}</span>
                    <button
                      onClick={() => { setDisplayError(null); }}
                      className="text-red-400 hover:text-red-600 shrink-0 cursor-pointer"
                    >
                      <i className="ri-close-line"></i>
                    </button>
                  </div>
                )}

                {/* Image preview */}
                {imagePreview && (
                  <div className="flex items-center gap-2 mb-2 p-2 rounded-xl bg-secondary-50 border border-secondary-200">
                    <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-secondary-200">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-xs text-secondary-600 flex-1 truncate">Imagem pronta para enviar</span>
                    <button
                      onClick={removeImage}
                      className="w-6 h-6 flex items-center justify-center rounded-lg text-secondary-400 hover:bg-secondary-200 cursor-pointer shrink-0"
                    >
                      <i className="ri-close-line text-xs"></i>
                    </button>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleImageUpload}
                />

                <div className="flex gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage || loading}
                    className="w-10 h-10 rounded-lg flex items-center justify-center cursor-pointer transition-colors shrink-0 bg-secondary-100 text-secondary-500 hover:bg-secondary-200 disabled:opacity-50"
                    title="Anexar foto"
                  >
                    {uploadingImage ? (
                      <div className="w-4 h-4 border-2 border-secondary-500 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <i className="ri-image-line text-base"></i>
                    )}
                  </button>

                  <textarea
                    ref={inputRef}
                    value={novaMsg}
                    onChange={(e) => { setNovaMsg(e.target.value); sendTyping(); }}
                    onKeyDown={handleKeyDown}
                    placeholder={chatStarted ? "Digite sua mensagem..." : "Digite sua mensagem para iniciar..."}
                    maxLength={500}
                    rows={1}
                    className="flex-1 min-w-0 rounded-lg px-3 py-2.5 text-sm border border-background-300/60 focus:outline-none focus:ring-2 focus:ring-accent-400 bg-white text-foreground-900 resize-none"
                    style={{ minHeight: "40px", maxHeight: "100px" }}
                  />
                  <button
                    onClick={chatStarted ? handleSendMessage : handleStartChat}
                    disabled={loading || !hasContent}
                    className="w-10 h-10 rounded-lg bg-accent-500 hover:bg-accent-600 text-white flex items-center justify-center cursor-pointer disabled:opacity-50 shrink-0 transition-colors"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <i className="ri-send-plane-fill text-base"></i>
                    )}
                  </button>
                </div>
                <p className="text-xs text-foreground-400 mt-1 text-right">
                  {novaMsg.length}/500
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </>
  );
}