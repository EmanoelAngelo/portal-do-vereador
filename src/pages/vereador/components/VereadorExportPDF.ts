import { jsPDF } from "jspdf";

interface ExportDemand {
  id: number;
  type: string;
  category: string;
  status: string;
  title: string;
  citizen_name: string | null;
  citizen_neighborhood: string | null;
  assessor_id: string | null;
  assessor_name: string | null;
  created_at: string;
  updated_at: string;
}

interface AssessorStat {
  assessorId: string;
  assessorName: string;
  totalAssigned: number;
  emAndamento: number;
  aguardandoExterna: number;
  finalizadas: number;
  avgResponseTimeMinutes: number;
}

interface EmpregabilidadeData {
  totalCidadaos: number;
  comCurriculo: number;
  lookingWork: number;
  employed: number;
  comSurvey: number;
  semSurvey: number;
}

interface CidadaoContratado {
  cidadao: {
    id: string;
    full_name: string | null;
    neighborhood: string | null;
    platform_job_details: string | null;
  };
  vaga: {
    id: number;
    title: string;
    company_name: string | null;
  } | null;
}

const typeLabel: Record<string, string> = {
  requerimento: "Requerimento",
  sugestao: "Sugestao",
  contato: "Contato",
};

const statusLabel: Record<string, string> = {
  aberto: "Em Aberto",
  em_andamento: "Em Andamento",
  aguardando_externa: "Ag. Resp. Ext.",
  finalizada: "Finalizada",
};

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m}min`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });
}

// ── Dark PDF Helpers ──

const COLORS = {
  bg: { r: 13, g: 22, b: 41 },           // #0D1629
  teal: { r: 59, g: 191, b: 212 },         // #3BBFD4
  amber: { r: 232, g: 160, b: 32 },        // #E8A020
  white: { r: 255, g: 255, b: 255 },
  text: { r: 200, g: 200, b: 200 },
  textMuted: { r: 140, g: 140, b: 140 },
  green: { r: 34, g: 197, b: 94 },         // #22C55E
  red: { r: 239, g: 68, b: 68 },           // #EF4444
  cardBg: { r: 22, g: 32, b: 52 },         // #162034
  border: { r: 45, g: 55, b: 75 },
};

async function createDarkBackgroundImage(width: number, height: number): Promise<string | null> {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * 4);
    canvas.height = Math.round(height * 4);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Dark background
    ctx.fillStyle = "#0D1629";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid pattern
    ctx.strokeStyle = "rgba(59,191,212,0.04)";
    ctx.lineWidth = 1;
    const gridSize = Math.round(80 * 4);
    for (let x = 0; x <= canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Subtle gradient overlay
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "rgba(59,191,212,0.03)");
    gradient.addColorStop(0.5, "rgba(232,160,32,0.01)");
    gradient.addColorStop(1, "rgba(59,191,212,0.02)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

function drawHeader(doc: jsPDF, pageW: number, margin: number, y: number): number {
  const headerH = 28;
  // Dark header background
  doc.setFillColor(COLORS.cardBg.r, COLORS.cardBg.g, COLORS.cardBg.b);
  doc.rect(margin, y, pageW - 2 * margin, headerH, "F");

  // Border
  doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, pageW - 2 * margin, headerH, "S");

  // Gradient line top — teal + amber
  doc.setDrawColor(COLORS.teal.r, COLORS.teal.g, COLORS.teal.b);
  doc.setLineWidth(0.8);
  doc.line(margin + 4, y + 4, margin + 30, y + 4);
  doc.setDrawColor(COLORS.amber.r, COLORS.amber.g, COLORS.amber.b);
  doc.line(margin + 32, y + 4, margin + 55, y + 4);

  // "VEREADOR" label
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.teal.r, COLORS.teal.g, COLORS.teal.b);
  doc.text("VEREADOR", margin + 4, y + 11);

  // "ARTHUR HALAL" — ARTHUR em branco, HALAL em box amber
  const nameY = y + 19;
  const nameX = margin + 4;

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
  const arthurW = doc.getTextWidth("ARTHUR");
  doc.text("ARTHUR", nameX, nameY);

  // Amber box for HALAL — justo ao texto
  const halalText = "HALAL";
  doc.setFontSize(11);
  const halalTextW = doc.getTextWidth(halalText);
  const boxPadX = 2.5;
  const boxPadY = 1.5;
  const boxW = halalTextW + boxPadX * 2;
  const boxH = 5.5;
  const boxX = nameX + arthurW + 1.5;
  const boxY = nameY - 4.2;

  doc.setFillColor(COLORS.amber.r, COLORS.amber.g, COLORS.amber.b);
  doc.roundedRect(boxX, boxY, boxW, boxH, 1, 1, "F");

  // HALAL text inside box — centered
  doc.setTextColor(COLORS.bg.r, COLORS.bg.g, COLORS.bg.b);
  const textY = boxY + boxH - 1.5;
  doc.text(halalText, boxX + boxPadX, textY);

  // Subtitle
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.textMuted.r, COLORS.textMuted.g, COLORS.textMuted.b);
  doc.text("Gabinete do Vereador · Câmara Municipal de Pelotas · Mandato 2024-2028", margin + 4, y + 24);

  return y + headerH + 4;
}

function drawSectionTitle(doc: jsPDF, title: string, margin: number, y: number): number {
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.teal.r, COLORS.teal.g, COLORS.teal.b);
  doc.text(title, margin, y);
  doc.setDrawColor(COLORS.amber.r, COLORS.amber.g, COLORS.amber.b);
  doc.setLineWidth(0.4);
  doc.line(margin, y + 2, margin + doc.getTextWidth(title), y + 2);
  return y + 6;
}

function drawMetricCard(
  doc: jsPDF,
  label: string,
  value: string | number,
  color: { r: number; g: number; b: number },
  x: number,
  y: number,
  w: number,
  h: number
): void {
  // Card background
  doc.setFillColor(COLORS.cardBg.r, COLORS.cardBg.g, COLORS.cardBg.b);
  doc.roundedRect(x, y, w, h, 2, 2, "F");
  // Border
  doc.setDrawColor(color.r, color.g, color.b);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 2, 2, "S");
  // Value
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(color.r, color.g, color.b);
  doc.text(String(value), x + 3, y + 6);
  // Label
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.textMuted.r, COLORS.textMuted.g, COLORS.textMuted.b);
  doc.text(label, x + 3, y + 10);
}

function drawFooter(doc: jsPDF, pageW: number, margin: number, y: number): void {
  doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageW - margin, y);
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.textMuted.r, COLORS.textMuted.g, COLORS.textMuted.b);
  doc.text("Gabinete do Vereador Arthur Halal · Câmara Municipal de Pelotas · Mandato 2024-2028", margin, y + 3);
}

// ── Export Eficiência Assessores ──
export async function exportAssessorEfficiencyPDF(
  assessorStats: AssessorStat[],
  totalDemands: number,
  totalFinalizadas: number
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = 297;
  const margin = 15;
  let y = 10;

  // Background image
  const bgData = await createDarkBackgroundImage(pageW, 210);
  if (bgData) {
    doc.addImage(bgData, "PNG", 0, 0, pageW, 210);
  }

  // Header
  y = drawHeader(doc, pageW, margin, y);

  // Title
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
  doc.text("Relatório de Eficiência dos Assessores", margin, y);
  y += 4;

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
  doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}`, margin, y);
  y += 3;
  doc.text(`Total de demandas: ${totalDemands} | Finalizadas: ${totalFinalizadas} | Assessores: ${assessorStats.length}`, margin, y);
  y += 6;

  // Summary cards
  const cardW = 35;
  const cardH = 14;
  const cardGap = 4;
  drawMetricCard(doc, "Total Demandas", totalDemands, COLORS.teal, margin, y, cardW, cardH);
  drawMetricCard(doc, "Finalizadas", totalFinalizadas, COLORS.green, margin + cardW + cardGap, y, cardW, cardH);
  drawMetricCard(doc, "Taxa", `${totalDemands > 0 ? Math.round((totalFinalizadas / totalDemands) * 100) : 0}%`, COLORS.amber, margin + 2 * (cardW + cardGap), y, cardW, cardH);
  drawMetricCard(doc, "Assessores", assessorStats.length, COLORS.white, margin + 3 * (cardW + cardGap), y, cardW, cardH);
  y += cardH + 6;

  // Section title
  y = drawSectionTitle(doc, "Tabela de Desempenho", margin, y);
  y += 2;

  // Table header
  const colWidths = [8, 60, 18, 22, 22, 22, 28, 22];
  const colX: number[] = [];
  let cx = margin;
  colWidths.forEach((w) => { colX.push(cx); cx += w; });

  const rowH = 7;
  doc.setFillColor(COLORS.cardBg.r, COLORS.cardBg.g, COLORS.cardBg.b);
  doc.rect(margin, y - 4, pageW - 2 * margin, rowH, "F");
  doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
  doc.setLineWidth(0.2);
  doc.rect(margin, y - 4, pageW - 2 * margin, rowH, "S");

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.teal.r, COLORS.teal.g, COLORS.teal.b);
  const headers = ["#", "Assessor", "Total", "Em And.", "Ag. Ext.", "Finalizadas", "Tempo Médio", "%"];
  headers.forEach((h, i) => {
    doc.text(h, colX[i] + 2, y);
  });
  y += rowH;

  // Table rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  assessorStats.forEach((s, i) => {
    if (y > 180) {
      doc.addPage();
      y = 15;
      if (bgData) doc.addImage(bgData, "PNG", 0, 0, pageW, 210);
      // Re-draw header
      y = drawHeader(doc, pageW, margin, y);
      y += 4;
    }

    const taxa = s.totalAssigned > 0 ? `${Math.round((s.finalizadas / s.totalAssigned) * 100)}%` : "0%";
    const rowBg = i % 2 === 0 ? COLORS.bg : COLORS.cardBg;
    doc.setFillColor(rowBg.r, rowBg.g, rowBg.b);
    doc.rect(margin, y - 4, pageW - 2 * margin, rowH, "F");
    doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
    doc.setLineWidth(0.15);
    doc.rect(margin, y - 4, pageW - 2 * margin, rowH, "S");

    doc.setTextColor(COLORS.textMuted.r, COLORS.textMuted.g, COLORS.textMuted.b);
    doc.text(String(i + 1), colX[0] + 2, y);

    doc.setTextColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
    doc.text(s.assessorName, colX[1] + 2, y);

    doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
    doc.text(String(s.totalAssigned), colX[2] + 2, y);
    doc.text(String(s.emAndamento), colX[3] + 2, y);
    doc.text(String(s.aguardandoExterna), colX[4] + 2, y);

    doc.setTextColor(COLORS.green.r, COLORS.green.g, COLORS.green.b);
    doc.text(String(s.finalizadas), colX[5] + 2, y);

    doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
    doc.text(formatMinutes(s.avgResponseTimeMinutes), colX[6] + 2, y);
    doc.text(taxa, colX[7] + 2, y);

    y += rowH;
  });

  drawFooter(doc, pageW, margin, 200);
  doc.save("eficiencia-assessores.pdf");
}

// ── Export Métricas do Sistema (agora por métrica individual) ──
export type MetricTab = "demandas" | "empregabilidade" | "bairros";

export async function exportSystemMetricsPDF(
  demands: ExportDemand[],
  empregabilidade: EmpregabilidadeData,
  contratados: CidadaoContratado[],
  metricTab: MetricTab
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const margin = 15;
  let y = 10;

  const bgData = await createDarkBackgroundImage(pageW, 297);

  function addPageWithBg() {
    doc.addPage();
    if (bgData) doc.addImage(bgData, "PNG", 0, 0, pageW, 297);
  }

  if (bgData) doc.addImage(bgData, "PNG", 0, 0, pageW, 297);

  // Header
  y = drawHeader(doc, pageW, margin, y);

  // Title based on metricTab
  const metricTitles: Record<MetricTab, string> = {
    demandas: "Relatório Completo de Demandas",
    empregabilidade: "Relatório de Empregabilidade",
    bairros: "Relatório de Demandas por Bairro",
  };

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
  doc.text(metricTitles[metricTab], margin, y);
  y += 4;

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
  doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}`, margin, y);
  y += 3;

  const porStatus: Record<string, number> = {};
  const porTipo: Record<string, number> = {};
  const porCategoria: Record<string, number> = {};
  demands.forEach((d) => {
    porStatus[d.status] = (porStatus[d.status] || 0) + 1;
    porTipo[d.type] = (porTipo[d.type] || 0) + 1;
    if (d.category) porCategoria[d.category] = (porCategoria[d.category] || 0) + 1;
  });

  const cardW = 42;
  const cardH = 12;
  const cardGap = 3;

  // ══════════════════════════════════════════════
  // MÉTRICA: DEMANDAS (completo e detalhado)
  // ══════════════════════════════════════════════
  if (metricTab === "demandas") {
    // ── RESUMO DE DEMANDAS ──
    y = drawSectionTitle(doc, "Resumo", margin, y);
    y += 2;

    const row1Cards = [
      { label: "Demandas", value: demands.length, color: COLORS.teal },
      { label: "Em Aberto", value: porStatus["aberto"] || 0, color: COLORS.amber },
      { label: "Finalizadas", value: porStatus["finalizada"] || 0, color: COLORS.green },
      { label: "Cidadãos", value: empregabilidade.totalCidadaos, color: COLORS.white },
    ];

    row1Cards.forEach((c, i) => {
      drawMetricCard(doc, c.label, c.value, c.color, margin + i * (cardW + cardGap), y, cardW, cardH);
    });
    y += cardH + 6;

    // ── CARDS DE STATUS ──
    const statusItems = [
      { key: "aberto", label: "Em Aberto", color: COLORS.amber },
      { key: "em_andamento", label: "Em Andamento", color: COLORS.teal },
      { key: "aguardando_externa", label: "Ag. Externa", color: COLORS.white },
      { key: "finalizada", label: "Finalizada", color: COLORS.green },
    ];

    y = drawSectionTitle(doc, "Distribuição por Status", margin, y);
    y += 2;

    const barMax = Math.max(demands.length, 1);
    const barW = pageW - 2 * margin - 40;

    statusItems.forEach((si) => {
      const count = porStatus[si.key] || 0;
      const pct = barMax > 0 ? (count / barMax) * 100 : 0;

      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
      doc.text(si.label, margin, y);

      doc.setFillColor(COLORS.cardBg.r, COLORS.cardBg.g, COLORS.cardBg.b);
      doc.roundedRect(margin + 35, y - 3, barW, 4, 1, 1, "F");

      if (pct > 0) {
        doc.setFillColor(si.color.r, si.color.g, si.color.b);
        doc.roundedRect(margin + 35, y - 3, Math.max((barW * pct) / 100, 1), 4, 1, 1, "F");
      }

      doc.setTextColor(si.color.r, si.color.g, si.color.b);
      doc.text(`${count} (${Math.round(pct)}%)`, margin + 35 + barW + 2, y);

      y += 6;
    });
    y += 4;

    // ── DEMANDAS POR TIPO ──
    if (y > 240) { addPageWithBg(); y = 20; y = drawHeader(doc, pageW, margin, y); y += 4; }

    y = drawSectionTitle(doc, "Demandas por Tipo", margin, y);
    y += 2;

    const tipos = Object.entries(porTipo).sort((a, b) => b[1] - a[1]);
    const tipoBarMax = tipos.length > 0 ? tipos[0][1] : 1;
    const tipoBarW = pageW - 2 * margin - 50;

    tipos.forEach(([tipo, count]) => {
      const pct = tipoBarMax > 0 ? (count / tipoBarMax) * 100 : 0;
      const color = tipo === "requerimento" ? COLORS.teal : tipo === "sugestao" ? COLORS.amber : COLORS.white;

      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
      doc.text(typeLabel[tipo] ?? tipo, margin, y);

      doc.setFillColor(COLORS.cardBg.r, COLORS.cardBg.g, COLORS.cardBg.b);
      doc.roundedRect(margin + 30, y - 2.5, tipoBarW, 3.5, 0.5, 0.5, "F");

      if (pct > 0) {
        doc.setFillColor(color.r, color.g, color.b);
        doc.roundedRect(margin + 30, y - 2.5, Math.max((tipoBarW * pct) / 100, 1), 3.5, 0.5, 0.5, "F");
      }

      doc.setTextColor(color.r, color.g, color.b);
      doc.text(`${count}`, margin + 30 + tipoBarW + 2, y);

      y += 5;
    });
    y += 4;

    // ── TOP CATEGORIAS ──
    if (y > 240) { addPageWithBg(); y = 20; y = drawHeader(doc, pageW, margin, y); y += 4; }

    y = drawSectionTitle(doc, "Top Categorias", margin, y);
    y += 2;

    const cats = Object.entries(porCategoria).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const catMax = cats.length > 0 ? cats[0][1] : 1;
    const catBarW = pageW - 2 * margin - 60;

    cats.forEach(([cat, count], i) => {
      const pct = catMax > 0 ? (count / catMax) * 100 : 0;
      const color = i === 0 ? COLORS.teal : i < 3 ? COLORS.amber : COLORS.text;

      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
      doc.text(`${i + 1}.`, margin, y);
      doc.text(cat.substring(0, 25), margin + 6, y);

      doc.setFillColor(COLORS.cardBg.r, COLORS.cardBg.g, COLORS.cardBg.b);
      doc.roundedRect(margin + 35, y - 2.5, catBarW, 3.5, 0.5, 0.5, "F");

      if (pct > 0) {
        doc.setFillColor(color.r, color.g, color.b);
        doc.roundedRect(margin + 35, y - 2.5, Math.max((catBarW * pct) / 100, 1), 3.5, 0.5, 0.5, "F");
      }

      doc.setTextColor(color.r, color.g, color.b);
      doc.text(String(count), margin + 35 + catBarW + 2, y);

      y += 5;
    });
    y += 4;

    // ── TEMPO DE RESPOSTA ──
    if (y > 240) { addPageWithBg(); y = 20; y = drawHeader(doc, pageW, margin, y); y += 4; }

    y = drawSectionTitle(doc, "Análise de Tempo de Resposta", margin, y);
    y += 2;

    const demandsComResposta = demands.filter(d => d.status !== "aberto");
    if (demandsComResposta.length > 0) {
      const times = demandsComResposta.map(d => {
        return (new Date(d.updated_at).getTime() - new Date(d.created_at).getTime()) / 60000;
      });

      const avgMinutes = times.reduce((a, b) => a + b, 0) / times.length;
      const sorted = times.sort((a, b) => a - b);
      const medianMinutes = sorted[Math.floor(sorted.length / 2)];

      const faster24 = times.filter(t => t <= 24 * 60).length;
      const between = times.filter(t => t > 24 * 60 && t <= 72 * 60).length;
      const over72 = times.filter(t => t > 72 * 60).length;

      const respCards = [
        { label: "Tempo Médio", value: formatMinutes(avgMinutes), color: COLORS.green },
        { label: "Tempo Mediano", value: formatMinutes(medianMinutes), color: COLORS.teal },
        { label: "Até 24h", value: faster24, color: COLORS.green },
        { label: "24h-72h", value: between, color: COLORS.amber },
        { label: "+72h", value: over72, color: COLORS.red },
        { label: "Total c/ resposta", value: demandsComResposta.length, color: COLORS.white },
      ];

      respCards.forEach((c, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        drawMetricCard(doc, c.label, c.value, c.color, margin + col * (cardW + cardGap), y + row * (cardH + 3), cardW, cardH);
      });

      y += 2 * (cardH + 3) + 4;
    } else {
      doc.setFontSize(7);
      doc.setTextColor(COLORS.textMuted.r, COLORS.textMuted.g, COLORS.textMuted.b);
      doc.text("Nenhuma demanda com resposta registrada", margin, y);
      y += 6;
    }

    // ── DEMANDAS SEM ASSESSOR ──
    if (y > 240) { addPageWithBg(); y = 20; y = drawHeader(doc, pageW, margin, y); y += 4; }

    const semAssessor = demands.filter(d => !d.assessor_id);
    y = drawSectionTitle(doc, `Demandas Sem Assessor (${semAssessor.length})`, margin, y);
    y += 2;

    if (semAssessor.length > 0) {
      semAssessor.slice(0, 15).forEach((d) => {
        if (y > 275) { addPageWithBg(); y = 20; y = drawHeader(doc, pageW, margin, y); y += 4; }

        doc.setFillColor(COLORS.cardBg.r, COLORS.cardBg.g, COLORS.cardBg.b);
        doc.roundedRect(margin, y - 2, pageW - 2 * margin, 5, 0.5, 0.5, "F");

        doc.setFontSize(5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(COLORS.textMuted.r, COLORS.textMuted.g, COLORS.textMuted.b);
        doc.text(`#${d.id}`, margin + 2, y + 1.5);

        doc.setTextColor(COLORS.teal.r, COLORS.teal.g, COLORS.teal.b);
        doc.text(typeLabel[d.type] ?? d.type, margin + 12, y + 1.5);

        doc.setTextColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
        const title = d.title.substring(0, 55) + (d.title.length > 55 ? "..." : "");
        doc.text(title, margin + 32, y + 1.5);

        doc.setTextColor(COLORS.amber.r, COLORS.amber.g, COLORS.amber.b);
        doc.text(statusLabel[d.status] ?? d.status, margin + 90, y + 1.5);

        doc.setTextColor(COLORS.textMuted.r, COLORS.textMuted.g, COLORS.textMuted.b);
        doc.text(formatDate(d.created_at), margin + 115, y + 1.5);

        y += 6;
      });
      y += 2;
    }

    // ── TODAS AS DEMANDAS (lista completa) ──
    if (y > 230) { addPageWithBg(); y = 20; y = drawHeader(doc, pageW, margin, y); y += 4; }

    y = drawSectionTitle(doc, `Todas as Demandas (${demands.length})`, margin, y);
    y += 2;

    const sortedDemands = [...demands].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    sortedDemands.forEach((d) => {
      if (y > 278) { addPageWithBg(); y = 20; y = drawHeader(doc, pageW, margin, y); y += 4; }

      doc.setFillColor(COLORS.cardBg.r, COLORS.cardBg.g, COLORS.cardBg.b);
      doc.roundedRect(margin, y - 2, pageW - 2 * margin, 5, 0.5, 0.5, "F");

      doc.setFontSize(5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(COLORS.textMuted.r, COLORS.textMuted.g, COLORS.textMuted.b);
      doc.text(`#${d.id}`, margin + 2, y + 1.5);

      doc.setTextColor(COLORS.teal.r, COLORS.teal.g, COLORS.teal.b);
      doc.text(typeLabel[d.type] ?? d.type, margin + 12, y + 1.5);

      doc.setTextColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
      const title = d.title.substring(0, 40) + (d.title.length > 40 ? "..." : "");
      doc.text(title, margin + 30, y + 1.5);

      const scColor: Record<string, { r: number; g: number; b: number }> = {
        aberto: COLORS.amber,
        em_andamento: COLORS.teal,
        aguardando_externa: COLORS.white,
        finalizada: COLORS.green,
      };
      const statusCol = scColor[d.status] ?? scColor.aberto;
      doc.setTextColor(statusCol.r, statusCol.g, statusCol.b);
      doc.text(statusLabel[d.status] ?? d.status, margin + 82, y + 1.5);

      if (d.citizen_name) {
        doc.setTextColor(COLORS.textMuted.r, COLORS.textMuted.g, COLORS.textMuted.b);
        doc.text(d.citizen_name.substring(0, 18), margin + 100, y + 1.5);
      }

      doc.setTextColor(COLORS.textMuted.r, COLORS.textMuted.g, COLORS.textMuted.b);
      doc.text(formatDate(d.created_at), margin + 125, y + 1.5);

      y += 6;
    });
  }

  // ══════════════════════════════════════════════
  // MÉTRICA: EMPREGABILIDADE (completo)
  // ══════════════════════════════════════════════
  if (metricTab === "empregabilidade") {
    // ── RESUMO DE EMPREGO ──
    y = drawSectionTitle(doc, "Resumo", margin, y);
    y += 2;

    const rowEmpResumo = [
      { label: "Cidadãos", value: empregabilidade.totalCidadaos, color: COLORS.teal },
      { label: "Com Currículo", value: empregabilidade.comCurriculo, color: COLORS.green },
      { label: "Buscando", value: empregabilidade.lookingWork, color: COLORS.amber },
      { label: "Empregados", value: empregabilidade.employed, color: COLORS.green },
    ];

    rowEmpResumo.forEach((c, i) => {
      drawMetricCard(doc, c.label, c.value, c.color, margin + i * (cardW + cardGap), y, cardW, cardH);
    });
    y += cardH + 6;

    // ── INDICADORES ──
    y = drawSectionTitle(doc, "Indicadores de Empregabilidade", margin, y);
    y += 2;

    const rowEmpCards = [
      { label: "Cidadãos", value: empregabilidade.totalCidadaos, color: COLORS.teal },
      { label: "Com Currículo", value: empregabilidade.comCurriculo, color: COLORS.green },
      { label: "Buscando", value: empregabilidade.lookingWork, color: COLORS.amber },
      { label: "Empregados", value: empregabilidade.employed, color: COLORS.green },
    ];

    rowEmpCards.forEach((c, i) => {
      drawMetricCard(doc, c.label, c.value, c.color, margin + i * (cardW + cardGap), y, cardW, cardH);
    });
    y += cardH + 3;

    const rowEmpCards2 = [
      { label: "Pesq. Respondida", value: empregabilidade.comSurvey, color: COLORS.teal },
      { label: "Sem Responder", value: empregabilidade.semSurvey, color: COLORS.red },
      { label: "Contratados Plataf.", value: contratados.length, color: COLORS.green },
      { label: "Taxa Emprego", value: `${empregabilidade.totalCidadaos > 0 ? Math.round((empregabilidade.employed / empregabilidade.totalCidadaos) * 100) : 0}%`, color: COLORS.amber },
    ];

    rowEmpCards2.forEach((c, i) => {
      drawMetricCard(doc, c.label, c.value, c.color, margin + i * (cardW + cardGap), y, cardW, cardH);
    });
    y += cardH + 6;

    // ── BARRAS DE PROPORÇÃO ──
    y = drawSectionTitle(doc, "Distribuição por Situação", margin, y);
    y += 2;

    const sitMax = Math.max(empregabilidade.employed, empregabilidade.lookingWork, empregabilidade.totalCidadaos, 1);
    const sitBarW = pageW - 2 * margin - 40;

    [
      { label: "Empregados", count: empregabilidade.employed, color: COLORS.green },
      { label: "Buscando Emprego", count: empregabilidade.lookingWork, color: COLORS.amber },
      { label: "Com Currículo", count: empregabilidade.comCurriculo, color: COLORS.teal },
      { label: "Pesq. Respondida", count: empregabilidade.comSurvey, color: COLORS.white },
    ].forEach((item) => {
      const pct = sitMax > 0 ? (item.count / sitMax) * 100 : 0;

      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
      doc.text(item.label, margin, y);

      doc.setFillColor(COLORS.cardBg.r, COLORS.cardBg.g, COLORS.cardBg.b);
      doc.roundedRect(margin + 40, y - 3, sitBarW, 4, 1, 1, "F");

      if (pct > 0) {
        doc.setFillColor(item.color.r, item.color.g, item.color.b);
        doc.roundedRect(margin + 40, y - 3, Math.max((sitBarW * pct) / 100, 1), 4, 1, 1, "F");
      }

      doc.setTextColor(item.color.r, item.color.g, item.color.b);
      doc.text(`${item.count} (${empregabilidade.totalCidadaos > 0 ? Math.round((item.count / empregabilidade.totalCidadaos) * 100) : 0}%)`, margin + 40 + sitBarW + 2, y);
      y += 6;
    });
    y += 4;

    // ── CONTRATADOS PELA PLATAFORMA ──
    if (contratados.length > 0) {
      if (y > 240) { addPageWithBg(); y = 20; y = drawHeader(doc, pageW, margin, y); y += 4; }

      y = drawSectionTitle(doc, `Contratados pela Plataforma (${contratados.length})`, margin, y);
      y += 2;

      contratados.forEach(({ cidadao, vaga }) => {
        if (y > 275) { addPageWithBg(); y = 20; y = drawHeader(doc, pageW, margin, y); y += 4; }

        doc.setFillColor(COLORS.cardBg.r, COLORS.cardBg.g, COLORS.cardBg.b);
        doc.roundedRect(margin, y - 3, pageW - 2 * margin, 12, 1.5, 1.5, "F");
        doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
        doc.setLineWidth(0.2);
        doc.roundedRect(margin, y - 3, pageW - 2 * margin, 12, 1.5, 1.5, "S");

        doc.setFillColor(COLORS.green.r, COLORS.green.g, COLORS.green.b);
        doc.ellipse(margin + 5, y + 2, 2.5, 2.5, "F");
        doc.setTextColor(COLORS.bg.r, COLORS.bg.g, COLORS.bg.b);
        doc.setFontSize(6);
        doc.setFont("helvetica", "bold");
        doc.text((cidadao.full_name || "?")[0].toUpperCase(), margin + 3.8, y + 3.2);

        doc.setTextColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
        doc.setFontSize(7);
        doc.text(cidadao.full_name || "Cidadão", margin + 12, y + 2);

        doc.setTextColor(COLORS.amber.r, COLORS.amber.g, COLORS.amber.b);
        doc.setFontSize(6);
        doc.text(`Vaga: ${vaga?.title || cidadao.platform_job_details || "Não informada"}`, margin + 12, y + 6);

        doc.setTextColor(COLORS.teal.r, COLORS.teal.g, COLORS.teal.b);
        doc.text(`Empresa: ${vaga?.company_name || "Não informada"}`, margin + 12, y + 9);

        const badgeText = "Contratado";
        const badgeW = doc.getTextWidth(badgeText) + 4;
        doc.setFillColor(COLORS.green.r, COLORS.green.g, COLORS.green.b);
        doc.roundedRect(pageW - margin - badgeW - 2, y, badgeW, 4, 1, 1, "F");
        doc.setTextColor(COLORS.bg.r, COLORS.bg.g, COLORS.bg.b);
        doc.setFontSize(5);
        doc.text(badgeText, pageW - margin - badgeW, y + 2.8);

        y += 15;
      });

      y += 2;
    } else {
      doc.setFontSize(7);
      doc.setTextColor(COLORS.textMuted.r, COLORS.textMuted.g, COLORS.textMuted.b);
      doc.text("Nenhum cidadão contratado pela plataforma ainda", margin, y);
      y += 6;
    }
  }

  // ══════════════════════════════════════════════
  // MÉTRICA: BAIRROS (completo)
  // ══════════════════════════════════════════════
  if (metricTab === "bairros") {
    const porBairro: Record<string, number> = {};
    const porBairroStatus: Record<string, Record<string, number>> = {};
    demands.forEach((d) => {
      const b = d.citizen_neighborhood?.trim() || "Não informado";
      porBairro[b] = (porBairro[b] || 0) + 1;
      if (!porBairroStatus[b]) porBairroStatus[b] = {};
      porBairroStatus[b][d.status] = (porBairroStatus[b][d.status] || 0) + 1;
    });

    const topBairros = Object.entries(porBairro)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    // ── RESUMO DE BAIRROS ──
    y = drawSectionTitle(doc, "Resumo", margin, y);
    y += 2;

    const rowBairroResumo = [
      { label: "Demandas", value: demands.length, color: COLORS.teal },
      { label: "Bairros", value: Object.keys(porBairro).length, color: COLORS.amber },
      { label: "Em Aberto", value: porStatus["aberto"] || 0, color: COLORS.amber },
      { label: "Finalizadas", value: porStatus["finalizada"] || 0, color: COLORS.green },
    ];

    rowBairroResumo.forEach((c, i) => {
      drawMetricCard(doc, c.label, c.value, c.color, margin + i * (cardW + cardGap), y, cardW, cardH);
    });
    y += cardH + 6;

    // ── BARRAS DE BAIRROS ──
    y = drawSectionTitle(doc, `Demandas por Bairro (Top ${topBairros.length})`, margin, y);
    y += 2;

    const bairroBarMax = topBairros.length > 0 ? topBairros[0][1] : 1;
    const bairroBarW = pageW - 2 * margin - 50;

    topBairros.forEach(([bairro, count], i) => {
      const color = i === 0 ? COLORS.teal : i < 3 ? COLORS.amber : COLORS.text;
      const pct = bairroBarMax > 0 ? (count / bairroBarMax) * 100 : 0;

      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
      doc.text(`${i + 1}.`, margin, y);
      doc.text(bairro.substring(0, 22), margin + 6, y);

      doc.setFillColor(COLORS.cardBg.r, COLORS.cardBg.g, COLORS.cardBg.b);
      doc.roundedRect(margin + 38, y - 2.5, bairroBarW, 3.5, 0.5, 0.5, "F");

      if (pct > 0) {
        doc.setFillColor(color.r, color.g, color.b);
        doc.roundedRect(margin + 38, y - 2.5, Math.max((bairroBarW * pct) / 100, 1), 3.5, 0.5, 0.5, "F");
      }

      doc.setTextColor(color.r, color.g, color.b);
      doc.text(`${count} (${bairroBarMax > 0 ? Math.round((count / demands.length) * 100) : 0}%)`, margin + 38 + bairroBarW + 2, y);

      y += 5;
    });
    y += 4;

    // ── DETALHE POR BAIRRO (cards) ──
    if (y > 230) { addPageWithBg(); y = 20; y = drawHeader(doc, pageW, margin, y); y += 4; }

    y = drawSectionTitle(doc, "Detalhe por Bairro (Abertas / Em Andamento / Finalizadas)", margin, y);
    y += 2;

    topBairros.slice(0, 15).forEach(([bairro, total]) => {
      if (y > 278) { addPageWithBg(); y = 20; y = drawHeader(doc, pageW, margin, y); y += 4; }

      const statusCounts = porBairroStatus[bairro] || {};
      const abertas = statusCounts["aberto"] || 0;
      const andamento = statusCounts["em_andamento"] || 0;
      const finalizadas = statusCounts["finalizada"] || 0;
      const agExt = statusCounts["aguardando_externa"] || 0;

      doc.setFillColor(COLORS.cardBg.r, COLORS.cardBg.g, COLORS.cardBg.b);
      doc.roundedRect(margin, y - 2, pageW - 2 * margin, 5, 0.5, 0.5, "F");

      doc.setFontSize(5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
      doc.text(bairro.substring(0, 20), margin + 2, y + 1.5);

      // Mini barras empilhadas
      const detailW = pageW - 2 * margin - 45;
      const totalBairro = total || 1;
      const segmentos = [
        { count: abertas, color: COLORS.amber },
        { count: andamento, color: COLORS.teal },
        { count: agExt, color: COLORS.white },
        { count: finalizadas, color: COLORS.green },
      ];

      let segX = margin + 42;
      segmentos.forEach((seg) => {
        const segW = (seg.count / totalBairro) * detailW;
        if (segW > 0.2) {
          doc.setFillColor(seg.color.r, seg.color.g, seg.color.b);
          doc.roundedRect(segX, y - 1.5, Math.max(segW, 0.5), 3, 0.3, 0.3, "F");
          segX += segW;
        }
      });

      doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
      doc.text(`T:${total}`, margin + 42 + detailW + 1, y + 1.5);

      y += 6;
    });
  }

  drawFooter(doc, pageW, margin, 290);
  const fileNameMap: Record<MetricTab, string> = {
    demandas: "metricas-demandas.pdf",
    empregabilidade: "metricas-empregabilidade.pdf",
    bairros: "metricas-bairros.pdf",
  };
  doc.save(fileNameMap[metricTab]);
}