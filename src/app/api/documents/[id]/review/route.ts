import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFirmSession, canApprove } from "@/lib/session";
import { sendMail, layoutEmail } from "@/lib/email";

/**
 * Review workflow transitions:
 *   draft      --submit-->          in_review   (anyone)
 *   in_review  --approve-->         approved    (PARTNER/MANAGER)
 *   in_review  --request_changes--> draft       (PARTNER/MANAGER)
 *   approved   --finalize-->        final       (PARTNER)
 *   final/approved --reopen-->      draft       (PARTNER)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const s = await getFirmSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { action, comment } = await request.json();

  const doc = await prisma.document.findFirst({
    where: { id, client: { firmId: s.firmId } },
    include: { client: { select: { name: true, firmId: true } } },
  });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const fail = (msg: string, status = 400) =>
    NextResponse.json({ error: msg }, { status });

  let data: Record<string, unknown> = {};

  switch (action) {
    case "submit": {
      if (doc.status !== "draft") return fail("Only draft documents can be submitted for review");
      data = { status: "in_review", submittedById: s.userId, submittedAt: new Date() };
      break;
    }
    case "approve": {
      if (doc.status !== "in_review") return fail("Document is not in review");
      if (!canApprove(s.firmRole)) return fail("Only partners/managers can approve", 403);
      data = { status: "approved", approvedById: s.userId, approvedAt: new Date() };
      break;
    }
    case "request_changes": {
      if (doc.status !== "in_review") return fail("Document is not in review");
      if (!canApprove(s.firmRole)) return fail("Only partners/managers can review", 403);
      data = { status: "draft", submittedById: null, submittedAt: null };
      break;
    }
    case "finalize": {
      if (doc.status !== "approved") return fail("Only approved documents can be finalised");
      if (s.firmRole !== "PARTNER") return fail("Only partners can finalise documents", 403);
      data = { status: "final" };
      break;
    }
    case "reopen": {
      if (!["approved", "final"].includes(doc.status)) return fail("Document is not approved/final");
      if (s.firmRole !== "PARTNER") return fail("Only partners can reopen documents", 403);
      data = { status: "draft", approvedById: null, approvedAt: null, submittedById: null, submittedAt: null };
      break;
    }
    default:
      return fail("Unknown action");
  }

  const updated = await prisma.document.update({ where: { id }, data });

  if (comment) {
    await prisma.docComment.create({
      data: { documentId: id, userId: s.userId, body: comment },
    });
  }

  // Notify reviewers on submission
  if (action === "submit") {
    const reviewers = await prisma.user.findMany({
      where: { firmId: s.firmId, firmRole: { in: ["PARTNER", "MANAGER"] } },
      select: { email: true, name: true },
    });
    const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    await Promise.all(
      reviewers.map((r) =>
        sendMail({
          to: r.email,
          subject: `Review requested: ${doc.name} (${doc.client.name})`,
          html: layoutEmail(
            "Document ready for review",
            `<p>${s.name || "A team member"} submitted <b>${doc.name}</b> for ${doc.client.name} for review.</p>
             <p><a href="${appUrl}/dashboard/documents/${id}">Open document</a></p>`
          ),
          text: `${doc.name} submitted for review: ${appUrl}/dashboard/documents/${id}`,
        })
      )
    );
  }

  return NextResponse.json(updated);
}
