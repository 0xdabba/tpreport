import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFirmSession } from "@/lib/session";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const s = await getFirmSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { status } = await request.json();
  if (!["upcoming", "done", "na"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const deadline = await prisma.deadline.findFirst({
    where: { id, client: { firmId: s.firmId } },
  });
  if (!deadline) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.deadline.update({
    where: { id },
    data: {
      status,
      completedAt: status === "done" ? new Date() : null,
    },
  });
  return NextResponse.json(updated);
}
