/**
 * Email provider abstraction. Default: console (logs JSON, useful in dev and
 * as an outbox record). Set EMAIL_PROVIDER=resend + RESEND_API_KEY to send
 * real email. EMAIL_FROM controls the from address.
 */

export type Mail = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

const FROM = process.env.EMAIL_FROM || "TP Report <noreply@tpreport.local>";

export async function sendMail(mail: Mail): Promise<{ ok: boolean; id?: string }> {
  const provider = process.env.EMAIL_PROVIDER || "console";

  if (provider === "resend" && process.env.RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM,
          to: [mail.to],
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
        }),
      });
      if (!res.ok) {
        console.error("[email] resend error", res.status, await res.text());
        return { ok: false };
      }
      const data = (await res.json()) as { id?: string };
      return { ok: true, id: data.id };
    } catch (err) {
      console.error("[email] resend exception", err);
      return { ok: false };
    }
  }

  // Console provider — structured log so it can be grepped / tailed
  console.log(
    "[email:console]",
    JSON.stringify({ to: mail.to, subject: mail.subject, text: mail.text || mail.html.replace(/<[^>]+>/g, " ").slice(0, 500) })
  );
  return { ok: true, id: "console" };
}

export function layoutEmail(title: string, bodyHtml: string, firmName?: string): string {
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f7f5f2;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;padding:32px;border:1px solid #eee">
    <h2 style="color:#C2410C;margin-top:0">${title}</h2>
    ${bodyHtml}
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
    <p style="color:#999;font-size:12px">${firmName ? `Sent by ${firmName} via ` : ""}TP Report — Transfer Pricing practice platform for Indian CA firms.</p>
  </div></body></html>`;
}
