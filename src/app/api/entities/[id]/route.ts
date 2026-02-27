import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const { id } = await params;

    const entity = await prisma.entity.findFirst({
      where: {
        id,
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
        transactionsFrom: true,
        transactionsTo: true,
      },
    });

    if (!entity) {
      return NextResponse.json(
        { error: "Entity not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(entity);
  } catch (error) {
    console.error("Error fetching entity:", error);
    return NextResponse.json(
      { error: "Failed to fetch entity" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const { id } = await params;
    const body = await request.json();

    // Verify entity belongs to user's client
    const existing = await prisma.entity.findFirst({
      where: {
        id,
        client: { userId },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Entity not found or unauthorized" },
        { status: 404 }
      );
    }

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
    } = body;

    const entity = await prisma.entity.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(country !== undefined && { country }),
        ...(entityType !== undefined && { entityType }),
        ...(role !== undefined && { role: role || null }),
        ...(functions !== undefined && { functions: functions || null }),
        ...(risks !== undefined && { risks: risks || null }),
        ...(assets !== undefined && { assets: assets || null }),
        ...(revenue !== undefined && {
          revenue: revenue ? parseFloat(revenue) : null,
        }),
        ...(expenses !== undefined && {
          expenses: expenses ? parseFloat(expenses) : null,
        }),
        ...(employees !== undefined && {
          employees: employees ? parseInt(employees) : null,
        }),
        ...(parentId !== undefined && { parentId: parentId || null }),
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

    return NextResponse.json(entity);
  } catch (error) {
    console.error("Error updating entity:", error);
    return NextResponse.json(
      { error: "Failed to update entity" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const { id } = await params;

    // Verify entity belongs to user's client
    const existing = await prisma.entity.findFirst({
      where: {
        id,
        client: { userId },
      },
      include: {
        children: { select: { id: true } },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Entity not found or unauthorized" },
        { status: 404 }
      );
    }

    if (existing.children.length > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete entity with child entities. Remove children first.",
        },
        { status: 400 }
      );
    }

    await prisma.entity.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Entity deleted successfully" });
  } catch (error) {
    console.error("Error deleting entity:", error);
    return NextResponse.json(
      { error: "Failed to delete entity" },
      { status: 500 }
    );
  }
}
