import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/tokens";

/** PUBLIC — resolve a portal token to client + final deliverables + deadlines. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const record = await prisma.portalToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      client: {
        include: {
          firm: {
            select: {
              name: true,
              email: true,
              phone: true,
              city: true,
              brandColor: true,
              logoText: true,
            },
          },
          documents: {
            where: { status: "final" },
            select: { id: true, name: true, type: true, financialYear: true, updatedAt: true },
            orderBy: { updatedAt: "desc" },
          },
          deadlines: {
            orderBy: { dueDate: "asc" },
            select: { id: true, label: true, dueDate: true, status: true, financialYear: true },
          },
        },
      },
    },
  });

  if (!record || record.revokedAt) {
    return NextResponse.json({ error: "This link is invalid or has been revoked" }, { status: 404 });
  }

  const c = record.client;
  return NextResponse.json({
    firm: c.firm,
    client: { name: c.name, industry: c.industry },
    documents: c.documents,
    deadlines: c.deadlines,
  });
}
