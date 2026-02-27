import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;

    const entities = await prisma.entity.findMany({
      where: {
        client: { userId },
      },
      include: {
        client: {
          select: { id: true, name: true },
        },
        parent: {
          select: { id: true, name: true },
        },
        children: {
          select: { id: true, name: true, country: true, entityType: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(entities);
  } catch (error) {
    console.error("Error fetching entities:", error);
    return NextResponse.json(
      { error: "Failed to fetch entities" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const body = await request.json();
    const {
      name,
      country,
      entityType,
      role,
      functions,
      risks,
      assets,
      revenue,
      expenses,
      employees,
      parentId,
      clientId,
    } = body;

    if (!name || !country || !entityType || !clientId) {
      return NextResponse.json(
        { error: "Name, country, entity type, and client are required" },
        { status: 400 }
      );
    }

    // Verify the client belongs to the user
    const client = await prisma.client.findFirst({
      where: { id: clientId, userId },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Client not found or unauthorized" },
        { status: 404 }
      );
    }

    // Verify parent entity if provided
    if (parentId) {
      const parent = await prisma.entity.findFirst({
        where: { id: parentId, clientId },
      });
      if (!parent) {
        return NextResponse.json(
          { error: "Parent entity not found" },
          { status: 404 }
        );
      }
    }

    const entity = await prisma.entity.create({
      data: {
        name,
        country,
        entityType,
        role: role || null,
        functions: functions || null,
        risks: risks || null,
        assets: assets || null,
        revenue: revenue ? parseFloat(revenue) : null,
        expenses: expenses ? parseFloat(expenses) : null,
        employees: employees ? parseInt(employees) : null,
        clientId,
        parentId: parentId || null,
      },
      include: {
        client: {
          select: { id: true, name: true },
        },
        parent: {
          select: { id: true, name: true },
        },
        children: {
          select: { id: true, name: true, country: true, entityType: true },
        },
      },
    });

    return NextResponse.json(entity, { status: 201 });
  } catch (error) {
    console.error("Error creating entity:", error);
    return NextResponse.json(
      { error: "Failed to create entity" },
      { status: 500 }
    );
  }
}
