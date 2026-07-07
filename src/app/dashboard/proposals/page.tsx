"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  X,
  Loader2,
  Handshake,
  Download,
  Trash2,
  IndianRupee,
} from "lucide-react";

const FEE_ITEMS = [
  { id: "form-3ceb", label: "Form 3CEB certification (Sec 92E)", baseFee: 75000 },
  { id: "tp-study", label: "TP Study / Local File", baseFee: 150000 },
  { id: "benchmarking", label: "Benchmarking study", baseFee: 75000 },
  { id: "master-file", label: "Master File (3CEAA)", baseFee: 100000 },
  { id: "cbcr", label: "CbCR compliance", baseFee: 125000 },
  { id: "agreements", label: "Intragroup agreement drafting", baseFee: 40000 },
  { id: "safe-harbour", label: "Safe harbour + Form 3CEFA", baseFee: 50000 },
  { id: "planning", label: "TP policy design", baseFee: 200000 },
];

const COMPLEXITY = [
  { id: "standard", label: "Standard", mult: 1 },
  { id: "moderate", label: "Moderate (×1.25)", mult: 1.25 },
  { id: "complex", label: "Complex (×1.5)", mult: 1.5 },
];

interface Client {
  id: string;
  name: string;
  industry?: string | null;
}

interface Proposal {
  id: string;
  prospectName: string;
  status: string;
  totalFee: number | null;
  financialYear: string | null;
  content: string | null;
  engagementLetter: string | null;
  createdAt: string;
  client: { id: string; name: string } | null;
}

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [viewing, setViewing] = useState<Proposal | null>(null);
  const [viewTab, setViewTab] = useState<"proposal" | "letter">("proposal");
  const [form, setForm] = useState({
    prospectName: "",
    clientId: "",
    financialYear: "2025-26",
    complexity: "standard",
    notes: "",
    itemIds: [] as string[],
  });

  const fetchData = useCallback(async () => {
    const [pRes, cRes] = await Promise.all([fetch("/api/proposals"), fetch("/api/clients")]);
    if (pRes.ok) setProposals(await pRes.json());
    else if (pRes.status === 403) setError((await pRes.json()).error);
    if (cRes.ok) setClients(await cRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const mult = COMPLEXITY.find((c) => c.id === form.complexity)?.mult || 1;
  const estimatedTotal = form.itemIds.reduce((sum, id) => {
    const item = FEE_ITEMS.find((f) => f.id === id);
    return sum + Math.round((item?.baseFee || 0) * mult);
  }, 0);

  const toggleItem = (id: string) =>
    setForm((p) => ({
      ...p,
      itemIds: p.itemIds.includes(id) ? p.itemIds.filter((x) => x !== id) : [...p.itemIds, id],
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const client = clients.find((c) => c.id === form.clientId);
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prospectName: form.prospectName || client?.name,
          clientId: form.clientId || undefined,
          industry: client?.industry,
          financialYear: form.financialYear,
          itemIds: form.itemIds,
          complexity: form.complexity,
          notes: form.notes || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowModal(false);
        setForm({ prospectName: "", clientId: "", financialYear: "2025-26", complexity: "standard", notes: "", itemIds: [] });
        await fetchData();
        setViewing(data);
      } else {
        setError(data.error || "Failed to create proposal");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const setStatus = async (p: Proposal, status: string) => {
    await fetch(`/api/proposals/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchData();
  };

  const remove = async (p: Proposal) => {
    if (!confirm("Delete this proposal?")) return;
    await fetch(`/api/proposals/${p.id}`, { method: "DELETE" });
    fetchData();
  };

  const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Proposals & Engagement Letters</h1>
            <p className="text-muted mt-1">
              Price the engagement, generate the pitch, and get the engagement letter out the same day
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark font-medium shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" /> New Proposal
          </button>
        </div>

        {error && !showModal && (
          <div className="mb-6 p-4 bg-danger/10 border border-danger/30 rounded-lg text-sm text-danger">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : proposals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-surface-alt rounded-full flex items-center justify-center mb-4">
              <Handshake className="w-8 h-8 text-muted" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No proposals yet</h3>
            <p className="text-muted max-w-md">
              Pick scope items, set complexity, and TP Report drafts the proposal and engagement
              letter on your letterhead.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {proposals.map((p) => (
              <div key={p.id} className="bg-surface border border-border rounded-xl p-5 flex flex-col hover:shadow-md hover:border-primary/30 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Handshake className="w-5 h-5 text-primary" />
                  </div>
                  <select
                    value={p.status}
                    onChange={(e) => setStatus(p, e.target.value)}
                    className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${
                      p.status === "accepted"
                        ? "bg-success/10 text-success"
                        : p.status === "sent"
                          ? "bg-warning/10 text-warning"
                          : p.status === "rejected"
                            ? "bg-danger/10 text-danger"
                            : "bg-surface-alt text-muted"
                    }`}
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <h3 className="font-semibold text-foreground text-sm mb-1">{p.prospectName}</h3>
                <p className="text-xs text-muted mb-3">
                  FY {p.financialYear} · {p.totalFee ? inr(p.totalFee) : "—"}
                </p>
                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={() => { setViewing(p); setViewTab("proposal"); }}
                    className="flex-1 px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg text-sm font-medium text-primary hover:bg-primary/20 cursor-pointer"
                  >
                    View
                  </button>
                  <a
                    href={`/api/proposals/${p.id}?export=proposal`}
                    className="px-3 py-2 bg-surface-alt border border-border rounded-lg text-sm text-foreground hover:bg-border/50"
                    title="Download proposal DOCX"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => remove(p)}
                    className="px-3 py-2 bg-surface-alt border border-border rounded-lg text-sm text-muted hover:text-danger cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-surface rounded-xl shadow-xl w-full max-w-2xl border border-border max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-border bg-surface rounded-t-xl">
              <div>
                <h2 className="text-lg font-semibold text-foreground">New Proposal</h2>
                <p className="text-sm text-muted">Scope + fees → AI-drafted proposal & engagement letter</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-surface-alt rounded-lg cursor-pointer">
                <X className="w-5 h-5 text-muted" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="p-3 bg-danger/10 border border-danger/30 rounded-lg text-sm text-danger">{error}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Existing client</label>
                  <select
                    value={form.clientId}
                    onChange={(e) => setForm((p) => ({ ...p, clientId: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground"
                  >
                    <option value="">— New prospect —</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Prospect name {!form.clientId && <span className="text-danger">*</span>}
                  </label>
                  <input
                    type="text"
                    required={!form.clientId}
                    value={form.prospectName}
                    onChange={(e) => setForm((p) => ({ ...p, prospectName: e.target.value }))}
                    placeholder="Company name"
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Scope items <span className="text-danger">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {FEE_ITEMS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleItem(item.id)}
                      className={`text-left p-3 rounded-lg border-2 transition-all cursor-pointer ${
                        form.itemIds.includes(item.id)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30"
                      }`}
                    >
                      <div className="text-sm font-medium text-foreground">{item.label}</div>
                      <div className="text-xs text-muted">{inr(Math.round(item.baseFee * mult))}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Complexity</label>
                  <select
                    value={form.complexity}
                    onChange={(e) => setForm((p) => ({ ...p, complexity: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground"
                  >
                    {COMPLEXITY.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Financial year</label>
                  <select
                    value={form.financialYear}
                    onChange={(e) => setForm((p) => ({ ...p, financialYear: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground"
                  >
                    <option value="2025-26">FY 2025-26</option>
                    <option value="2026-27">FY 2026-27</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Notes for the drafter</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  placeholder="e.g. prospect had a TP adjustment last year; emphasise litigation support"
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <IndianRupee className="w-4 h-4" /> Estimated fee
                </span>
                <span className="text-lg font-bold text-primary">{inr(estimatedTotal)}</span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 border border-border rounded-lg text-foreground hover:bg-surface-alt font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || form.itemIds.length === 0 || (!form.clientId && !form.prospectName)}
                  className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark font-medium disabled:opacity-50 inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {submitting ? "Drafting with AI..." : "Create & Draft"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View modal */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setViewing(null)} />
          <div className="relative bg-surface rounded-xl shadow-xl w-full max-w-3xl border border-border max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold text-foreground">{viewing.prospectName}</h2>
                <div className="flex gap-1 bg-surface-alt rounded-lg p-1">
                  {(["proposal", "letter"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setViewTab(t)}
                      className={`px-3 py-1 text-xs rounded-md font-medium capitalize cursor-pointer ${
                        viewTab === t ? "bg-surface text-foreground shadow-sm" : "text-muted"
                      }`}
                    >
                      {t === "letter" ? "Engagement letter" : "Proposal"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/api/proposals/${viewing.id}?export=${viewTab === "letter" ? "letter" : "proposal"}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg text-xs font-medium text-primary"
                >
                  <Download className="w-3.5 h-3.5" /> DOCX
                </a>
                <button onClick={() => setViewing(null)} className="p-2 hover:bg-surface-alt rounded-lg cursor-pointer">
                  <X className="w-5 h-5 text-muted" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto whitespace-pre-wrap text-sm text-foreground font-serif leading-relaxed">
              {(viewTab === "letter" ? viewing.engagementLetter : viewing.content) ||
                "Not generated (server has no ANTHROPIC_API_KEY, or generation was skipped)."}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
