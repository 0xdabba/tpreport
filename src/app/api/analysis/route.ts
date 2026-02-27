import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;

    const analyses = await prisma.functionalAnalysis.findMany({
      where: {
        client: { userId },
      },
      include: {
        client: {
          select: { id: true, name: true },
        },
        transactions: {
          include: {
            fromEntity: {
              select: { id: true, name: true, country: true },
            },
            toEntity: {
              select: { id: true, name: true, country: true },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(analyses);
  } catch (error) {
    console.error("Error fetching analyses:", error);
    return NextResponse.json(
      { error: "Failed to fetch analyses" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const body = await request.json();
    const {
      clientId,
      status,
      summary,
      functions,
      risks,
      assets,
      pricingMethod,
      benchmarkData,
      transactions,
    } = body;

    if (!clientId) {
      return NextResponse.json(
        { error: "Client is required" },
        { status: 400 }
      );
    }

    // Verify client belongs to user
    const client = await prisma.client.findFirst({
      where: { id: clientId, userId },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Client not found or unauthorized" },
        { status: 404 }
      );
    }

    const analysis = await prisma.functionalAnalysis.create({
      data: {
        status: status || "draft",
        summary: summary || null,
        functions: functions || null,
        risks: risks || null,
        assets: assets || null,
        pricingMethod: pricingMethod || null,
        benchmarkData: benchmarkData || null,
        clientId,
        transactions: {
          create: (transactions || []).map(
            (t: {
              type: string;
              description?: string;
              amount?: number;
              currency?: string;
              method?: string;
              fromEntityId: string;
              toEntityId: string;
            }) => ({
              type: t.type,
              description: t.description || null,
              amount: t.amount ? parseFloat(String(t.amount)) : null,
              currency: t.currency || "INR",
              method: t.method || null,
              fromEntityId: t.fromEntityId,
              toEntityId: t.toEntityId,
            })
          ),
        },
      },
      include: {
        client: {
          select: { id: true, name: true },
        },
        transactions: {
          include: {
            fromEntity: {
              select: { id: true, name: true, country: true },
            },
            toEntity: {
              select: { id: true, name: true, country: true },
            },
          },
        },
      },
    });

    return NextResponse.json(analysis, { status: 201 });
  } catch (error) {
    console.error("Error creating analysis:", error);
    return NextResponse.json(
      { error: "Failed to create analysis" },
      { status: 500 }
    );
  }
}
