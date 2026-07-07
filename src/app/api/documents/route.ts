import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFirmSession } from "@/lib/session";
import type { GenerationContext } from "@/lib/llm";
import { computeAlpRange } from "@/lib/benchmarking";

export async function GET() {
  try {
    const s = await getFirmSession();
    if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const documents = await prisma.document.findMany({
      where: {
        client: { firmId: s.firmId },
      },
      include: {
        client: {
          select: { id: true, name: true },
        },
        analysis: {
          select: { id: true, status: true },
        },
        approvedBy: { select: { id: true, name: true } },
        submittedBy: { select: { id: true, name: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const s = await getFirmSession();
    if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { name, type, clientId, analysisId, financialYear, benchmarkingSetId } = body;

    if (!name || !type || !clientId) {
      return NextResponse.json(
        { error: "Name, type, and client are required" },
        { status: 400 }
      );
    }

    const client = await prisma.client.findFirst({
      where: { id: clientId, firmId: s.firmId },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Client not found or unauthorized" },
        { status: 404 }
      );
    }

    // Benchmarking reports must be grounded in a real comparable set —
    // AI-fabricated comparables are a professional-liability hazard.
    let benchmarkingCtx: GenerationContext["benchmarking"] = undefined;
    if (type === "benchmarking" || benchmarkingSetId) {
      if (!benchmarkingSetId) {
        return NextResponse.json(
          {
            error:
              "Benchmarking reports require a comparable set. Create one under Benchmarking (upload a database export or use the built-in dataset) and select it here.",
          },
          { status: 400 }
        );
      }
      const set = await prisma.benchmarkingSet.findFirst({
        where: { id: benchmarkingSetId, firmId: s.firmId },
        include: { comparables: true },
      });
      if (!set) {
        return NextResponse.json(
          { error: "Benchmarking set not found" },
          { status: 404 }
        );
      }
      const accepted = set.comparables.filter((c) => c.accepted);
      const margins = accepted
        .map((c) => c.wavgMargin)
        .filter((m): m is number => m !== null);
      const range = computeAlpRange(margins);
      benchmarkingCtx = {
        setName: set.name,
        sourceDb: set.sourceDb,
        pli: set.pli,
        testedParty: set.testedParty,
        testedMargin: set.testedMargin,
        rptThreshold: set.rptThreshold,
        searchSteps: set.searchSteps ? JSON.parse(set.searchSteps) : [],
        comparables: set.comparables.map((c) => ({
          name: c.name,
          businessDesc: c.businessDesc,
          fyLabels: c.fyLabels ? JSON.parse(c.fyLabels) : [],
          margins: c.margins ? JSON.parse(c.margins) : [],
          wavgMargin: c.wavgMargin,
          rptPct: c.rptPct,
          accepted: c.accepted,
          rejectReason: c.rejectReason,
        })),
        range,
      };
    }

    const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

    let content: string;

    if (hasApiKey) {
      const { generateFullDocument, assembleDocument } = await import("@/lib/llm");

      const entities = await prisma.entity.findMany({
        where: { clientId },
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

      let analysis = null;
      if (analysisId) {
        analysis = await prisma.functionalAnalysis.findUnique({
          where: { id: analysisId },
        });
      }

      const pastReports = await prisma.document.findMany({
        where: {
          clientId,
          status: "final",
          type,
          content: { not: null },
        },
        orderBy: { updatedAt: "desc" },
        take: 2,
        select: { content: true },
      });

      const pastExcerpts = pastReports
        .map((r) => r.content?.substring(0, 1500))
        .filter(Boolean) as string[];

      const firm = await prisma.firm.findUnique({
        where: { id: s.firmId },
        select: { name: true },
      });

      const ctx: GenerationContext = {
        clientName: client.name,
        industry: client.industry,
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
        analysis: analysis
          ? {
              id: analysis.id,
              summary: analysis.summary,
              functions: analysis.functions,
              risks: analysis.risks,
              assets: analysis.assets,
              pricingMethod: analysis.pricingMethod,
            }
          : null,
        pastReportExcerpts: pastExcerpts.length > 0 ? pastExcerpts : undefined,
        firmName: firm?.name || undefined,
        benchmarking: benchmarkingCtx,
      };

      const sections = await generateFullDocument(type, ctx);
      content = assembleDocument(
        sections,
        type,
        client.name,
        financialYear || "2025-26"
      );
    } else {
      content = generateStaticContent(
        type,
        client.name,
        financialYear || "2025-26"
      );
    }

    const document = await prisma.document.create({
      data: {
        name,
        type,
        status: "draft",
        content,
        clientId,
        analysisId: analysisId || null,
        benchmarkingSetId: benchmarkingSetId || null,
        financialYear: financialYear || "2025-26",
      },
      include: {
        client: {
          select: { id: true, name: true },
        },
        analysis: {
          select: { id: true, status: true },
        },
      },
    });

    return NextResponse.json(
      { ...document, generatedWithAI: hasApiKey },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating document:", error);
    return NextResponse.json(
      { error: "Failed to create document" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Static template fallback (used when no API key is set)
// ---------------------------------------------------------------------------
function generateStaticContent(
  type: string,
  clientName: string,
  financialYear: string
): string {
  return `${type.toUpperCase().replace(/-/g, " ")}
=======================================
Client: ${clientName}
Financial Year: ${financialYear}

NOTE: This is a static placeholder. Configure ANTHROPIC_API_KEY on the server to enable AI-assisted drafting grounded in your entity, transaction, and benchmarking data.`;
}
