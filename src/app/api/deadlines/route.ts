import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFirmSession } from "@/lib/session";
import { computeDeadlines, currentFinancialYear, daysUntil } from "@/lib/compliance";

export async function GET() {
  const s = await getFirmSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const deadlines = await prisma.deadline.findMany({
    where: { client: { firmId: s.firmId } },
    include: { client: { select: { id: true, name: true } } },
    orderBy: { dueDate: "asc" },
  });

  const now = new Date();
  const enriched = deadlines.map((d) => ({
    ...d,
    daysUntil: daysUntil(d.dueDate, now),
    overdue: d.status === "upcoming" && d.dueDate < now,
  }));

  return NextResponse.json(enriched);
}

/**
 * Generate statutory deadlines for a client + FY from the client's facts.
 * POST { clientId, financialYear? }  — or { all: true } to generate for every
 * client of the firm for the current reporting FY.
 */
export async function POST(request: Request) {
  const s = await getFirmSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const fy = body.financialYear || currentFinancialYear();

  const clients = body.all
    ? await prisma.client.findMany({ where: { firmId: s.firmId }, include: clientInclude })
    : await prisma.client.findMany({
        where: { id: body.clientId, firmId: s.firmId },
        include: clientInclude,
      });

  if (clients.length === 0) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  let created = 0;
  for (const client of clients) {
    const intlTxnValue = client.entities
      .flatMap((e) => [...e.transactionsFrom, ...e.transactionsTo])
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const computed = computeDeadlines(
      {
        hasIntlTxn: client.hasIntlTxn,
        hasSDT: client.hasSDT,
        intlTxnValue,
        groupRevenue: client.groupRevenue,
        isConstituentOfIntlGroup: client.hasIntlTxn,
      },
      fy
    );

    for (const d of computed.filter((x) => x.applicable)) {
      await prisma.deadline.upsert({
        where: {
          clientId_kind_financialYear: {
            clientId: client.id,
            kind: d.kind,
            financialYear: fy,
          },
        },
        create: {
          clientId: client.id,
          kind: d.kind,
          label: d.label,
          financialYear: fy,
          dueDate: d.dueDate,
          status: "upcoming",
        },
        update: { label: d.label, dueDate: d.dueDate },
      });
      created++;
    }
  }

  return NextResponse.json({ ok: true, generated: created, financialYear: fy });
}

const clientInclude = {
  entities: {
    include: {
      transactionsFrom: { select: { amount: true } },
      transactionsTo: { select: { amount: true } },
    },
  },
} as const;
