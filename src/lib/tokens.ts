import crypto from "crypto";

const SECRET = process.env.APP_SECRET || process.env.NEXTAUTH_SECRET || "dev-secret";

/** Deterministic HMAC token for an id + purpose. Rebuildable; store only the hash. */
export function deriveToken(purpose: string, id: string): string {
  return crypto
    .createHmac("sha256", SECRET)
    .update(`${purpose}:${id}`)
    .digest("base64url")
    .slice(0, 32);
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function randomToken(bytes = 24): string {
  return crypto.randomBytes(bytes).toString("base64url");
}
