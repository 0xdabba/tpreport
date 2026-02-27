import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  generateSection,
  getSectionsForDocType,
  type GenerationContext,
} from "@/lib/llm";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "Anthropic API key not configured. Add it in Settings or .env" },
        { status: 400 }
      );
    }

    const userId = (session.user as { id: string }).id;
    const { id } = await params;
    const body = await request.json();
    const { sectionId, financialYear } = body;

    if (!sectionId) {
      return NextResponse.json(
        { error: "sectionId is required" },
        { status: 400 }
      );
    }

    // Fetch document with full context
    const document = await prisma.document.findFirst({
      where: { id, client: { userId } },
      include: {
        client: true,
        analysis: true,
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Get section definition
    const sections = getSectionsForDocType(document.type);
    const sectionDef = sections.find((s) => s.id === sectionId);

    if (!sectionDef) {
      return NextResponse.json(
        { error: `Unknown section: ${sectionId}` },
        { status: 400 }
      );
    }

    // Fetch all related data
    const entities = await prisma.entity.findMany({
      where: { clientId: document.clientId },
    });

    const entityIds = entities.map((e) => e.id);
    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { fromEntityId: { in: entityIds } },
          { toEntityId: { in: entityIds } },
        ],
      },
      include: {
        fromEntity: { select: { name: true, country: true } },
        toEntity: { select: { name: true, country: true } },
      },
    });

    const pastReports = await prisma.document.findMany({
      where: {
        clientId: document.clientId,
        status: "final",
        type: document.type,
        id: { not: id },
        content: { not: null },
      },
      orderBy: { updatedAt: "desc" },
      take: 2,
      select: { content: true },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { firm: true },
    });

    const ctx: GenerationContext = {
      clientName: document.client.name,
      industry: document.client.industry,
      financialYear: financialYear || "2025-26",
      entities: entities.map((e) => ({
        id: e.id,
        name: e.name,
        country: e.country,
        entityType: e.entityType,
        role: e.role,
        functions: e.functions,
        risks: e.risks,
        assets: e.assets,
        revenue: e.revenue,
        expenses: e.expenses,
        employees: e.employees,
      })),
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        description: t.description,
        amount: t.amount,
        currency: t.currency,
        method: t.method,
        fromEntity: t.fromEntity,
        toEntity: t.toEntity,
      })),
      analysis: document.analysis
        ? {
            id: document.analysis.id,
            summary: document.analysis.summary,
            functions: document.analysis.functions,
            risks: document.analysis.risks,
            assets: document.analysis.assets,
            pricingMethod: document.analysis.pricingMethod,
          }
        : null,
      pastReportExcerpts: pastReports
        .map((r) => r.content?.substring(0, 1500))
        .filter(Boolean) as string[],
      firmName: user?.firm || undefined,
    };

    const content = await generateSection(
      document.type,
      sectionId,
      sectionDef.title,
      ctx
    );

    return NextResponse.json({
      sectionId,
      title: sectionDef.title,
      content,
    });
  } catch (error) {
    console.error("Error regenerating section:", error);
    return NextResponse.json(
      { error: "Failed to regenerate section" },
      { status: 500 }
    );
  }
}
