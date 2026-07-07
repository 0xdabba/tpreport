/**
 * Regime mapping — Income-tax Act, 1961 vs Income-tax Act, 2025.
 *
 * The Income-tax Act 2025 (effective for tax years beginning 1 April 2026)
 * renumbers the TP provisions and forms. Documents and deadlines generated for
 * FY 2026-27 onwards use the new labels; earlier FYs keep the 1961-Act labels.
 * The mapping below covers the labels this app prints. Final rules/forms were
 * still being notified through 2026 — every new-regime label carries a
 * verification note in generated documents.
 */

export type Regime = "ACT_1961" | "ACT_2025";

export function regimeForFY(financialYear: string): Regime {
  const startYear = parseInt(financialYear.split("-")[0], 10);
  return startYear >= 2026 ? "ACT_2025" : "ACT_1961";
}

export const REGIME_LABELS: Record<
  Regime,
  {
    actName: string;
    tpChapter: string;
    almSection: string; // arm's length computation
    auditReportSection: string; // 92E equivalent
    auditForm: string; // 3CEB equivalent
    masterFileForm: string;
    cbcrForm: string;
    note: string | null;
  }
> = {
  ACT_1961: {
    actName: "Income-tax Act, 1961",
    tpChapter: "Chapter X (Sections 92 to 92F)",
    almSection: "Section 92C read with Rule 10C",
    auditReportSection: "Section 92E",
    auditForm: "Form 3CEB",
    masterFileForm: "Form 3CEAA",
    cbcrForm: "Form 3CEAD",
    note: null,
  },
  ACT_2025: {
    actName: "Income-tax Act, 2025",
    tpChapter: "Chapter (Transfer Pricing) — Sections 161 to 174",
    almSection: "Section 165 (arm's length price computation)",
    auditReportSection: "Section 172",
    auditForm: "Form 48",
    masterFileForm: "Master File (per new rules)",
    cbcrForm: "CbCR (per new rules)",
    note: "Labels per the Income-tax Act, 2025 and draft rules — verify form numbers against the final CBDT notification before filing.",
  },
};

export function regimeLabels(financialYear: string) {
  return REGIME_LABELS[regimeForFY(financialYear)];
}

/** Old→new quick-reference rows for the transition guide page. */
export const TRANSITION_MAP: { topic: string; old: string; new_: string }[] = [
  { topic: "Governing Act", old: "Income-tax Act, 1961", new_: "Income-tax Act, 2025 (from tax year 2026-27)" },
  { topic: "TP chapter", old: "Chapter X, Sections 92–92F", new_: "Sections 161–174" },
  { topic: "Accountant's report", old: "Section 92E / Form 3CEB", new_: "Section 172 / Form 48" },
  { topic: "ALP computation", old: "Section 92C, Rules 10A–10E", new_: "Section 165 + new rules" },
  { topic: "Documentation", old: "Section 92D / Rule 10D", new_: "Section 171 + new rules" },
  { topic: "Safe harbour", old: "Rule 10TA–10TE (₹300 Cr caps)", new_: "Draft: consolidated IT services @ 15.5%, ₹2,000 Cr cap" },
  { topic: "Penalties", old: "271AA / 271BA / 271G", new_: "Renumbered under the 2025 Act — verify final mapping" },
];
