/**
 * Billing provider — Razorpay Payment Links when RAZORPAY_KEY_ID/SECRET are
 * set, otherwise a MOCK provider that marks payments paid immediately (dev &
 * demo). Same pattern as ArbiHub.
 */

import { prisma } from "@/lib/db";
import { PLANS, PlanId } from "@/lib/plans";

const RZP_ID = process.env.RAZORPAY_KEY_ID;
const RZP_SECRET = process.env.RAZORPAY_KEY_SECRET;

export function billingProvider(): "RAZORPAY" | "MOCK" {
  return RZP_ID && RZP_SECRET ? "RAZORPAY" : "MOCK";
}

export async function createPlanCheckout(
  firmId: string,
  plan: Exclude<PlanId, "TRIAL">,
  appUrl: string
): Promise<{ paymentId: string; shortUrl: string | null; mockPaid: boolean }> {
  const planDef = PLANS[plan];
  const amount = planDef.priceINR;

  const payment = await prisma.payment.create({
    data: {
      firmId,
      plan,
      amount,
      provider: billingProvider(),
      status: "created",
    },
  });

  if (billingProvider() === "MOCK") {
    await markPaymentPaid(payment.id, "mock_" + payment.id);
    return { paymentId: payment.id, shortUrl: null, mockPaid: true };
  }

  const auth = Buffer.from(`${RZP_ID}:${RZP_SECRET}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/payment_links", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: Math.round(amount * 100),
      currency: "INR",
      description: `TP Report — ${planDef.label} plan (annual)`,
      reference_id: payment.id,
      callback_url: `${appUrl}/dashboard/settings?tab=billing&paid=1`,
      callback_method: "get",
      notes: { firmId, plan },
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "failed" },
    });
    throw new Error(`Razorpay payment link failed: ${res.status} ${errText}`);
  }
  const link = (await res.json()) as { id: string; short_url: string };
  await prisma.payment.update({
    where: { id: payment.id },
    data: { providerRef: link.id },
  });
  return { paymentId: payment.id, shortUrl: link.short_url, mockPaid: false };
}

export async function markPaymentPaid(paymentId: string, providerRef: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.status === "paid") return;

  const periodStart = new Date();
  const periodEnd = new Date(periodStart);
  periodEnd.setFullYear(periodEnd.getFullYear() + 1);

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: paymentId },
      data: { status: "paid", providerRef, periodStart, periodEnd },
    }),
    prisma.firm.update({
      where: { id: payment.firmId },
      data: { plan: payment.plan, planExpiresAt: periodEnd },
    }),
  ]);
}

/** Verify Razorpay webhook signature (HMAC SHA256 of raw body). */
export async function verifyRazorpaySignature(
  rawBody: string,
  signature: string
): Promise<boolean> {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const crypto = await import("crypto");
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
