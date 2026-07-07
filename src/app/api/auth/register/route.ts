import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { TRIAL_DAYS } from "@/lib/plans";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, firm, phone, inviteToken } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Invited user → join the inviting firm with the invited role
    if (inviteToken) {
      const invite = await prisma.invite.findUnique({
        where: { token: inviteToken },
        include: { firm: { select: { id: true, name: true } } },
      });
      if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
        return NextResponse.json(
          { error: "This invite link is invalid or has expired" },
          { status: 400 }
        );
      }
      if (invite.email.toLowerCase() !== String(email).toLowerCase()) {
        return NextResponse.json(
          { error: `This invite was issued for ${invite.email}` },
          { status: 400 }
        );
      }
      const user = await prisma.$transaction(async (tx) => {
        const u = await tx.user.create({
          data: {
            name,
            email,
            password: hashedPassword,
            phone: phone || null,
            firmId: invite.firmId,
            firmRole: invite.firmRole,
          },
        });
        await tx.invite.update({
          where: { id: invite.id },
          data: { acceptedAt: new Date() },
        });
        return u;
      });
      return NextResponse.json(
        { user: { id: user.id, name: user.name, email: user.email, firm: invite.firm.name } },
        { status: 201 }
      );
    }

    // New firm signup — creator becomes PARTNER, firm starts on 14-day trial
    if (!firm) {
      return NextResponse.json(
        { error: "Firm name is required" },
        { status: 400 }
      );
    }

    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone: phone || null,
        firmRole: "PARTNER",
        firm: {
          create: {
            name: firm,
            plan: "TRIAL",
            planExpiresAt: trialEnd,
          },
        },
      },
    });

    return NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          firm,
          createdAt: user.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Something went wrong during registration" },
      { status: 500 }
    );
  }
}
