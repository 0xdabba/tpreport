import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFirmSession } from "@/lib/session";

async function verifyClientOwnership(clientId: string, firmId: string) {
  const client = await prisma.client.findFirst({
    where: { id: clientId, firmId },
  });
  return client;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const s = await getFirmSession();
    if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const client = await prisma.client.findFirst({
      where: { id, firmId: s.firmId },
      include: {
        entities: {
          orderBy: { createdAt: "desc" },
        },
        analyses: {
          orderBy: { createdAt: "desc" },
        },
        documents: {
          orderBy: { createdAt: "desc" },
        },
        alerts: {
          where: { status: "active" },
          orderBy: { createdAt: "desc" },
        },
        deadlines: {
          orderBy: { dueDate: "asc" },
        },
        _count: {
          select: {
            entities: true,
            analyses: true,
            documents: true,
            alerts: true,
          },
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({ client });
  } catch (error) {
    console.error("Error fetching client:", error);
    return NextResponse.json(
      { error: "Failed to fetch client" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const s = await getFirmSession();
    if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const existingClient = await verifyClientOwnership(id, s.firmId);
    if (!existingClient) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, industry, description, pan, cin, turnover, groupRevenue, hasIntlTxn, hasSDT } = body;

    const client = await prisma.client.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(industry !== undefined && { industry }),
        ...(description !== undefined && { description }),
        ...(pan !== undefined && { pan }),
        ...(cin !== undefined && { cin }),
        ...(turnover !== undefined && { turnover: turnover === null || turnover === "" ? null : Number(turnover) }),
        ...(groupRevenue !== undefined && { groupRevenue: groupRevenue === null || groupRevenue === "" ? null : Number(groupRevenue) }),
        ...(hasIntlTxn !== undefined && { hasIntlTxn: !!hasIntlTxn }),
        ...(hasSDT !== undefined && { hasSDT: !!hasSDT }),
      },
      include: {
        _count: {
          select: {
            entities: true,
            analyses: true,
            documents: true,
            alerts: true,
          },
        },
      },
    });

    return NextResponse.json({ client });
  } catch (error) {
    console.error("Error updating client:", error);
    return NextResponse.json(
      { error: "Failed to update client" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const s = await getFirmSession();
    if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const existingClient = await verifyClientOwnership(id, s.firmId);
    if (!existingClient) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    await prisma.client.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Client deleted successfully" });
  } catch (error) {
    console.error("Error deleting client:", error);
    return NextResponse.json(
      { error: "Failed to delete client" },
      { status: 500 }
    );
  }
}
