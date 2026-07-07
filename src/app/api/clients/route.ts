import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFirmSession } from "@/lib/session";
import { gateClientCount } from "@/lib/plans";

export async function GET() {
  try {
    const s = await getFirmSession();
    if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const clients = await prisma.client.findMany({
      where: { firmId: s.firmId },
      include: {
        _count: {
          select: {
            entities: true,
            analyses: true,
            documents: true,
            alerts: true,
            deadlines: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(clients);
  } catch (error) {
    console.error("Error fetching clients:", error);
    return NextResponse.json(
      { error: "Failed to fetch clients" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const s = await getFirmSession();
    if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { name, industry, description, pan, cin, turnover, groupRevenue, hasIntlTxn, hasSDT } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Client name is required" },
        { status: 400 }
      );
    }

    const firm = await prisma.firm.findUnique({
      where: { id: s.firmId },
      include: { _count: { select: { clients: true } } },
    });
    if (!firm) return NextResponse.json({ error: "Firm not found" }, { status: 404 });
    const gateError = gateClientCount(firm, firm._count.clients);
    if (gateError) return NextResponse.json({ error: gateError }, { status: 403 });

    const client = await prisma.client.create({
      data: {
        name,
        industry: industry || null,
        description: description || null,
        pan: pan || null,
        cin: cin || null,
        turnover: turnover ? Number(turnover) : null,
        groupRevenue: groupRevenue ? Number(groupRevenue) : null,
        hasIntlTxn: hasIntlTxn === undefined ? true : !!hasIntlTxn,
        hasSDT: !!hasSDT,
        firmId: s.firmId,
        userId: s.userId,
      },
      include: {
        _count: {
          select: { entities: true },
        },
      },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error("Error creating client:", error);
    return NextResponse.json(
      { error: "Failed to create client" },
      { status: 500 }
    );
  }
}
