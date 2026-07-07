import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFirmSession } from "@/lib/session";
import { computeAlpRange } from "@/lib/benchmarking";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const s = await getFirmSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const set = await prisma.benchmarkingSet.findFirst({
    where: { id, firmId: s.firmId },
    include: {
      client: { select: { id: true, name: true } },
      comparables: { orderBy: { name: "asc" } },
    },
  });
  if (!set) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const margins = set.comparables
    .filter((c) => c.accepted)
    .map((c) => c.wavgMargin)
    .filter((m): m is number => m !== null);

  return NextResponse.json({ ...set, range: computeAlpRange(margins) });
}

/**
 * PATCH — manual accept/reject overrides (the CA is always the final screen),
 * tested-party updates, finalize.
 * { comparableId, accepted, rejectReason? } | { testedParty?, testedMargin?, status? }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const s = await getFirmSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const set = await prisma.benchmarkingSet.findFirst({ where: { id, firmId: s.firmId } });
  if (!set) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();

  if (body.comparableId) {
    const comp = await prisma.comparableCompany.findFirst({
      where: { id: body.comparableId, setId: id },
    });
    if (!comp) return NextResponse.json({ error: "Comparable not found" }, { status: 404 });
    await prisma.comparableCompany.update({
      where: { id: body.comparableId },
      data: {
        accepted: !!body.accepted,
        rejectReason: body.accepted ? null : body.rejectReason || "Rejected on qualitative screening by reviewer",
        screenNote: body.screenNote ?? comp.screenNote,
      },
    });
  }

  const data: Record<string, unknown> = {};
  if (body.testedParty !== undefined) data.testedParty = body.testedParty || null;
  if (body.testedMargin !== undefined)
    data.testedMargin = body.testedMargin === null || body.testedMargin === "" ? null : Number(body.testedMargin);
  if (body.status && ["draft", "screened", "final"].includes(body.status)) data.status = body.status;
  if (Object.keys(data).length > 0) {
    await prisma.benchmarkingSet.update({ where: { id }, data });
  }

  const updated = await prisma.benchmarkingSet.findUnique({
    where: { id },
    include: { comparables: { orderBy: { name: "asc" } }, client: { select: { id: true, name: true } } },
  });
  const margins = updated!.comparables
    .filter((c) => c.accepted)
    .map((c) => c.wavgMargin)
    .filter((m): m is number => m !== null);

  return NextResponse.json({ ...updated, range: computeAlpRange(margins) });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const s = await getFirmSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const set = await prisma.benchmarkingSet.findFirst({ where: { id, firmId: s.firmId } });
  if (!set) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.benchmarkingSet.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
