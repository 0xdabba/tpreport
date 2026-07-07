import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFirmSession } from "@/lib/session";
import { gateFeature } from "@/lib/plans";
import { deriveToken, hashToken } from "@/lib/tokens";

/** POST { clientId } — create (or return) the portal link for a client. */
export async function POST(request: Request) {
  const s = await getFirmSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const firm = await prisma.firm.findUnique({ where: { id: s.firmId } });
  if (!firm) return NextResponse.json({ error: "Firm not found" }, { status: 404 });
  const gateError = gateFeature(firm, "portal");
  if (gateError) return NextResponse.json({ error: gateError }, { status: 403 });

  const { clientId } = await request.json();
  const client = await prisma.client.findFirst({ where: { id: clientId, firmId: s.firmId } });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  // HMAC-derived token (reconfirm pattern) — rebuildable, only hash stored
  const token = deriveToken("portal", client.id);
  const tokenHashValue = hashToken(token);

  await prisma.portalToken.upsert({
    where: { tokenHash: tokenHashValue },
    create: { clientId: client.id, tokenHash: tokenHashValue, label: "Client portal" },
    update: { revokedAt: null },
  });

  const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return NextResponse.json({ url: `${appUrl}/portal/${token}` }, { status: 201 });
}

/** DELETE ?clientId= — revoke the portal link. */
export async function DELETE(request: Request) {
  const s = await getFirmSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });

  const client = await prisma.client.findFirst({ where: { id: clientId, firmId: s.firmId } });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  await prisma.portalToken.updateMany({
    where: { clientId },
    data: { revokedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
