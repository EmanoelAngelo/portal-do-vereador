/**
 * useChatNotification — Som de notificação + rastreio de mensagens não lidas (por usuário, individual)
 */

/** Toca um bip suave de notificação usando Web Audio API */
export function playNotificationSound(): void {
  try {
    type WinWithWebkit = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };
    const AudioCtxClass: typeof AudioContext | undefined =
      window.AudioContext ?? (window as WinWithWebkit).webkitAudioContext;
    if (!AudioCtxClass) return;

    const ctx = new AudioCtxClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.38);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
    setTimeout(() => { try { ctx.close(); } catch (_) { /* silent */ } }, 600);
  } catch (_) { /* silent */ }
}

/** Chave no localStorage para o último ID de mensagem lido */
function lsKey(userId: string, chatId: number): string {
  return `chat_lastRead_${userId}_${chatId}`;
}

/** Retorna o último msgId lido pelo usuário neste chat */
export function getLastRead(userId: string, chatId: number): number {
  try {
    const val = localStorage.getItem(lsKey(userId, chatId));
    return val ? parseInt(val, 10) : 0;
  } catch { return 0; }
}

/** Salva o último msgId lido pelo usuário neste chat */
export function setLastRead(userId: string, chatId: number, msgId: number): void {
  try {
    localStorage.setItem(lsKey(userId, chatId), String(msgId));
  } catch { /* silent */ }
}

/** Retorna timestamp da última verificação de mensagens novas */
export function getLastCheckTime(userId: string): string {
  try {
    return localStorage.getItem(`chat_lastCheck_${userId}`) ?? new Date(0).toISOString();
  } catch { return new Date(0).toISOString(); }
}

/** Salva timestamp da última verificação */
export function setLastCheckTime(userId: string, time: string): void {
  try {
    localStorage.setItem(`chat_lastCheck_${userId}`, time);
  } catch { /* silent */ }
}