import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFirmSession, isPartner } from "@/lib/session";
import { getPlan } from "@/lib/plans";

export async function GET() {
  const s = await getFirmSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const firm = await prisma.firm.findUnique({
    where: { id: s.firmId },
    include: {
      users: {
        select: { id: true, name: true, email: true, firmRole: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
      invites: {
        where: { acceptedAt: null, expiresAt: { gt: new Date() } },
        select: { id: true, email: true, firmRole: true, expiresAt: true, token: true },
      },
      _count: { select: { clients: true } },
    },
  });
  if (!firm) return NextResponse.json({ error: "Firm not found" }, { status: 404 });

  const limits = getPlan(firm.plan);
  return NextResponse.json({
    ...firm,
    planLimits: {
      ...limits,
      maxClients: Number.isFinite(limits.maxClients) ? limits.maxClients : null,
      maxSeats: Number.isFinite(limits.maxSeats) ? limits.maxSeats : null,
    },
  });
}

export async function PUT(request: Request) {
  const s = await getFirmSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isPartner(s.firmRole)) {
    return NextResponse.json({ error: "Only partners can update firm settings" }, { status: 403 });
  }

  const body = await request.json();
  const allowed = [
    "name",
    "addressLine1",
    "addressLine2",
    "city",
    "pincode",
    "email",
    "phone",
    "website",
    "frn",
    "logoText",
    "brandColor",
  ] as const;
  const data: Record<string, string | null> = {};
  for (const k of allowed) {
    if (k in body) data[k] = body[k] || null;
  }
  if (data.name === null) {
    return NextResponse.json({ error: "Firm name cannot be empty" }, { status: 400 });
  }

  const firm = await prisma.firm.update({ where: { id: s.firmId }, data });
  return NextResponse.json(firm);
}
