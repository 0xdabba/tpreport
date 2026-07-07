"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, ShieldCheck, ArrowRight, CheckCircle2, XCircle } from "lucide-react";

const CATEGORIES = [
  { id: "SOFTWARE_DEV", label: "Software development services" },
  { id: "ITES", label: "IT-enabled services (BPO)" },
  { id: "KPO", label: "Knowledge process outsourcing" },
  { id: "CONTRACT_RND_SOFTWARE", label: "Contract R&D — software" },
  { id: "CONTRACT_RND_PHARMA", label: "Contract R&D — generic pharma" },
  { id: "AUTO_COMPONENTS_CORE", label: "Core auto components (incl. EV li-ion batteries)" },
  { id: "AUTO_COMPONENTS_NON_CORE", label: "Non-core auto components" },
  { id: "INTRA_GROUP_LOAN", label: "Intra-group loan to non-resident AE" },
  { id: "CORPORATE_GUARANTEE", label: "Corporate guarantee to AE" },
  { id: "LOW_VALUE_INTRA_GROUP_SERVICES", label: "Low value-adding intra-group services" },
];

interface Result {
  eligible: boolean;
  requiredMargin: number | null;
  declaredMargin: number | null;
  meetsMargin: boolean | null;
  notes: string[];
}

export default function SafeHarbourCheckerPage() {
  const [form, setForm] = useState({
    category: "SOFTWARE_DEV",
    transactionValueCr: "",
    operatingMargin: "",
    employeeCostRatio: "",
    email: "",
    name: "",
  });
  const [result, setResult] = useState<Result | null>(null);
  const [disclaimer, setDisclaimer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const check = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/tools/safe-harbour", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: form.category,
          transactionValue: Number(form.transactionValueCr) * 10000000,
          operatingMargin: form.operatingMargin || null,
          employeeCostRatio: form.employeeCostRatio || null,
          email: form.email || undefined,
          name: form.name || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data.result);
        setDisclaimer(data.disclaimer);
      } else {
        setError(data.error || "Check failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Simple public header */}
      <header className="border-b border-border bg-surface">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-white">TP</span>
            </div>
            <span className="text-lg font-semibold text-secondary">TP Report</span>
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark"
          >
            Start free trial <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium mb-4">
            <ShieldCheck className="w-3.5 h-3.5" /> Free tool — Rule 10TD as amended March 2025
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Safe Harbour Eligibility Checker
          </h1>
          <p className="text-muted">
            Check in 30 seconds whether your client&apos;s international transactions qualify for
            India&apos;s transfer pricing safe harbour — and the margin they need to declare.
          </p>
        </div>

        <form onSubmit={check} className="bg-surface border border-border rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Transaction category
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Transaction value (₹ Cr) <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                required
                step="0.01"
                value={form.transactionValueCr}
                onChange={(e) => setForm((p) => ({ ...p, transactionValueCr: e.target.value }))}
                placeholder="e.g. 85"
                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Operating margin % (OP/OE)
              </label>
              <input
                type="number"
                step="0.01"
                value={form.operatingMargin}
                onChange={(e) => setForm((p) => ({ ...p, operatingMargin: e.target.value }))}
                placeholder="optional"
                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Employee cost % (KPO only)
              </label>
              <input
                type="number"
                step="0.01"
                value={form.employeeCostRatio}
                onChange={(e) => setForm((p) => ({ ...p, employeeCostRatio: e.target.value }))}
                placeholder="optional"
                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Your name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="CA name (optional)"
                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Email <span className="text-xs text-muted">(to receive the detailed breakdown)</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="you@firm.in"
                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted"
              />
            </div>
          </div>
          {error && (
            <div className="p-3 bg-danger/10 border border-danger/30 rounded-lg text-sm text-danger">{error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark font-medium disabled:opacity-50 inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            Check eligibility
          </button>
        </form>

        {result && (
          <div
            className={`mt-6 rounded-xl border p-6 ${
              result.eligible ? "bg-success/5 border-success/30" : "bg-danger/5 border-danger/30"
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              {result.eligible ? (
                <CheckCircle2 className="w-6 h-6 text-success" />
              ) : (
                <XCircle className="w-6 h-6 text-danger" />
              )}
              <h2 className="text-lg font-semibold text-foreground">
                {result.eligible ? "Likely eligible for safe harbour" : "Not eligible for safe harbour"}
              </h2>
            </div>
            {result.requiredMargin !== null && (
              <p className="text-sm text-foreground mb-2">
                Required operating margin: <b>{result.requiredMargin}%</b>
                {result.declaredMargin !== null && (
                  <>
                    {" "}· Declared: <b>{result.declaredMargin}%</b> —{" "}
                    {result.meetsMargin ? (
                      <span className="text-success font-medium">meets the threshold</span>
                    ) : (
                      <span className="text-danger font-medium">below the threshold</span>
                    )}
                  </>
                )}
              </p>
            )}
            <ul className="space-y-1 mb-4">
              {result.notes.map((n, i) => (
                <li key={i} className="text-sm text-muted">• {n}</li>
              ))}
            </ul>
            <div className="p-4 bg-surface border border-border rounded-lg">
              <p className="text-sm text-foreground font-medium mb-1">
                Next step: Form 3CEFA before the return due date.
              </p>
              <p className="text-sm text-muted mb-3">
                TP Report tracks safe-harbour elections, generates the full documentation pack, and
                monitors every TP deadline for your clients.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark"
              >
                Try TP Report free <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            {disclaimer && <p className="text-xs text-muted mt-4">{disclaimer}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
