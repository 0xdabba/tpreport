import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFirmSession } from "@/lib/session";
import { gateFeature } from "@/lib/plans";
import { parseScreenerXlsx, screenRow, summarize } from "@/lib/screener";

export async function GET() {
  const s = await getFirmSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const runs = await prisma.screenerRun.findMany({
    where: { firmId: s.firmId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json(
    runs.map((r) => ({
      id: r.id,
      fileName: r.fileName,
      createdAt: r.createdAt,
      summary: r.summary ? JSON.parse(r.summary) : null,
    }))
  );
}

export async function POST(request: Request) {
  const s = await getFirmSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const firm = await prisma.firm.findUnique({ where: { id: s.firmId } });
  if (!firm) return NextResponse.json({ error: "Firm not found" }, { status: 404 });
  const gateError = gateFeature(firm, "screener");
  if (gateError) return NextResponse.json({ error: gateError }, { status: 403 });

  const form = await request.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "File is required" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const { rows, warnings } = parseScreenerXlsx(buf);
  if (rows.length === 0) {
    return NextResponse.json({ error: "No client rows parsed", warnings }, { status: 400 });
  }

  const screened = rows.map(screenRow);
  const summary = summarize(screened);

  const run = await prisma.screenerRun.create({
    data: {
      firmId: s.firmId,
      fileName: file.name,
      rowsJson: JSON.stringify(screened),
      summary: JSON.stringify(summary),
    },
  });

  return NextResponse.json({ id: run.id, rows: screened, summary, warnings }, { status: 201 });
}
