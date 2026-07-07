import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFirmSession } from "@/lib/session";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const s = await getFirmSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { body, sectionId } = await request.json();
  if (!body?.trim()) return NextResponse.json({ error: "Comment body required" }, { status: 400 });

  const doc = await prisma.document.findFirst({
    where: { id, client: { firmId: s.firmId } },
    select: { id: true },
  });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const comment = await prisma.docComment.create({
    data: { documentId: id, userId: s.userId, body: body.trim(), sectionId: sectionId || null },
    include: { user: { select: { id: true, name: true } } },
  });
  return NextResponse.json(comment, { status: 201 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getFirmSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { commentId, resolved } = await request.json();

  const comment = await prisma.docComment.findFirst({
    where: { id: commentId, documentId: id, document: { client: { firmId: s.firmId } } },
  });
  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.docComment.update({
    where: { id: commentId },
    data: { resolvedAt: resolved ? new Date() : null },
  });
  return NextResponse.json(updated);
}
