import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFirmSession } from "@/lib/session";
import { buildDocx, type Letterhead } from "@/lib/export/docx";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const s = await getFirmSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const proposal = await prisma.proposal.findFirst({
    where: { id, firmId: s.firmId },
    include: { client: { select: { id: true, name: true } } },
  });
  if (!proposal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // DOCX export: ?export=proposal|letter
  const { searchParams } = new URL(request.url);
  const exportKind = searchParams.get("export");
  if (exportKind) {
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
    const content = exportKind === "letter" ? proposal.engagementLetter : proposal.content;
    if (!content) return NextResponse.json({ error: "Nothing generated to export" }, { status: 400 });
    const buf = await buildDocx({
      title: exportKind === "letter" ? "Engagement Letter" : "Proposal for Transfer Pricing Services",
      clientName: proposal.prospectName,
      financialYear: proposal.financialYear || "2025-26",
      content,
      letterhead,
    });
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${proposal.prospectName.replace(/[^a-zA-Z0-9]+/g, "-")}-${exportKind}.docx"`,
      },
    });
  }

  return NextResponse.json(proposal);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const s = await getFirmSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const proposal = await prisma.proposal.findFirst({ where: { id, firmId: s.firmId } });
  if (!proposal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const data: Record<string, unknown> = {};
  if (body.status && ["draft", "sent", "accepted", "rejected"].includes(body.status)) {
    data.status = body.status;
  }
  if (body.content !== undefined) data.content = body.content;
  if (body.engagementLetter !== undefined) data.engagementLetter = body.engagementLetter;

  const updated = await prisma.proposal.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const s = await getFirmSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const proposal = await prisma.proposal.findFirst({ where: { id, firmId: s.firmId } });
  if (!proposal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.proposal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
