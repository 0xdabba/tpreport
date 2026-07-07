import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/tokens";
import { buildDocx, type Letterhead } from "@/lib/export/docx";
import { buildPdf } from "@/lib/export/pdf";

/** PUBLIC — download a FINAL document via a valid portal token. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string; docId: string }> }
) {
  const { token, docId } = await params;
  const record = await prisma.portalToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { client: { include: { firm: true } } },
  });
  if (!record || record.revokedAt) {
    return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  }

  const document = await prisma.document.findFirst({
    where: { id: docId, clientId: record.clientId, status: "final" },
  });
  if (!document || !document.content) {
    return NextResponse.json({ error: "Document not available" }, { status: 404 });
  }

  const firm = record.client.firm;
  const letterhead: Letterhead = {
    firmName: firm.name,
    addressLines: [
      [firm.addressLine1, firm.addressLine2].filter(Boolean).join(", "),
      [firm.city, firm.pincode].filter(Boolean).join(" "),
    ].filter((l) => l.length > 0),
    frn: firm.frn,
    email: firm.email,
    phone: firm.phone,
    brandColor: firm.brandColor,
  };

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "pdf";
  const fy = document.financialYear || "2025-26";
  const safeName = `${record.client.name.replace(/[^a-zA-Z0-9]+/g, "-")}-${document.type}-FY${fy}`;

  if (format === "docx") {
    const buf = await buildDocx({
      title: document.name,
      clientName: record.client.name,
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
  }

  const bytes = await buildPdf({
    title: document.name,
    clientName: record.client.name,
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
