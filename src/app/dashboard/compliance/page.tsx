"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  ShieldCheck,
  CalendarDays,
  RefreshCw,
  Check,
  Ban,
  AlertTriangle,
  Building2,
} from "lucide-react";

interface Deadline {
  id: string;
  kind: string;
  label: string;
  financialYear: string;
  dueDate: string;
  status: string;
  daysUntil: number;
  overdue: boolean;
  client: { id: string; name: string };
}

const KIND_ORDER = [
  "FORM_3CEB",
  "MF_INTIMATION_3CEAB",
  "ITR_TP",
  "MASTER_FILE_3CEAA",
  "SAFE_HARBOUR_3CEFA",
  "CBCR_INTIMATION_3CEAC",
  "CBCR_3CEAD",
];

export default function CompliancePage() {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [view, setView] = useState<"client" | "date">("date");
  const [message, setMessage] = useState("");

  const fetchDeadlines = useCallback(async () => {
    const res = await fetch("/api/deadlines");
    if (res.ok) setDeadlines(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDeadlines();
  }, [fetchDeadlines]);

  const generateAll = async () => {
    setGenerating(true);
    setMessage("");
    try {
      const res = await fetch("/api/deadlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`Generated/refreshed ${data.generated} statutory deadlines for FY ${data.financialYear} from client facts.`);
        fetchDeadlines();
      } else {
        setMessage(data.error || "Generation failed");
      }
    } finally {
      setGenerating(false);
    }
  };

  const setStatus = async (d: Deadline, status: string) => {
    await fetch(`/api/deadlines/${d.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchDeadlines();
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const open = deadlines.filter((d) => d.status === "upcoming" || d.status === "overdue");
  const done = deadlines.filter((d) => d.status === "done");
  const overdueCount = open.filter((d) => d.overdue || d.status === "overdue").length;
  const next30 = open.filter((d) => !d.overdue && d.status !== "overdue" && d.daysUntil <= 30).length;

  const urgencyStyle = (d: Deadline) => {
    if (d.overdue || d.status === "overdue") return "text-danger bg-danger/10";
    if (d.daysUntil <= 7) return "text-danger bg-danger/10";
    if (d.daysUntil <= 30) return "text-warning bg-warning/10";
    return "text-muted bg-surface-alt";
  };

  const byClient = new Map<string, Deadline[]>();
  for (const d of open) {
    const arr = byClient.get(d.client.name) || [];
    arr.push(d);
    byClient.set(d.client.name, arr);
  }
  for (const arr of byClient.values()) {
    arr.sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Compliance Deadlines</h1>
            <p className="text-muted mt-1">
              Statutory TP deadlines computed from each client&apos;s facts — 3CEB, Master File,
              CbCR, safe harbour. Email reminders at T-30/7/1.
            </p>
          </div>
          <button
            onClick={generateAll}
            disabled={generating}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark font-medium shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Generate from client data
          </button>
        </div>

        {message && (
          <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg text-sm text-foreground">{message}</div>
        )}

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="text-xs text-muted mb-1">Open items</div>
            <div className="text-2xl font-bold text-foreground">{open.length}</div>
          </div>
          <div className={`rounded-xl border p-4 ${overdueCount > 0 ? "bg-danger/5 border-danger/30" : "bg-surface border-border"}`}>
            <div className="text-xs text-muted mb-1 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Overdue
            </div>
            <div className={`text-2xl font-bold ${overdueCount > 0 ? "text-danger" : "text-foreground"}`}>{overdueCount}</div>
          </div>
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="text-xs text-muted mb-1">Due in 30 days</div>
            <div className="text-2xl font-bold text-foreground">{next30}</div>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          {(["date", "client"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-2 text-sm rounded-lg font-medium capitalize cursor-pointer ${
                view === v ? "bg-primary text-white" : "bg-surface border border-border text-muted hover:text-foreground"
              }`}
            >
              By {v}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : deadlines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-surface-alt rounded-full flex items-center justify-center mb-4">
              <ShieldCheck className="w-8 h-8 text-muted" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No deadlines tracked yet</h3>
            <p className="text-muted mb-6 max-w-md">
              Click &quot;Generate from client data&quot; — TP Report reads each client&apos;s
              transactions, group revenue, and SDT flags and creates only the filings that actually
              apply.
            </p>
          </div>
        ) : view === "date" ? (
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-alt text-muted text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3">Filing</th>
                  <th className="text-left px-4 py-3">Client</th>
                  <th className="text-left px-4 py-3">Due</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[...open].sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate)).map((d) => (
                  <tr key={d.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{d.label}</div>
                      <div className="text-xs text-muted">FY {d.financialYear}</div>
                    </td>
                    <td className="px-4 py-3 text-foreground">{d.client.name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${urgencyStyle(d)}`}>
                        {fmt(d.dueDate)} · {d.overdue || d.status === "overdue" ? "OVERDUE" : `${d.daysUntil}d`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted capitalize">{d.status}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => setStatus(d, "done")}
                        className="p-1.5 rounded-lg border border-border text-muted hover:text-success hover:border-success/40 cursor-pointer mr-1"
                        title="Mark filed"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setStatus(d, "na")}
                        className="p-1.5 rounded-lg border border-border text-muted hover:text-foreground cursor-pointer"
                        title="Not applicable"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="space-y-5">
            {[...byClient.entries()].map(([clientName, items]) => (
              <div key={clientName} className="bg-surface border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-foreground">{clientName}</h3>
                </div>
                <div className="space-y-2">
                  {items.map((d) => (
                    <div key={d.id} className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{d.label}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${urgencyStyle(d)}`}>
                          {fmt(d.dueDate)}
                        </span>
                        <button
                          onClick={() => setStatus(d, "done")}
                          className="p-1 rounded border border-border text-muted hover:text-success cursor-pointer"
                          title="Mark filed"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {done.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-semibold text-muted mb-3 flex items-center gap-2">
              <CalendarDays className="w-4 h-4" /> Completed ({done.length})
            </h3>
            <div className="space-y-1">
              {done.map((d) => (
                <div key={d.id} className="flex items-center justify-between text-sm px-4 py-2 bg-surface border border-border rounded-lg opacity-70">
                  <span className="text-muted">
                    {d.label} — {d.client.name} (FY {d.financialYear})
                  </span>
                  <span className="text-xs text-success font-medium">Filed ✓</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
