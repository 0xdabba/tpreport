/**
 * DOCX export — converts a generated document (plain text with markdown-ish
 * headings and pipe tables from the LLM) into a branded Word file with the
 * firm's letterhead.
 */

import {
  Document as Docx,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
} from "docx";

export type Letterhead = {
  firmName: string;
  addressLines: string[];
  frn?: string | null;
  email?: string | null;
  phone?: string | null;
  brandColor?: string | null; // hex without '#'
};

type Block =
  | { kind: "h1" | "h2" | "h3"; text: string }
  | { kind: "p"; text: string }
  | { kind: "li"; text: string }
  | { kind: "table"; rows: string[][] };

function parseBlocks(content: string): Block[] {
  const lines = content.split(/\r?\n/);
  const blocks: Block[] = [];
  let tableRows: string[][] | null = null;

  const flushTable = () => {
    if (tableRows && tableRows.length > 0) blocks.push({ kind: "table", rows: tableRows });
    tableRows = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const t = line.trim();

    if (t.startsWith("|")) {
      const cells = t
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim());
      // skip separator rows like |---|---|
      if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;
      if (!tableRows) tableRows = [];
      tableRows.push(cells);
      continue;
    }
    flushTable();

    if (!t) continue;
    if (/^#{3,}\s/.test(t)) blocks.push({ kind: "h3", text: t.replace(/^#+\s*/, "") });
    else if (/^##\s/.test(t)) blocks.push({ kind: "h2", text: t.replace(/^#+\s*/, "") });
    else if (/^#\s/.test(t)) blocks.push({ kind: "h1", text: t.replace(/^#+\s*/, "") });
    else if (/^\d+\.\s+[A-Z]/.test(t) && t.length < 80 && !t.endsWith("."))
      blocks.push({ kind: "h2", text: t }); // numbered section heading heuristic
    else if (/^[-*•]\s+/.test(t)) blocks.push({ kind: "li", text: t.replace(/^[-*•]\s+/, "") });
    else if (/^[=-]{4,}$/.test(t)) continue; // rule lines from plain-text assembly
    else blocks.push({ kind: "p", text: t });
  }
  flushTable();
  return blocks;
}

/** Bold runs for **text** spans. */
function runs(text: string, opts: { bold?: boolean; size?: number } = {}): TextRun[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map(
    (p) =>
      new TextRun({
        text: p.replace(/^\*\*|\*\*$/g, ""),
        bold: opts.bold || p.startsWith("**"),
        size: opts.size,
      })
  );
}

export async function buildDocx(params: {
  title: string;
  clientName: string;
  financialYear: string;
  content: string;
  letterhead: Letterhead;
  preparedOn?: Date;
}): Promise<Buffer> {
  const { title, clientName, financialYear, content, letterhead } = params;
  const color = (letterhead.brandColor || "C2410C").replace("#", "");
  const blocks = parseBlocks(content);

  const children: (Paragraph | Table)[] = [];

  // --- Letterhead / cover ---
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({ text: letterhead.firmName, bold: true, size: 40, color }),
      ],
    })
  );
  const subLines = [
    ...letterhead.addressLines.filter(Boolean),
    [letterhead.frn ? `FRN: ${letterhead.frn}` : null, letterhead.email, letterhead.phone]
      .filter(Boolean)
      .join("  •  "),
  ].filter((l) => l && l.length > 0);
  for (const l of subLines) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 20 },
        children: [new TextRun({ text: l as string, size: 18, color: "666666" })],
      })
    );
  }
  children.push(
    new Paragraph({
      spacing: { before: 360, after: 120 },
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: title, bold: true, size: 34 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: clientName, size: 26 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 480 },
      children: [
        new TextRun({
          text: `Financial Year ${financialYear}  •  Prepared ${(params.preparedOn || new Date()).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`,
          size: 20,
          color: "666666",
        }),
      ],
    })
  );

  // --- Body ---
  for (const b of blocks) {
    if (b.kind === "table") {
      const [head, ...rest] = b.rows;
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              tableHeader: true,
              children: head.map(
                (c) =>
                  new TableCell({
                    shading: { fill: "F5EDE6" },
                    children: [new Paragraph({ children: runs(c, { bold: true, size: 18 }) })],
                  })
              ),
            }),
            ...rest.map(
              (row) =>
                new TableRow({
                  children: (row.length === head.length ? row : [...row, ...Array(Math.max(0, head.length - row.length)).fill("")]).map(
                    (c) =>
                      new TableCell({
                        children: [new Paragraph({ children: runs(c, { size: 18 }) })],
                      })
                  ),
                })
            ),
          ],
        }),
        new Paragraph({ spacing: { after: 120 }, children: [] })
      );
    } else if (b.kind === "h1") {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 300, after: 120 },
          children: [new TextRun({ text: b.text, bold: true, size: 30, color })],
        })
      );
    } else if (b.kind === "h2") {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 100 },
          children: [new TextRun({ text: b.text, bold: true, size: 26, color })],
        })
      );
    } else if (b.kind === "h3") {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 180, after: 80 },
          children: [new TextRun({ text: b.text, bold: true, size: 22 })],
        })
      );
    } else if (b.kind === "li") {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 40 },
          children: runs(b.text, { size: 20 }),
        })
      );
    } else {
      children.push(
        new Paragraph({ spacing: { after: 100 }, children: runs(b.text, { size: 20 }) })
      );
    }
  }

  // --- Footer note ---
  children.push(
    new Paragraph({
      spacing: { before: 480 },
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: "DDDDDD" } },
      children: [
        new TextRun({
          text: `Prepared by ${letterhead.firmName} using TP Report. This document is a draft for professional review and must be verified by the signing accountant before filing.`,
          size: 16,
          color: "999999",
          italics: true,
        }),
      ],
    })
  );

  const doc = new Docx({
    creator: letterhead.firmName,
    title,
    sections: [{ children }],
  });
  return Packer.toBuffer(doc);
}
