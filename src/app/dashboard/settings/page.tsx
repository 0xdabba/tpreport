"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Building2,
  Users,
  CreditCard,
  Loader2,
  Save,
  Copy,
  Check,
  Mail,
  Trash2,
  Crown,
  Link2,
} from "lucide-react";

interface Member {
  id: string;
  name: string | null;
  email: string;
  firmRole: string;
  createdAt: string;
}

interface Invite {
  id: string;
  email: string;
  firmRole: string;
  expiresAt: string;
  token: string;
}

interface PlanLimits {
  label: string;
  priceINR: number;
  maxClients: number | null;
  benchmarking: boolean;
  screener: boolean;
  proposals: boolean;
  portal: boolean;
  maxSeats: number | null;
}

interface Firm {
  id: string;
  name: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  pincode: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  frn: string | null;
  logoText: string | null;
  brandColor: string | null;
  plan: string;
  planExpiresAt: string | null;
  users: Member[];
  invites: Invite[];
  planLimits: PlanLimits;
  _count: { clients: number };
}

const PLAN_CARDS = [
  {
    id: "STARTER",
    label: "Starter",
    price: "₹24,999/yr",
    features: ["5 clients", "AI documentation + DOCX/PDF export", "Compliance deadlines + reminders", "3 seats"],
  },
  {
    id: "PROFESSIONAL",
    label: "Professional",
    price: "₹49,999/yr",
    features: ["25 clients", "Everything in Starter", "Benchmarking module", "TP opportunity screener", "Proposals & engagement letters", "10 seats"],
  },
  {
    id: "FIRM",
    label: "Firm",
    price: "₹99,999/yr",
    features: ["Unlimited clients & seats", "Everything in Professional", "White-label client portal", "Priority support"],
  },
];

export default function SettingsPage() {
  const [firm, setFirm] = useState<Firm | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"firm" | "team" | "billing">("firm");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("STAFF");
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const fetchFirm = useCallback(async () => {
    const res = await fetch("/api/firm");
    if (res.ok) {
      const data = await res.json();
      setFirm(data);
      setForm({
        name: data.name || "",
        addressLine1: data.addressLine1 || "",
        addressLine2: data.addressLine2 || "",
        city: data.city || "",
        pincode: data.pincode || "",
        email: data.email || "",
        phone: data.phone || "",
        website: data.website || "",
        frn: data.frn || "",
        brandColor: data.brandColor || "#C2410C",
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFirm();
  }, [fetchFirm]);

  const saveFirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/firm", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      fetchFirm();
    } else {
      setError((await res.json()).error || "Save failed");
    }
    setSaving(false);
  };

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setError("");
    setInviteLink("");
    const res = await fetch("/api/firm/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, firmRole: inviteRole }),
    });
    const data = await res.json();
    if (res.ok) {
      setInviteLink(data.link);
      setInviteEmail("");
      fetchFirm();
    } else {
      setError(data.error || "Invite failed");
    }
    setInviting(false);
  };

  const revokeInvite = async (id: string) => {
    await fetch(`/api/firm/invites?id=${id}`, { method: "DELETE" });
    fetchFirm();
  };

  const checkout = async (plan: string) => {
    setCheckingOut(plan);
    setError("");
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const data = await res.json();
    if (res.ok) {
      if (data.shortUrl) {
        window.location.href = data.shortUrl;
      } else if (data.mockPaid) {
        fetchFirm();
      }
    } else {
      setError(data.error || "Checkout failed");
    }
    setCheckingOut(null);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }
  if (!firm) return <div className="p-8 text-muted">Could not load firm.</div>;

  const planActive = !firm.planExpiresAt || new Date(firm.planExpiresAt) > new Date();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Settings</h1>
        <p className="text-muted mb-8">Firm profile, letterhead, team, and billing</p>

        <div className="flex gap-2 mb-8">
          {(
            [
              { id: "firm", label: "Firm & Letterhead", icon: Building2 },
              { id: "team", label: "Team", icon: Users },
              { id: "billing", label: "Billing", icon: CreditCard },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer ${
                  tab === t.id ? "bg-primary text-white" : "bg-surface border border-border text-muted hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            );
          })}
        </div>

        {error && <div className="mb-6 p-4 bg-danger/10 border border-danger/30 rounded-lg text-sm text-danger">{error}</div>}

        {tab === "firm" && (
          <form onSubmit={saveFirm} className="bg-surface border border-border rounded-xl p-6 space-y-4">
            <p className="text-sm text-muted">
              These details appear on the letterhead of every exported DOCX/PDF deliverable.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(
                [
                  ["name", "Firm name *"],
                  ["frn", "ICAI Firm Registration No."],
                  ["addressLine1", "Address line 1"],
                  ["addressLine2", "Address line 2"],
                  ["city", "City"],
                  ["pincode", "PIN code"],
                  ["email", "Email"],
                  ["phone", "Phone"],
                  ["website", "Website"],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
                  <input
                    type="text"
                    required={key === "name"}
                    value={form[key] || ""}
                    onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Brand colour</label>
                <input
                  type="color"
                  value={form.brandColor || "#C2410C"}
                  onChange={(e) => setForm((p) => ({ ...p, brandColor: e.target.value }))}
                  className="h-11 w-20 bg-background border border-border rounded-lg cursor-pointer"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark font-medium disabled:opacity-50 cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? "Saved" : "Save"}
            </button>
          </form>
        )}

        {tab === "team" && (
          <div className="space-y-6">
            <div className="bg-surface border border-border rounded-xl p-6">
              <h2 className="text-sm font-semibold text-foreground mb-4">
                Members ({firm.users.length}
                {firm.planLimits.maxSeats ? `/${firm.planLimits.maxSeats}` : ""})
              </h2>
              <div className="space-y-2">
                {firm.users.map((m) => (
                  <div key={m.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <div className="text-sm font-medium text-foreground flex items-center gap-2">
                        {m.name || m.email}
                        {m.firmRole === "PARTNER" && <Crown className="w-3.5 h-3.5 text-warning" />}
                      </div>
                      <div className="text-xs text-muted">{m.email}</div>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-surface-alt text-muted font-medium capitalize">
                      {m.firmRole.toLowerCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-surface border border-border rounded-xl p-6">
              <h2 className="text-sm font-semibold text-foreground mb-4">Invite a member</h2>
              <form onSubmit={sendInvite} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@firm.in"
                  className="flex-1 px-3 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="px-3 py-2.5 bg-background border border-border rounded-lg text-foreground"
                >
                  <option value="STAFF">Staff</option>
                  <option value="MANAGER">Manager</option>
                  <option value="PARTNER">Partner</option>
                </select>
                <button
                  type="submit"
                  disabled={inviting}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark font-medium disabled:opacity-50 cursor-pointer"
                >
                  {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  Invite
                </button>
              </form>
              {inviteLink && (
                <div className="mt-4 flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <Link2 className="w-4 h-4 text-primary flex-shrink-0" />
                  <code className="text-xs text-foreground truncate flex-1">{inviteLink}</code>
                  <button onClick={copyLink} className="p-1.5 rounded-lg hover:bg-surface-alt cursor-pointer">
                    {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4 text-muted" />}
                  </button>
                </div>
              )}
              {firm.invites.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h3 className="text-xs font-semibold text-muted uppercase">Pending invites</h3>
                  {firm.invites.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{inv.email}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted capitalize">{inv.firmRole.toLowerCase()}</span>
                        <button
                          onClick={() => revokeInvite(inv.id)}
                          className="p-1 rounded text-muted hover:text-danger cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "billing" && (
          <div className="space-y-6">
            <div className={`rounded-xl border p-6 ${planActive ? "bg-surface border-border" : "bg-danger/5 border-danger/30"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted">Current plan</div>
                  <div className="text-xl font-bold text-foreground">{firm.planLimits.label}</div>
                  {firm.planExpiresAt && (
                    <div className={`text-xs mt-1 ${planActive ? "text-muted" : "text-danger font-medium"}`}>
                      {planActive ? "Renews/expires" : "EXPIRED"} on{" "}
                      {new Date(firm.planExpiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                    </div>
                  )}
                </div>
                <div className="text-right text-sm text-muted">
                  {firm._count.clients} client{firm._count.clients === 1 ? "" : "s"}
                  {firm.planLimits.maxClients ? ` of ${firm.planLimits.maxClients}` : " (unlimited)"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PLAN_CARDS.map((p) => (
                <div
                  key={p.id}
                  className={`rounded-xl border p-5 flex flex-col ${
                    firm.plan === p.id ? "border-primary bg-primary/5" : "border-border bg-surface"
                  }`}
                >
                  <div className="font-semibold text-foreground">{p.label}</div>
                  <div className="text-xl font-bold text-primary mb-3">{p.price}</div>
                  <ul className="text-xs text-muted space-y-1.5 mb-4 flex-1">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-success flex-shrink-0 mt-px" /> {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => checkout(p.id)}
                    disabled={checkingOut !== null || (firm.plan === p.id && planActive)}
                    className={`w-full px-3 py-2 rounded-lg text-sm font-medium cursor-pointer disabled:cursor-not-allowed ${
                      firm.plan === p.id && planActive
                        ? "bg-surface-alt text-muted"
                        : "bg-primary text-white hover:bg-primary-dark"
                    }`}
                  >
                    {checkingOut === p.id ? (
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    ) : firm.plan === p.id && planActive ? (
                      "Current plan"
                    ) : (
                      `Switch to ${p.label}`
                    )}
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted">
              Payments via Razorpay (annual billing, GST extra). In demo mode (no Razorpay keys
              configured) plan changes apply immediately without payment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
