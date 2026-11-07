export function formatBRDate(date: string | Date | number): string {
  return new Date(date).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export function formatBRDateOnly(date: string | Date | number): string {
  return new Date(date).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export function formatBRTimeOnly(date: string | Date | number): string {
  return new Date(date).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" });
}