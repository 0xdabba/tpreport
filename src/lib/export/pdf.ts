/**
 * PDF export via pdf-lib. WinAnsi cannot encode ₹ or smart punctuation —
 * pdfSafe() maps them (same gotcha as reconfirm's evidence PDFs).
 */

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Letterhead } from "./docx";

export function pdfSafe(s: string): string {
  return s
    .replace(/₹/g, "Rs. ")
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/•/g, "-")
    .replace(/→/g, "->")
    .replace(/[^\x00-\xFF]/g, "?");
}

const A4 = { w: 595.28, h: 841.89 };
const MARGIN = 56;
const LINE = 14;

export async function buildPdf(params: {
  title: string;
  clientName: string;
  financialYear: string;
  content: string;
  letterhead: Letterhead;
}): Promise<Uint8Array> {
  const { title, clientName, financialYear, content, letterhead } = params;
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const brand = hexToRgb(letterhead.brandColor || "#C2410C");
  let page = doc.addPage([A4.w, A4.h]);
  let y = A4.h - MARGIN;

  const newPage = () => {
    page = doc.addPage([A4.w, A4.h]);
    y = A4.h - MARGIN;
  };
  const ensure = (needed: number) => {
    if (y - needed < MARGIN) newPage();
  };
  const drawLine = (text: string, opts: { size?: number; isBold?: boolean; color?: ReturnType<typeof rgb>; indent?: number } = {}) => {
    const size = opts.size || 10;
    const f = opts.isBold ? bold : font;
    const maxWidth = A4.w - MARGIN * 2 - (opts.indent || 0);
    const words = pdfSafe(text).split(/\s+/);
    let cur = "";
    const lines: string[] = [];
    for (const w of words) {
      const trial = cur ? cur + " " + w : w;
      if (f.widthOfTextAtSize(trial, size) > maxWidth && cur) {
        lines.push(cur);
        cur = w;
      } else cur = trial;
    }
    if (cur) lines.push(cur);
    for (const l of lines) {
      ensure(LINE);
      page.drawText(l, {
        x: MARGIN + (opts.indent || 0),
        y,
        size,
        font: f,
        color: opts.color || rgb(0.13, 0.13, 0.13),
      });
      y -= LINE * (size / 10);
    }
  };

  // Letterhead
  drawLine(letterhead.firmName, { size: 18, isBold: true, color: brand });
  for (const l of letterhead.addressLines.filter(Boolean)) drawLine(l, { size: 8, color: rgb(0.45, 0.45, 0.45) });
  const meta = [letterhead.frn ? `FRN: ${letterhead.frn}` : null, letterhead.email, letterhead.phone].filter(Boolean).join("  |  ");
  if (meta) drawLine(meta, { size: 8, color: rgb(0.45, 0.45, 0.45) });
  y -= 18;
  drawLine(title, { size: 15, isBold: true });
  drawLine(`${clientName}  |  FY ${financialYear}`, { size: 11, color: rgb(0.35, 0.35, 0.35) });
  y -= 14;

  // Body — simple block rendering
  for (const raw of content.split(/\r?\n/)) {
    const t = raw.trim();
    if (!t) {
      y -= 6;
      continue;
    }
    if (/^[=-]{4,}$/.test(t)) continue;
    if (t.startsWith("|")) {
      const cells = t.split("|").slice(1, -1).map((c) => c.trim());
      if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;
      drawLine(cells.join("   |   "), { size: 8.5, indent: 8 });
      continue;
    }
    if (/^#{1,2}\s/.test(t)) {
      y -= 8;
      drawLine(t.replace(/^#+\s*/, ""), { size: 12.5, isBold: true, color: brand });
    } else if (/^#{3,}\s/.test(t)) {
      y -= 4;
      drawLine(t.replace(/^#+\s*/, ""), { size: 11, isBold: true });
    } else if (/^\d+\.\s+[A-Z]/.test(t) && t.length < 80 && !t.endsWith(".")) {
      y -= 8;
      drawLine(t, { size: 12.5, isBold: true, color: brand });
    } else if (/^[-*•]\s+/.test(t)) {
      drawLine("- " + t.replace(/^[-*•]\s+/, "").replace(/\*\*/g, ""), { indent: 10 });
    } else {
      drawLine(t.replace(/\*\*/g, ""));
    }
  }

  // Footer on each page
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    p.drawText(pdfSafe(`${letterhead.firmName} - draft for professional review - page ${i + 1}/${pages.length}`), {
      x: MARGIN,
      y: 30,
      size: 7.5,
      font,
      color: rgb(0.6, 0.6, 0.6),
    });
  });

  return doc.save();
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return rgb(
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255
  );
}
