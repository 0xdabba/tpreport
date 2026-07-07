import { NextResponse } from "next/server";
import { getFirmSession, isPartner } from "@/lib/session";
import { createPlanCheckout } from "@/lib/billing";
import { PLANS, type PlanId } from "@/lib/plans";

export async function POST(request: Request) {
  const s = await getFirmSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isPartner(s.firmRole)) {
    return NextResponse.json({ error: "Only partners can manage billing" }, { status: 403 });
  }

  const { plan } = await request.json();
  if (!plan || plan === "TRIAL" || !(plan in PLANS)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  try {
    const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const result = await createPlanCheckout(s.firmId, plan as Exclude<PlanId, "TRIAL">, appUrl);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json({ error: "Could not create checkout" }, { status: 500 });
  }
}
