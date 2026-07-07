import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFirmSession } from "@/lib/session";
import { gateClientCount } from "@/lib/plans";
import type { ScreenedRow } from "@/lib/screener";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const s = await getFirmSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const run = await prisma.screenerRun.findFirst({ where: { id, firmId: s.firmId } });
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: run.id,
    fileName: run.fileName,
    createdAt: run.createdAt,
    rows: JSON.parse(run.rowsJson),
    summary: run.summary ? JSON.parse(run.summary) : null,
  });
}

/** POST { rowIndex } — convert a screened row into a Client record. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const s = await getFirmSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { rowIndex } = await request.json();

  const run = await prisma.screenerRun.findFirst({ where: { id, firmId: s.firmId } });
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = JSON.parse(run.rowsJson) as ScreenedRow[];
  const row = rows[rowIndex];
  if (!row) return NextResponse.json({ error: "Row not found" }, { status: 404 });

  const firm = await prisma.firm.findUnique({
    where: { id: s.firmId },
    include: { _count: { select: { clients: true } } },
  });
  const gateError = gateClientCount(firm!, firm!._count.clients);
  if (gateError) return NextResponse.json({ error: gateError }, { status: 403 });

  const existing = await prisma.client.findFirst({
    where: { firmId: s.firmId, name: row.name },
  });
  if (existing) {
    return NextResponse.json({ error: `Client "${row.name}" already exists`, clientId: existing.id }, { status: 409 });
  }

  const client = await prisma.client.create({
    data: {
      name: row.name,
      industry: row.industry || null,
      turnover: row.turnover ?? null,
      groupRevenue: row.groupRevenue ?? null,
      hasIntlTxn: row.hasForeignAE && (row.intlTxnValue || 0) > 0,
      hasSDT: (row.sdtValue || 0) > 200000000,
      description: `Imported from TP screener (${run.fileName || "upload"}). Flags: ${row.flags.join("; ")}`,
      firmId: s.firmId,
      userId: s.userId,
    },
  });

  return NextResponse.json({ client }, { status: 201 });
}
