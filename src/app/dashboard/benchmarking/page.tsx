"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  X,
  Loader2,
  Scale,
  Upload,
  Building2,
  Calendar,
  Trash2,
  Database,
  AlertTriangle,
} from "lucide-react";

interface Client {
  id: string;
  name: string;
}

interface BenchmarkingSet {
  id: string;
  name: string;
  financialYear: string;
  pli: string;
  sourceDb: string;
  status: string;
  createdAt: string;
  client: { id: string; name: string };
  _count: { comparables: number };
}

const SOURCE_LABELS: Record<string, string> = {
  capitaline: "Capitaline",
  ace: "Ace TP",
  prowess: "Prowess (CMIE)",
  builtin: "Built-in dataset",
  manual: "Manual",
};

export default function BenchmarkingPage() {
  const router = useRouter();
  const [sets, setSets] = useState<BenchmarkingSet[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    name: "",
    clientId: "",
    financialYear: "2025-26",
    pli: "OP/TC",
    sourceDb: "capitaline",
    rptThreshold: "25",
    turnoverMin: "",
    turnoverMax: "",
    testedParty: "",
    testedMargin: "",
  });

  const fetchData = useCallback(async () => {
    try {
      const [setsRes, clientsRes] = await Promise.all([
        fetch("/api/benchmarking"),
        fetch("/api/clients"),
      ]);
      if (setsRes.ok) setSets(await setsRes.json());
      else if (setsRes.status === 403) setError((await setsRes.json()).error);
      if (clientsRes.ok) setClients(await clientsRes.json());
    } catch (err) {
      console.error("Failed to fetch:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setSubmitting(true);
    setError("");
    setWarnings([]);
    try {
      const fd = new FormData();
      fd.append("file", file);
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      const res = await fetch("/api/benchmarking", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) {
        setWarnings(data.warnings || []);
        setShowModal(false);
        setFile(null);
        await fetchData();
        router.push(`/dashboard/benchmarking/${data.set.id}`);
      } else {
        setError(data.error || "Upload failed");
        if (data.warnings) setWarnings(data.warnings);
      }
    } catch {
      setError("Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this benchmarking set?")) return;
    await fetch(`/api/benchmarking/${id}`, { method: "DELETE" });
    fetchData();
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Benchmarking</h1>
            <p className="text-muted mt-1">
              Import comparables from Capitaline / Ace TP / Prowess, screen them, and compute the arm&apos;s length range per Rule 10CA
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Comparable Set
          </button>
        </div>

        {error && !showModal && (
          <div className="mb-6 p-4 bg-danger/10 border border-danger/30 rounded-lg text-sm text-danger">
            {error}
          </div>
        )}

        <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-sm text-muted">
            <span className="font-medium text-foreground">Real data only.</span> TP Report never
            generates comparable companies. Upload an export from your database subscription, or
            search the built-in dataset — the screening engine applies your RPT, loss, and turnover
            filters and documents every accept/reject decision for the audit file.
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}

        {!loading && sets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-surface-alt rounded-full flex items-center justify-center mb-4">
              <Scale className="w-8 h-8 text-muted" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No comparable sets yet</h3>
            <p className="text-muted mb-6 max-w-md">
              Upload an Excel export from Capitaline, Ace TP, or Prowess to build your first
              screened comparable set.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Upload Comparables
            </button>
          </div>
        )}

        {!loading && sets.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {sets.map((set) => (
              <div
                key={set.id}
                className="bg-surface border border-border rounded-xl p-5 hover:shadow-md hover:border-primary/30 transition-all flex flex-col"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Database className="w-5 h-5 text-primary" />
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
                      set.status === "final"
                        ? "bg-success/10 text-success"
                        : "bg-surface-alt text-muted"
                    }`}
                  >
                    {set.status}
                  </span>
                </div>
                <h3 className="font-semibold text-foreground text-sm mb-1 line-clamp-2">{set.name}</h3>
                <p className="text-xs text-muted mb-3">
                  {SOURCE_LABELS[set.sourceDb] || set.sourceDb} · {set.pli} ·{" "}
                  {set._count.comparables} companies
                </p>
                <div className="flex items-center gap-3 text-xs text-muted mb-4 mt-auto">
                  <div className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" />
                    {set.client.name}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(set.createdAt)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/dashboard/benchmarking/${set.id}`)}
                    className="flex-1 px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg text-sm font-medium text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                  >
                    Open screening
                  </button>
                  <button
                    onClick={() => handleDelete(set.id)}
                    className="px-3 py-2 bg-surface-alt border border-border rounded-lg text-sm text-muted hover:text-danger transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-surface rounded-xl shadow-xl w-full max-w-2xl border border-border max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-border bg-surface rounded-t-xl">
              <div>
                <h2 className="text-lg font-semibold text-foreground">New Comparable Set</h2>
                <p className="text-sm text-muted">Upload a database export and set screening filters</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-surface-alt rounded-lg cursor-pointer">
                <X className="w-5 h-5 text-muted" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-danger/10 border border-danger/30 rounded-lg text-sm text-danger">
                  {error}
                  {warnings.map((w, i) => (
                    <div key={i} className="text-xs mt-1">{w}</div>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Excel export <span className="text-danger">*</span>
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-muted file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary file:font-medium file:cursor-pointer"
                />
                <p className="text-xs text-muted mt-1">
                  Expected columns: company name, business description, revenue/OP or margins per FY, RPT %
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Source database</label>
                  <select
                    value={form.sourceDb}
                    onChange={(e) => setForm((p) => ({ ...p, sourceDb: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground"
                  >
                    <option value="capitaline">Capitaline</option>
                    <option value="ace">Ace TP</option>
                    <option value="prowess">Prowess (CMIE)</option>
                    <option value="manual">Other / manual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Client <span className="text-danger">*</span>
                  </label>
                  <select
                    required
                    value={form.clientId}
                    onChange={(e) => setForm((p) => ({ ...p, clientId: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground"
                  >
                    <option value="">Select client</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
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
                    <option value="2024-25">FY 2024-25</option>
                    <option value="2023-24">FY 2023-24</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">PLI</label>
                  <select
                    value={form.pli}
                    onChange={(e) => setForm((p) => ({ ...p, pli: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground"
                  >
                    <option value="OP/TC">OP/TC (operating profit / total cost)</option>
                    <option value="OP/OR">OP/OR (operating profit / revenue)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">RPT threshold %</label>
                  <input
                    type="number"
                    value={form.rptThreshold}
                    onChange={(e) => setForm((p) => ({ ...p, rptThreshold: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Turnover min (₹Cr)</label>
                    <input
                      type="number"
                      value={form.turnoverMin}
                      onChange={(e) => setForm((p) => ({ ...p, turnoverMin: e.target.value }))}
                      placeholder="—"
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">max (₹Cr)</label>
                    <input
                      type="number"
                      value={form.turnoverMax}
                      onChange={(e) => setForm((p) => ({ ...p, turnoverMax: e.target.value }))}
                      placeholder="—"
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Tested party</label>
                  <input
                    type="text"
                    value={form.testedParty}
                    onChange={(e) => setForm((p) => ({ ...p, testedParty: e.target.value }))}
                    placeholder="e.g. the Indian entity"
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Tested party margin %</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.testedMargin}
                    onChange={(e) => setForm((p) => ({ ...p, testedMargin: e.target.value }))}
                    placeholder="e.g. 14.5"
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Set name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Auto from file name if blank"
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted"
                />
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
                  disabled={submitting || !file || !form.clientId}
                  className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark font-medium disabled:opacity-50 inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {submitting ? "Parsing & screening..." : "Upload & Screen"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
