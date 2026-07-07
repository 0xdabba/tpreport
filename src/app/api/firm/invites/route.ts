import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFirmSession, isPartner } from "@/lib/session";
import { getPlan } from "@/lib/plans";
import { randomToken } from "@/lib/tokens";
import { sendMail, layoutEmail } from "@/lib/email";

export async function POST(request: Request) {
  const s = await getFirmSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isPartner(s.firmRole)) {
    return NextResponse.json({ error: "Only partners can invite members" }, { status: 403 });
  }

  const { email, firmRole } = await request.json();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }
  const role = ["PARTNER", "MANAGER", "STAFF"].includes(firmRole) ? firmRole : "STAFF";

  const firm = await prisma.firm.findUnique({
    where: { id: s.firmId },
    include: { _count: { select: { users: true, invites: { where: { acceptedAt: null } } } } },
  });
  if (!firm) return NextResponse.json({ error: "Firm not found" }, { status: 404 });

  const limits = getPlan(firm.plan);
  if (firm._count.users + firm._count.invites >= limits.maxSeats) {
    return NextResponse.json(
      { error: `Your ${limits.label} plan allows ${limits.maxSeats} seats. Upgrade to add more.` },
      { status: 403 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
  }

  const token = randomToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 14);

  const invite = await prisma.invite.create({
    data: { email, firmRole: role, token, firmId: s.firmId, expiresAt },
  });

  const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const link = `${appUrl}/register?invite=${token}`;
  await sendMail({
    to: email,
    subject: `You've been invited to ${firm.name} on TP Report`,
    html: layoutEmail(
      `Join ${firm.name}`,
      `<p>${s.name || "A partner"} has invited you to join <b>${firm.name}</b> on TP Report as ${role.toLowerCase()}.</p>
       <p><a href="${link}" style="background:#C2410C;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Accept invitation</a></p>
       <p style="color:#666;font-size:13px">Or open: ${link}<br/>This link expires in 14 days.</p>`,
      firm.name
    ),
    text: `Join ${firm.name} on TP Report: ${link}`,
  });

  return NextResponse.json({ id: invite.id, email, firmRole: role, link }, { status: 201 });
}

export async function DELETE(request: Request) {
  const s = await getFirmSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isPartner(s.firmRole)) {
    return NextResponse.json({ error: "Only partners can revoke invites" }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.invite.deleteMany({ where: { id, firmId: s.firmId } });
  return NextResponse.json({ ok: true });
}
