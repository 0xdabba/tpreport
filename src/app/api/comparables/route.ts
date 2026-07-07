import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFirmSession, isPartner } from "@/lib/session";

/**
 * GET — search the built-in comparables dataset (Phase 3 MCA XBRL pipeline).
 * ?q=keyword&industry=&minRev=&maxRev= (revenues in ₹ crore)
 */
export async function GET(request: Request) {
  const s = await getFirmSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const industry = searchParams.get("industry")?.trim();
  const minRev = searchParams.get("minRev") ? Number(searchParams.get("minRev")) : null;
  const maxRev = searchParams.get("maxRev") ? Number(searchParams.get("maxRev")) : null;

  const companies = await prisma.companyFinancials.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { name: { contains: q } },
                { businessDesc: { contains: q } },
                { nicCode: { contains: q } },
              ],
            }
          : {},
        industry ? { industry: { contains: industry } } : {},
      ],
    },
    take: 200,
    orderBy: { name: "asc" },
  });

  // Revenue filter applied in JS (revenues stored as JSON arrays)
  const filtered = companies.filter((c) => {
    if (minRev === null && maxRev === null) return true;
    const revs = c.revenues ? (JSON.parse(c.revenues) as (number | null)[]) : [];
    const latest = [...revs].reverse().find((r) => r !== null);
    if (latest === null || latest === undefined) return false;
    if (minRev !== null && latest < minRev) return false;
    if (maxRev !== null && latest > maxRev) return false;
    return true;
  });

  const total = await prisma.companyFinancials.count();
  const demoCount = await prisma.companyFinancials.count({ where: { isDemo: true } });

  return NextResponse.json({
    companies: filtered,
    datasetInfo: {
      total,
      demoCount,
      note:
        demoCount > 0
          ? "Dataset includes DEMO records for evaluation. Load verified MCA XBRL data via scripts/ingest-xbrl.ts before using in filings."
          : null,
    },
  });
}

/**
 * POST — bulk import into the built-in dataset (partner only).
 * Body: { companies: [{ name, cin?, nicCode?, industry?, businessDesc?,
 *   fyLabels[], revenues[], opProfits[], margins?[], rptPct?, dataSource? }] }
 */
export async function POST(request: Request) {
  const s = await getFirmSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isPartner(s.firmRole)) {
    return NextResponse.json({ error: "Only partners can import dataset records" }, { status: 403 });
  }

  const { companies } = await request.json();
  if (!Array.isArray(companies) || companies.length === 0) {
    return NextResponse.json({ error: "companies[] required" }, { status: 400 });
  }
  if (companies.length > 5000) {
    return NextResponse.json({ error: "Max 5000 records per import" }, { status: 400 });
  }

  let imported = 0;
  for (const c of companies) {
    if (!c.name) continue;
    const margins =
      c.margins ||
      (Array.isArray(c.revenues) && Array.isArray(c.opProfits)
        ? c.revenues.map((rev: number | null, i: number) => {
            const op = c.opProfits[i];
            if (rev == null || op == null || rev === 0) return null;
            return Math.round((op / rev) * 10000) / 100;
          })
        : []);
    const data = {
      name: c.name,
      nicCode: c.nicCode || null,
      industry: c.industry || null,
      businessDesc: c.businessDesc || null,
      fyLabels: JSON.stringify(c.fyLabels || []),
      revenues: JSON.stringify(c.revenues || []),
      opProfits: JSON.stringify(c.opProfits || []),
      margins: JSON.stringify(margins),
      rptPct: c.rptPct ?? null,
      dataSource: c.dataSource || "MANUAL",
      sourceAsOf: c.sourceAsOf ? new Date(c.sourceAsOf) : new Date(),
      isDemo: !!c.isDemo,
    };
    if (c.cin) {
      await prisma.companyFinancials.upsert({
        where: { cin: c.cin },
        create: { ...data, cin: c.cin },
        update: data,
      });
    } else {
      await prisma.companyFinancials.create({ data });
    }
    imported++;
  }

  return NextResponse.json({ imported }, { status: 201 });
}
