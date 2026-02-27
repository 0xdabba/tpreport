import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { GenerationContext } from "@/lib/llm";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;

    const documents = await prisma.document.findMany({
      where: {
        client: { userId },
      },
      include: {
        client: {
          select: { id: true, name: true },
        },
        analysis: {
          select: { id: true, status: true },
        },
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
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const body = await request.json();
    const { name, type, clientId, analysisId, financialYear } = body;

    if (!name || !type || !clientId) {
      return NextResponse.json(
        { error: "Name, type, and client are required" },
        { status: 400 }
      );
    }

    const client = await prisma.client.findFirst({
      where: { id: clientId, userId },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Client not found or unauthorized" },
        { status: 404 }
      );
    }

    // Determine if LLM generation should be used
    const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

    let content: string;

    if (hasApiKey) {
      // Use LLM generation — pull real data from DB
      const { generateFullDocument, assembleDocument } =
        await import("@/lib/llm");

      // Fetch all entities for this client
      const entities = await prisma.entity.findMany({
        where: { clientId },
      });

      // Fetch transactions involving this client's entities
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

      // Fetch analysis if provided
      let analysis = null;
      if (analysisId) {
        analysis = await prisma.functionalAnalysis.findUnique({
          where: { id: analysisId },
        });
      }

      // Fetch past approved reports for this client (for RAG / style matching)
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

      // Fetch user's firm name
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { firm: true },
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
        firmName: user?.firm || undefined,
      };

      const sections = await generateFullDocument(type, ctx);
      content = assembleDocument(
        sections,
        type,
        client.name,
        financialYear || "2025-26"
      );
    } else {
      // Fallback to static templates when no API key is configured
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
  const templates: Record<string, string> = {
    "tp-study": `TRANSFER PRICING STUDY REPORT
=======================================
Client: ${clientName}
Financial Year: ${financialYear}
Date: ${new Date().toLocaleDateString("en-IN")}

NOTE: This is a static template. Configure your Anthropic API key in Settings to enable AI-powered report generation with real entity and transaction data.

1. EXECUTIVE SUMMARY
This Transfer Pricing Study Report has been prepared for ${clientName} in accordance with Sections 92 to 92F of the Income-tax Act, 1961 read with Rules 10A to 10THD.

2. INDUSTRY OVERVIEW
[AI generation will populate this based on client industry]

3. COMPANY OVERVIEW
[AI generation will populate this from entity data]

4. ASSOCIATED ENTERPRISES
[AI generation will list entities from your database]

5. INTERNATIONAL TRANSACTIONS
[AI generation will detail transactions you've entered]

6. FUNCTIONAL ANALYSIS
[AI generation will build FAR analysis from entity profiles]

7. ECONOMIC ANALYSIS
[AI generation will create benchmarking with comparable companies]

8. ARM'S LENGTH PRICE DETERMINATION
[AI generation will compute ALP range from benchmarking]

9. CONCLUSION
[AI generation will summarize findings]`,

    "local-file": `FORM 3CEB - LOCAL FILE
=======================================
Client: ${clientName} | FY: ${financialYear}
NOTE: Configure Anthropic API key for AI-powered generation.

Part A: Particulars — [Will be populated from client data]
Part B: International Transactions — [Will be populated from transaction data]
Part C: Specified Domestic Transactions — [If applicable]
Part D: Additional Information — [Will include comparables and FAR summary]
Certification — [CA details to be filled]`,

    "master-file": `MASTER FILE (Rule 10DA)
=======================================
Client: ${clientName} Group | FY: ${financialYear}
NOTE: Configure Anthropic API key for AI-powered generation.

Part A: Organisational Structure — [Will map entity hierarchy]
Part B: MNE Group Business — [Will describe group operations]
Part C: Intangibles — [Will analyse IP strategy]
Part D: Financial Activities — [Will describe intercompany financing]
Part E: Financial and Tax Positions — [Will reference consolidated statements]`,

    "agreement-services": `INTERCOMPANY SERVICE AGREEMENT
=======================================
Client: ${clientName} | FY: ${financialYear}
NOTE: Configure Anthropic API key for AI-powered generation.

[Full agreement will be drafted with specific service scope, compensation terms, and TP compliance clauses based on your transaction data]`,

    "agreement-licensing": `INTERCOMPANY LICENSE AGREEMENT
=======================================
Client: ${clientName} | FY: ${financialYear}
NOTE: Configure Anthropic API key for AI-powered generation.

[Full agreement will be drafted with license grant, royalty terms, and TP/withholding provisions based on your transaction data]`,

    "agreement-lending": `INTERCOMPANY LOAN AGREEMENT
=======================================
Client: ${clientName} | FY: ${financialYear}
NOTE: Configure Anthropic API key for AI-powered generation.

[Full agreement will be drafted with loan terms, interest benchmarking, thin capitalisation analysis, and TP compliance based on your transaction data]`,

    benchmarking: `BENCHMARKING REPORT
=======================================
Client: ${clientName} | FY: ${financialYear}
NOTE: Configure Anthropic API key for AI-powered generation.

[Full report will include tested party analysis, MAM selection, search process, AI-generated comparable set with realistic Indian companies, and ALP range computation]`,
  };

  return (
    templates[type] ||
    `Document: ${type}\nClient: ${clientName}\nFY: ${financialYear}\nConfigure API key for AI generation.`
  );
}
