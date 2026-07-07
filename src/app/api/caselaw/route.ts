import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFirmSession } from "@/lib/session";

export async function GET(request: Request) {
  const s = await getFirmSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const tag = searchParams.get("tag")?.trim();
  const method = searchParams.get("method")?.trim();

  const cases = await prisma.caseLaw.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { name: { contains: q } },
                { holding: { contains: q } },
                { issueTags: { contains: q } },
                { citation: { contains: q } },
              ],
            }
          : {},
        tag ? { issueTags: { contains: tag } } : {},
        method ? { method: { contains: method } } : {},
      ],
    },
    orderBy: [{ year: "desc" }],
    take: 100,
  });

  return NextResponse.json(cases);
}
