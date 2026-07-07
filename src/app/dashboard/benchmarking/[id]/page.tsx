"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import {
  Loader2,
  ArrowLeft,
  Check,
  X,
  BarChart3,
  FileText,
} from "lucide-react";

interface Comparable {
  id: string;
  name: string;
  businessDesc: string | null;
  fyLabels: string | null;
  margins: string | null;
  wavgMargin: number | null;
  rptPct: number | null;
  accepted: boolean;
  rejectReason: string | null;
}

interface AlpRange {
  method: "percentile" | "mean";
  count: number;
  p35: number | null;
  median: number | null;
  p65: number | null;
  mean: number | null;
  min: number | null;
  max: number | null;
}

interface SetDetail {
  id: string;
  name: string;
  financialYear: string;
  pli: string;
  sourceDb: string;
  status: string;
  testedParty: string | null;
  testedMargin: number | null;
  rptThreshold: number;
  searchSteps: string | null;
  client: { id: string; name: string };
  comparables: Comparable[];
  range: AlpRange;
}

export default function BenchmarkingSetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [set, setSet] = useState<SetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");

  const fetchSet = useCallback(async () => {
    const res = await fetch(`/api/benchmarking/${id}`);
    if (res.ok) setSet(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchSet();
  }, [fetchSet]);

  const toggleComparable = async (comp: Comparable) => {
    setSaving(true);
    const res = await fetch(`/api/benchmarking/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        comparableId: comp.id,
        accepted: !comp.accepted,
        rejectReason: comp.accepted ? "Rejected on qualitative screening by reviewer" : null,
      }),
    });
    if (res.ok) setSet(await res.json());
    setSaving(false);
  };

  const updateTested = async (field: "testedParty" | "testedMargin", value: string) => {
    const res = await fetch(`/api/benchmarking/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (res.ok) setSet(await res.json());
  };

  const generateReport = async () => {
    if (!set) return;
    setGenerating(true);
    setMessage("");
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Benchmarking Report - ${set.client.name} - FY ${set.financialYear}`,
          type: "benchmarking",
          clientId: set.client.id,
          financialYear: set.financialYear,
          benchmarkingSetId: set.id,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("Report generated — find it under Documents.");
      } else {
        setMessage(data.error || "Generation failed");
      }
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }
  if (!set) {
    return <div className="p-8 text-muted">Set not found.</div>;
  }

  const funnel: { step: string; count: number }[] = set.searchSteps
    ? JSON.parse(set.searchSteps)
    : [];
  const accepted = set.comparables.filter((c) => c.accepted);
  const inRange =
    set.testedMargin !== null && set.range.method === "percentile"
      ? set.testedMargin >= (set.range.p35 ?? -Infinity) &&
        set.testedMargin <= (set.range.p65 ?? Infinity)
      : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/dashboard/benchmarking"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> All sets
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-foreground">{set.name}</h1>
            <p className="text-muted mt-1">
              {set.client.name} · FY {set.financialYear} · {set.pli} · source: {set.sourceDb}
            </p>

            {/* Search funnel */}
            <div className="mt-6 bg-surface border border-border rounded-xl p-5">
              <h2 className="text-sm font-semibold text-foreground mb-3">Search process funnel</h2>
              <div className="space-y-2">
                {funnel.map((f, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-muted">{f.step}</span>
                    <span className="font-mono font-medium text-foreground">{f.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Comparables table */}
            <div className="mt-6 bg-surface border border-border rounded-xl overflow-hidden">
              <div className="p-5 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">
                  Comparables ({accepted.length} accepted / {set.comparables.length} total)
                </h2>
                {saving && <Loader2 className="w-4 h-4 animate-spin text-muted" />}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-alt text-muted text-xs uppercase">
                    <tr>
                      <th className="text-left px-4 py-3">Company</th>
                      <th className="text-right px-4 py-3">Wavg margin</th>
                      <th className="text-right px-4 py-3">RPT %</th>
                      <th className="text-left px-4 py-3">Status / reason</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {set.comparables.map((c) => (
                      <tr key={c.id} className={c.accepted ? "" : "opacity-60"}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{c.name}</div>
                          {c.businessDesc && (
                            <div className="text-xs text-muted line-clamp-1">{c.businessDesc}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {c.wavgMargin !== null ? `${c.wavgMargin}%` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {c.rptPct !== null ? `${c.rptPct}%` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {c.accepted ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success font-medium">
                              Accepted
                            </span>
                          ) : (
                            <span className="text-xs text-danger">{c.rejectReason}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => toggleComparable(c)}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              c.accepted
                                ? "border-border text-muted hover:text-danger hover:border-danger/40"
                                : "border-border text-muted hover:text-success hover:border-success/40"
                            }`}
                            title={c.accepted ? "Reject" : "Accept"}
                          >
                            {c.accepted ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right rail: ALP range + tested party + actions */}
          <div className="w-full lg:w-80 flex-shrink-0 space-y-4">
            <div className="bg-surface border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">
                  Arm&apos;s length range (Rule 10CA)
                </h2>
              </div>
              {set.range.count === 0 ? (
                <p className="text-sm text-muted">No accepted comparables with margins.</p>
              ) : (
                <>
                  <p className="text-xs text-muted mb-3">
                    {set.range.method === "percentile"
                      ? `35th–65th percentile of ${set.range.count} comparables`
                      : `Arithmetic mean (only ${set.range.count} comparables — percentile range needs 6+)`}
                  </p>
                  <div className="space-y-2 text-sm">
                    {set.range.method === "percentile" && (
                      <>
                        <Row label="35th percentile" value={set.range.p35} />
                        <Row label="Median" value={set.range.median} strong />
                        <Row label="65th percentile" value={set.range.p65} />
                      </>
                    )}
                    <Row label="Mean" value={set.range.mean} />
                    <Row label="Min / Max" value={null} custom={`${set.range.min ?? "—"}% / ${set.range.max ?? "—"}%`} />
                  </div>
                </>
              )}
            </div>

            <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
              <h2 className="text-sm font-semibold text-foreground">Tested party</h2>
              <input
                defaultValue={set.testedParty || ""}
                onBlur={(e) => updateTested("testedParty", e.target.value)}
                placeholder="Tested party name"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground"
              />
              <input
                type="number"
                step="0.01"
                defaultValue={set.testedMargin ?? ""}
                onBlur={(e) => updateTested("testedMargin", e.target.value)}
                placeholder={`Margin % (${set.pli})`}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground"
              />
              {inRange !== null && (
                <div
                  className={`text-sm font-medium px-3 py-2 rounded-lg ${
                    inRange ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                  }`}
                >
                  {inRange
                    ? "Within the arm's length range ✓"
                    : "Outside the range — adjustment risk under Sec 92C"}
                </div>
              )}
            </div>

            <button
              onClick={generateReport}
              disabled={generating || accepted.length === 0}
              className="w-full px-4 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark font-medium disabled:opacity-50 inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              {generating ? "Generating report..." : "Generate Benchmarking Report"}
            </button>
            {message && <p className="text-sm text-muted text-center">{message}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  custom,
}: {
  label: string;
  value?: number | null;
  strong?: boolean;
  custom?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className={`font-mono ${strong ? "font-bold text-foreground" : "text-foreground"}`}>
        {custom ?? (value !== null && value !== undefined ? `${value}%` : "—")}
      </span>
    </div>
  );
}
