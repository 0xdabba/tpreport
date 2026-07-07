import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendMail, layoutEmail } from "@/lib/email";
import { REMINDER_OFFSETS, daysUntil } from "@/lib/compliance";

/**
 * Reminder dispatcher. Called by the in-process scheduler (instrumentation.ts)
 * and available for an external cron. Secured by CRON_SECRET when set.
 *
 * For every upcoming deadline, when daysUntil crosses 30/7/1, email every
 * partner+manager of the owning firm once per offset (ReminderLog dedupes).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const horizon = new Date(now.getTime() + 31 * 86400000);

  const deadlines = await prisma.deadline.findMany({
    where: {
      status: "upcoming",
      dueDate: { gte: now, lte: horizon },
    },
    include: {
      client: {
        select: {
          name: true,
          firmId: true,
          firm: { select: { name: true } },
        },
      },
    },
  });

  let sent = 0;
  for (const d of deadlines) {
    const days = daysUntil(d.dueDate, now);
    const offset = REMINDER_OFFSETS.find((o) => days <= o);
    if (offset === undefined) continue;

    const recipients = await prisma.user.findMany({
      where: {
        firmId: d.client.firmId,
        firmRole: { in: ["PARTNER", "MANAGER"] },
      },
      select: { email: true },
    });

    for (const r of recipients) {
      const already = await prisma.reminderLog.findUnique({
        where: {
          deadlineId_offsetDays_sentTo: {
            deadlineId: d.id,
            offsetDays: offset,
            sentTo: r.email,
          },
        },
      });
      if (already) continue;

      const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const ok = await sendMail({
        to: r.email,
        subject: `[${days}d] ${d.label} — ${d.client.name}`,
        html: layoutEmail(
          `Deadline in ${days} day${days === 1 ? "" : "s"}`,
          `<p><b>${d.label}</b> for <b>${d.client.name}</b> (FY ${d.financialYear}) is due on <b>${d.dueDate.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</b>.</p>
           <p><a href="${appUrl}/dashboard/compliance">Open compliance dashboard</a></p>`,
          d.client.firm.name
        ),
        text: `${d.label} for ${d.client.name} due ${d.dueDate.toDateString()}`,
      });
      if (ok.ok) {
        await prisma.reminderLog.create({
          data: { deadlineId: d.id, offsetDays: offset, sentTo: r.email },
        });
        sent++;
      }
    }
  }

  // Flip overdue
  const overdue = await prisma.deadline.updateMany({
    where: { status: "upcoming", dueDate: { lt: now } },
    data: { status: "overdue" },
  });

  return NextResponse.json({ ok: true, remindersSent: sent, markedOverdue: overdue.count });
}
