import { NextResponse } from "next/server";
import { markPaymentPaid, verifyRazorpaySignature } from "@/lib/billing";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") || "";

  const valid = await verifyRazorpaySignature(rawBody, signature);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    const event = JSON.parse(rawBody) as {
      event: string;
      payload?: {
        payment_link?: { entity?: { reference_id?: string; id?: string } };
        payment?: { entity?: { id?: string } };
      };
    };

    if (event.event === "payment_link.paid") {
      const referenceId = event.payload?.payment_link?.entity?.reference_id;
      const paymentId = event.payload?.payment?.entity?.id || event.payload?.payment_link?.entity?.id || "rzp";
      if (referenceId) {
        await markPaymentPaid(referenceId, paymentId);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Razorpay webhook error:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
