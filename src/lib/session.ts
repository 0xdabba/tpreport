import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export type FirmSession = {
  userId: string;
  firmId: string;
  firmRole: string; // PARTNER | MANAGER | STAFF
  email: string;
  name: string | null;
};

export async function getFirmSession(): Promise<FirmSession | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const u = session.user as {
    id?: string;
    firmId?: string;
    firmRole?: string;
    email?: string | null;
    name?: string | null;
  };
  if (!u.id || !u.firmId) return null;
  return {
    userId: u.id,
    firmId: u.firmId,
    firmRole: u.firmRole || "STAFF",
    email: u.email || "",
    name: u.name || null,
  };
}

export function canApprove(firmRole: string): boolean {
  return firmRole === "PARTNER" || firmRole === "MANAGER";
}

export function isPartner(firmRole: string): boolean {
  return firmRole === "PARTNER";
}
