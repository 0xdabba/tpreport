import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFirmSession } from "@/lib/session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const s = await getFirmSession();
    if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const document = await prisma.document.findFirst({
      where: { id, client: { firmId: s.firmId } },
      include: {
        client: true,
        analysis: {
          include: {
            transactions: {
              include: {
                fromEntity: { select: { name: true, country: true } },
                toEntity: { select: { name: true, country: true } },
              },
            },
          },
        },
        benchmarkingSet: { select: { id: true, name: true, sourceDb: true } },
        submittedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        comments: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error("Error fetching document:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const s = await getFirmSession();
    if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.document.findFirst({
      where: { id, client: { firmId: s.firmId } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Content edits are locked once a document is final
    if (existing.status === "final" && body.content !== undefined) {
      return NextResponse.json(
        { error: "Final documents are locked. Move it back to draft via the review flow to edit." },
        { status: 403 }
      );
    }

    const updated = await prisma.document.update({
      where: { id },
      data: {
        content: body.content ?? existing.content,
        name: body.name ?? existing.name,
      },
      include: {
        client: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating document:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const s = await getFirmSession();
    if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const existing = await prisma.document.findFirst({
      where: { id, client: { firmId: s.firmId } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.document.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
