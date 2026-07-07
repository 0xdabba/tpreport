import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkSafeHarbour, SAFE_HARBOUR_DISCLAIMER, type SafeHarbourInput } from "@/lib/safe-harbour";

/**
 * PUBLIC endpoint powering the free safe-harbour checker (lead magnet).
 * Email is optional but gates the full breakdown; every submission with an
 * email becomes a Lead.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { category, transactionValue, operatingMargin, employeeCostRatio, email, name, phone } = body;

    if (!category || !transactionValue) {
      return NextResponse.json(
        { error: "category and transactionValue are required" },
        { status: 400 }
      );
    }

    const input: SafeHarbourInput = {
      category,
      transactionValue: Number(transactionValue),
      operatingMargin: operatingMargin === undefined || operatingMargin === null || operatingMargin === "" ? null : Number(operatingMargin),
      employeeCostRatio: employeeCostRatio === undefined || employeeCostRatio === null || employeeCostRatio === "" ? null : Number(employeeCostRatio),
    };

    const result = checkSafeHarbour(input);

    if (email && /^\S+@\S+\.\S+$/.test(email)) {
      await prisma.lead.create({
        data: {
          email,
          name: name || null,
          phone: phone || null,
          source: "safe-harbour-checker",
          payload: JSON.stringify({ input, result }),
        },
      });
    }

    return NextResponse.json({ result, disclaimer: SAFE_HARBOUR_DISCLAIMER });
  } catch (error) {
    console.error("Safe harbour check error:", error);
    return NextResponse.json({ error: "Check failed" }, { status: 500 });
  }
}
