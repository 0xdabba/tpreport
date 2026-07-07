import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFirmSession } from "@/lib/session";
import { gateFeature } from "@/lib/plans";
import { estimateEngagementFee } from "@/lib/fees";

export async function GET() {
  const s = await getFirmSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const proposals = await prisma.proposal.findMany({
    where: { firmId: s.firmId },
    include: { client: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(proposals);
}

/**
 * POST { prospectName, clientId?, industry?, financialYear, itemIds[], complexity, notes?, generate? }
 */
export async function POST(request: Request) {
  const s = await getFirmSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const firm = await prisma.firm.findUnique({ where: { id: s.firmId } });
  if (!firm) return NextResponse.json({ error: "Firm not found" }, { status: 404 });
  const gateError = gateFeature(firm, "proposals");
  if (gateError) return NextResponse.json({ error: gateError }, { status: 403 });

  const body = await request.json();
  const { prospectName, clientId, industry, financialYear, itemIds, complexity, notes } = body;
  if (!prospectName || !Array.isArray(itemIds) || itemIds.length === 0) {
    return NextResponse.json(
      { error: "prospectName and at least one scope item are required" },
      { status: 400 }
    );
  }

  if (clientId) {
    const client = await prisma.client.findFirst({ where: { id: clientId, firmId: s.firmId } });
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const { items, total } = estimateEngagementFee(itemIds, complexity || "standard");

  let content: string | null = null;
  let engagementLetter: string | null = null;

  if (process.env.ANTHROPIC_API_KEY && body.generate !== false) {
    const { generateProposal } = await import("@/lib/llm");
    const generated = await generateProposal({
      firmName: firm.name,
      firmCity: firm.city,
      prospectName,
      industry: industry || null,
      financialYear: financialYear || "2025-26",
      scopeItems: items,
      totalFee: total,
      notes: notes || null,
    });
    content = generated.proposal;
    engagementLetter = generated.engagementLetter;
  }

  const proposal = await prisma.proposal.create({
    data: {
      firmId: s.firmId,
      clientId: clientId || null,
      prospectName,
      financialYear: financialYear || "2025-26",
      scopeJson: JSON.stringify(items),
      totalFee: total,
      content,
      engagementLetter,
      status: "draft",
    },
    include: { client: { select: { id: true, name: true } } },
  });

  return NextResponse.json(proposal, { status: 201 });
}
