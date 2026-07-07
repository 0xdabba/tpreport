import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFirmSession } from "@/lib/session";
import { buildDocx, type Letterhead } from "@/lib/export/docx";
import { buildPdf } from "@/lib/export/pdf";

const TYPE_TITLES: Record<string, string> = {
  "tp-study": "Transfer Pricing Study Report",
  "local-file": "Form 3CEB — Local File",
  "master-file": "Master File (Rule 10DA)",
  "agreement-services": "Intercompany Service Agreement",
  "agreement-licensing": "Intercompany License Agreement",
  "agreement-lending": "Intercompany Loan Agreement",
  benchmarking: "Benchmarking Report",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const s = await getFirmSession();
    if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "docx";

    const document = await prisma.document.findFirst({
      where: { id, client: { firmId: s.firmId } },
      include: { client: { select: { name: true } } },
    });
    if (!document || !document.content) {
      return NextResponse.json({ error: "Document not found or empty" }, { status: 404 });
    }

    const firm = await prisma.firm.findUnique({ where: { id: s.firmId } });
    const letterhead: Letterhead = {
      firmName: firm?.name || "TP Report",
      addressLines: [
        [firm?.addressLine1, firm?.addressLine2].filter(Boolean).join(", "),
        [firm?.city, firm?.pincode].filter(Boolean).join(" "),
      ].filter((l) => l.length > 0),
      frn: firm?.frn,
      email: firm?.email,
      phone: firm?.phone,
      brandColor: firm?.brandColor,
    };

    const title = TYPE_TITLES[document.type] || document.name;
    const fy = document.financialYear || "2025-26";
    const safeName = `${document.client.name.replace(/[^a-zA-Z0-9]+/g, "-")}-${document.type}-FY${fy}`;

    if (format === "pdf") {
      const bytes = await buildPdf({
        title,
        clientName: document.client.name,
        financialYear: fy,
        content: document.content,
        letterhead,
      });
      return new NextResponse(Buffer.from(bytes), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
        },
      });
    }

    const buf = await buildDocx({
      title,
      clientName: document.client.name,
      financialYear: fy,
      content: document.content,
      letterhead,
    });
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${safeName}.docx"`,
      },
    });
  } catch (error) {
    console.error("Error exporting document:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
