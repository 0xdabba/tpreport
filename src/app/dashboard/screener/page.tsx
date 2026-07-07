"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  Radar,
  Upload,
  UserPlus,
  IndianRupee,
  FileCheck,
  Globe,
  ShieldCheck,
} from "lucide-react";

interface ScreenedRow {
  name: string;
  industry?: string | null;
  turnover?: number | null;
  hasForeignAE: boolean;
  intlTxnValue?: number | null;
  groupRevenue?: number | null;
  need3CEB: boolean;
  needMasterFile: boolean;
  masterFilePartB: boolean;
  needCbCR: boolean;
  safeHarbourEligible: boolean;
  flags: string[];
  estimatedFee: number;
}

interface Summary {
  total: number;
  need3ceb: number;
  needMf: number;
  needCbcr: number;
  shEligible: number;
  feePotential: number;
}

interface RunListItem {
  id: string;
  fileName: string | null;
  createdAt: string;
  summary: Summary | null;
}

function inr(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function ScreenerPage() {
  const [runs, setRuns] = useState<RunListItem[]>([]);
  const [rows, setRows] = useState<ScreenedRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [converted, setConverted] = useState<Record<number, string>>({});

  const fetchRuns = useCallback(async () => {
    const res = await fetch("/api/screener");
    if (res.ok) {
      const data = await res.json();
      setRuns(data);
      if (data.length > 0 && !activeRunId) {
        openRun(data[0].id);
      }
    } else if (res.status === 403) {
      setError((await res.json()).error);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const openRun = async (id: string) => {
    setActiveRunId(id);
    const res = await fetch(`/api/screener/${id}`);
    if (res.ok) {
      const data = await res.json();
      setRows(data.rows);
      setSummary(data.summary);
      setConverted({});
    }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/screener", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) {
        setRows(data.rows);
        setSummary(data.summary);
        setActiveRunId(data.id);
        setConverted({});
        fetchRuns();
      } else {
        setError(data.error || "Upload failed");
      }
    } finally {
      setUploading(false);
    }
  };

  const convertRow = async (idx: number) => {
    if (!activeRunId) return;
    const res = await fetch(`/api/screener/${activeRunId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rowIndex: idx }),
    });
    const data = await res.json();
    if (res.ok) {
      setConverted((p) => ({ ...p, [idx]: data.client.id }));
    } else if (res.status === 409) {
      setConverted((p) => ({ ...p, [idx]: data.clientId }));
    } else {
      setError(data.error || "Conversion failed");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">TP Opportunity Screener</h1>
            <p className="text-muted mt-1">
              Upload your firm&apos;s client list — find who needs Form 3CEB, Master File, CbCR, or
              a safe harbour election, with fee potential
            </p>
          </div>
          <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium shadow-sm cursor-pointer">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? "Screening..." : "Upload client list"}
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
            />
          </label>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-danger/10 border border-danger/30 rounded-lg text-sm text-danger">{error}</div>
        )}

        <p className="text-xs text-muted mb-6">
          Expected columns: client name, industry, turnover, foreign AE (yes/no), international
          transaction value, group consolidated revenue. Values may be in ₹ or ₹ crore — detected
          automatically.
        </p>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-surface-alt rounded-full flex items-center justify-center mb-4">
              <Radar className="w-8 h-8 text-muted" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Find the TP mandates hiding in your client base
            </h3>
            <p className="text-muted max-w-md">
              Most firms already serve clients with unmet TP obligations. Upload a simple Excel of
              your clients to see who needs what — and what the engagements are worth.
            </p>
          </div>
        )}

        {summary && rows.length > 0 && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <StatCard icon={FileCheck} label="Need Form 3CEB" value={summary.need3ceb} />
              <StatCard icon={Globe} label="Full Master File" value={summary.needMf} />
              <StatCard icon={Globe} label="CbCR" value={summary.needCbcr} />
              <StatCard icon={ShieldCheck} label="Safe harbour candidates" value={summary.shEligible} />
              <StatCard icon={IndianRupee} label="Fee potential" value={inr(summary.feePotential)} highlight />
            </div>

            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-alt text-muted text-xs uppercase">
                    <tr>
                      <th className="text-left px-4 py-3">Client</th>
                      <th className="text-left px-4 py-3">Obligations flagged</th>
                      <th className="text-right px-4 py-3">Est. fee</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((r, i) => (
                      <tr key={i} className={r.flags.length === 0 ? "opacity-50" : ""}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{r.name}</div>
                          <div className="text-xs text-muted">{r.industry || "—"}</div>
                        </td>
                        <td className="px-4 py-3">
                          {r.flags.length === 0 ? (
                            <span className="text-xs text-muted">No TP obligations detected</span>
                          ) : (
                            <ul className="space-y-0.5">
                              {r.flags.map((f, j) => (
                                <li key={j} className="text-xs text-foreground">• {f}</li>
                              ))}
                            </ul>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-foreground">
                          {r.estimatedFee > 0 ? inr(r.estimatedFee) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {r.flags.length > 0 &&
                            (converted[i] ? (
                              <a
                                href={`/dashboard/clients`}
                                className="text-xs text-success font-medium"
                              >
                                Added ✓
                              </a>
                            ) : (
                              <button
                                onClick={() => convertRow(i)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg text-xs font-medium text-primary hover:bg-primary/20 cursor-pointer"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                Add as client
                              </button>
                            ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {runs.length > 1 && (
          <div className="mt-6 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted">Previous runs:</span>
            {runs.map((r) => (
              <button
                key={r.id}
                onClick={() => openRun(r.id)}
                className={`text-xs px-3 py-1.5 rounded-lg border cursor-pointer ${
                  activeRunId === r.id
                    ? "border-primary text-primary bg-primary/5"
                    : "border-border text-muted hover:text-foreground"
                }`}
              >
                {r.fileName || r.id.slice(0, 6)} ·{" "}
                {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight ? "bg-primary/5 border-primary/30" : "bg-surface border-border"
      }`}
    >
      <div className="flex items-center gap-2 text-muted text-xs mb-1">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className={`text-xl font-bold ${highlight ? "text-primary" : "text-foreground"}`}>
        {value}
      </div>
    </div>
  );
}
