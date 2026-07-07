import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFirmSession } from "@/lib/session";
import { gateFeature } from "@/lib/plans";
import {
  parseComparablesXlsx,
  screenComparables,
  buildSearchFunnel,
  computeAlpRange,
  type RawComparable,
} from "@/lib/benchmarking";

export async function GET() {
  const s = await getFirmSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sets = await prisma.benchmarkingSet.findMany({
    where: { firmId: s.firmId },
    include: {
      client: { select: { id: true, name: true } },
      _count: { select: { comparables: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(sets);
}

/**
 * Create a benchmarking set.
 * multipart/form-data: file (xlsx from Capitaline/Ace/Prowess) + params
 * OR application/json: { source: "builtin", companyIds: [...] , ...params }
 */
export async function POST(request: Request) {
  const s = await getFirmSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const firm = await prisma.firm.findUnique({ where: { id: s.firmId } });
  if (!firm) return NextResponse.json({ error: "Firm not found" }, { status: 404 });
  const gateError = gateFeature(firm, "benchmarking");
  if (gateError) return NextResponse.json({ error: gateError }, { status: 403 });

  const contentType = request.headers.get("content-type") || "";

  let raw: RawComparable[] = [];
  let warnings: string[] = [];
  let name = "";
  let clientId = "";
  let financialYear = "";
  let pli: "OP/TC" | "OP/OR" = "OP/TC";
  let rptThreshold = 25;
  let turnoverMin: number | null = null;
  let turnoverMax: number | null = null;
  let testedParty = "";
  let testedMargin: number | null = null;
  let sourceDb = "manual";
  let sourceFile: string | null = null;

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "File is required" }, { status: 400 });
    sourceFile = file.name;
    sourceDb = String(form.get("sourceDb") || "capitaline");
    name = String(form.get("name") || file.name.replace(/\.[^.]+$/, ""));
    clientId = String(form.get("clientId") || "");
    financialYear = String(form.get("financialYear") || "2025-26");
    pli = (String(form.get("pli")) === "OP/OR" ? "OP/OR" : "OP/TC") as "OP/TC" | "OP/OR";
    rptThreshold = Number(form.get("rptThreshold")) || 25;
    turnoverMin = form.get("turnoverMin") ? Number(form.get("turnoverMin")) : null;
    turnoverMax = form.get("turnoverMax") ? Number(form.get("turnoverMax")) : null;
    testedParty = String(form.get("testedParty") || "");
    testedMargin = form.get("testedMargin") ? Number(form.get("testedMargin")) : null;

    const buf = Buffer.from(await file.arrayBuffer());
    const parsed = parseComparablesXlsx(buf);
    raw = parsed.comparables;
    warnings = parsed.warnings;
    if (raw.length === 0) {
      return NextResponse.json(
        { error: "No comparables parsed from the file", warnings },
        { status: 400 }
      );
    }
  } else {
    const body = await request.json();
    if (body.source !== "builtin" || !Array.isArray(body.companyIds)) {
      return NextResponse.json(
        { error: "JSON creation requires source=builtin and companyIds[]" },
        { status: 400 }
      );
    }
    const companies = await prisma.companyFinancials.findMany({
      where: { id: { in: body.companyIds } },
    });
    raw = companies.map((c) => ({
      name: c.name,
      cin: c.cin || undefined,
      businessDesc: c.businessDesc || undefined,
      fyLabels: c.fyLabels ? JSON.parse(c.fyLabels) : [],
      revenues: c.revenues ? JSON.parse(c.revenues) : [],
      opProfits: c.opProfits ? JSON.parse(c.opProfits) : [],
      margins: c.margins ? JSON.parse(c.margins) : [],
      rptPct: c.rptPct,
    }));
    if (companies.some((c) => c.isDemo)) {
      warnings.push(
        "Set includes DEMO dataset companies — replace with verified data before using in a filing."
      );
    }
    sourceDb = "builtin";
    name = body.name || "Built-in dataset search";
    clientId = body.clientId || "";
    financialYear = body.financialYear || "2025-26";
    pli = body.pli === "OP/OR" ? "OP/OR" : "OP/TC";
    rptThreshold = body.rptThreshold || 25;
    turnoverMin = body.turnoverMin ?? null;
    turnoverMax = body.turnoverMax ?? null;
    testedParty = body.testedParty || "";
    testedMargin = body.testedMargin ?? null;
  }

  if (!clientId) return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  const client = await prisma.client.findFirst({ where: { id: clientId, firmId: s.firmId } });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const screened = screenComparables(raw, { pli, rptThreshold, turnoverMin, turnoverMax });
  const funnel = buildSearchFunnel(raw.length, screened);
  const acceptedMargins = screened
    .filter((c) => c.accepted)
    .map((c) => c.wavgMargin)
    .filter((m): m is number => m !== null);
  const range = computeAlpRange(acceptedMargins);

  const set = await prisma.benchmarkingSet.create({
    data: {
      name,
      firmId: s.firmId,
      clientId,
      financialYear,
      testedParty: testedParty || null,
      testedMargin,
      pli,
      sourceDb,
      sourceFile,
      searchSteps: JSON.stringify(funnel),
      turnoverMin,
      turnoverMax,
      rptThreshold,
      status: "screened",
      comparables: {
        create: screened.map((c) => ({
          name: c.name,
          cin: c.cin || null,
          businessDesc: c.businessDesc || null,
          fyLabels: JSON.stringify(c.fyLabels),
          revenues: JSON.stringify(c.revenues),
          opProfits: JSON.stringify(c.opProfits),
          margins: JSON.stringify(c.margins),
          wavgMargin: c.wavgMargin,
          rptPct: c.rptPct ?? null,
          accepted: c.accepted,
          rejectReason: c.rejectReason,
        })),
      },
    },
    include: { _count: { select: { comparables: true } } },
  });

  return NextResponse.json({ set, range, warnings }, { status: 201 });
}
