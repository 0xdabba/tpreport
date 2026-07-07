import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";

export const metadata = {
  title: "Income-tax Act 2025: Transfer Pricing Transition Guide | TP Report",
  description:
    "What the Income-tax Act 2025 changes for transfer pricing practitioners — Form 3CEB to Form 48, renumbered sections, safe harbour overhaul.",
};

const TRANSITION_MAP = [
  { topic: "Governing Act", old: "Income-tax Act, 1961", new_: "Income-tax Act, 2025 (from tax year 2026-27)" },
  { topic: "TP chapter", old: "Chapter X, Sections 92–92F", new_: "Sections 161–174" },
  { topic: "Accountant's report", old: "Section 92E / Form 3CEB", new_: "Section 172 / Form 48" },
  { topic: "ALP computation", old: "Section 92C, Rules 10A–10E", new_: "Section 165 + new rules" },
  { topic: "Documentation", old: "Section 92D / Rule 10D", new_: "Section 171 + new rules" },
  { topic: "Safe harbour", old: "Rule 10TA–10TE (₹300 Cr caps)", new_: "Draft: consolidated IT services @ 15.5%, ₹2,000 Cr cap" },
  { topic: "Penalties", old: "271AA / 271BA / 271G", new_: "Renumbered under the 2025 Act — verify final mapping" },
];

export default function NewActGuidePage() {
  return (
    <div className="min-h-screen bg-background">
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

      <article className="max-w-3xl mx-auto px-4 py-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium mb-4">
          <BookOpen className="w-3.5 h-3.5" /> Practitioner guide
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-4">
          The Income-tax Act 2025: what changes for your transfer pricing practice
        </h1>
        <p className="text-muted text-lg mb-8">
          From tax year 2026-27, India&apos;s transfer pricing regime moves from the 1961 Act to the
          Income-tax Act 2025. Sections are renumbered, forms are renamed — Form 3CEB becomes Form
          48 — and every template, checklist, and internal tool in your firm goes stale at once.
          Here is the quick-reference mapping.
        </p>

        <div className="bg-surface border border-border rounded-xl overflow-hidden mb-8">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-muted text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Topic</th>
                <th className="text-left px-4 py-3">1961 Act (until FY 2025-26)</th>
                <th className="text-left px-4 py-3">2025 Act (from FY 2026-27)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {TRANSITION_MAP.map((r) => (
                <tr key={r.topic}>
                  <td className="px-4 py-3 font-medium text-foreground">{r.topic}</td>
                  <td className="px-4 py-3 text-muted">{r.old}</td>
                  <td className="px-4 py-3 text-foreground">{r.new_}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="text-xl font-bold text-foreground mb-3">What you should do this season</h2>
        <ul className="space-y-2 text-foreground mb-8">
          <li>• <b>FY 2025-26 filings (due Oct–Nov 2026) still use the 1961-Act forms</b> — Form 3CEB, 3CEAA, 3CEAD as usual.</li>
          <li>• <b>Engagement letters spanning FY 2026-27</b> should reference both regimes to avoid re-papering.</li>
          <li>• <b>Safe harbour advice</b> given now should flag the draft 2025-Act rules (consolidated IT-services category at 15.5%, ₹2,000 crore cap) — clients above today&apos;s ₹300 crore cap may become eligible.</li>
          <li>• <b>Templates and internal checklists</b> need a dual-regime version — or a tool that switches labels by financial year automatically.</li>
        </ul>

        <div className="p-6 bg-primary/5 border border-primary/20 rounded-xl mb-8">
          <p className="text-foreground font-medium mb-2">
            TP Report is regime-aware out of the box.
          </p>
          <p className="text-muted text-sm mb-4">
            Pick the financial year and every generated document, deadline, and form label switches
            between the 1961 Act and the 2025 Act automatically. No stale templates, no missed
            renumbering.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark"
          >
            Start your free trial <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <p className="text-xs text-muted">
          Disclaimer: section and form mappings under the Income-tax Act 2025 reflect the Act as
          enacted and draft rules in circulation; final CBDT notifications may differ. Verify
          against the notified rules before filing. This guide is editorial, not legal advice.
        </p>
      </article>
    </div>
  );
}
