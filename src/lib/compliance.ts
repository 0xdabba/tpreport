/**
 * Statutory TP compliance deadline engine for India.
 *
 * Given a client's facts (international transactions, SDT, consolidated group
 * revenue) and a financial year, computes which filings apply and their due
 * dates. Thresholds per Income-tax Rules 10DA/10DB as amended; due dates per
 * the Act/Rules for a normal (non-extended) year — CBDT extensions must be
 * handled by the user marking items done.
 */

export type DeadlineKind =
  | "FORM_3CEB"
  | "ITR_TP"
  | "MASTER_FILE_3CEAA"
  | "MF_INTIMATION_3CEAB"
  | "CBCR_3CEAD"
  | "CBCR_INTIMATION_3CEAC"
  | "SAFE_HARBOUR_3CEFA";

export type ClientComplianceFacts = {
  hasIntlTxn: boolean;
  hasSDT: boolean; // aggregate SDT > ₹20 crore (Sec 92BA)
  intlTxnValue?: number | null; // INR
  intangiblesTxnValue?: number | null; // INR
  groupRevenue?: number | null; // consolidated group revenue, INR
  isConstituentOfIntlGroup?: boolean;
};

export type ComputedDeadline = {
  kind: DeadlineKind;
  label: string;
  dueDate: Date;
  applicable: boolean;
  reason: string;
};

const CR = 10000000; // 1 crore in INR

/**
 * financialYear format: "2025-26" meaning FY 1 Apr 2025 – 31 Mar 2026,
 * assessment year 2026-27.
 */
export function fyEndYear(financialYear: string): number {
  const [startStr] = financialYear.split("-");
  return parseInt(startStr, 10) + 1;
}

export function computeDeadlines(
  facts: ClientComplianceFacts,
  financialYear: string
): ComputedDeadline[] {
  const ayYear = fyEndYear(financialYear); // FY 2025-26 → AY starts 2026
  const out: ComputedDeadline[] = [];

  const tpApplies = facts.hasIntlTxn || facts.hasSDT;

  // Form 3CEB — accountant's report u/s 92E. Due one month before ITR due
  // date → 31 October of AY. Applies to ANY international transaction with an
  // AE (no de minimis) and to SDT above ₹20 crore.
  out.push({
    kind: "FORM_3CEB",
    label: "Form 3CEB — Accountant's Report (Sec 92E)",
    dueDate: new Date(Date.UTC(ayYear, 9, 31)), // 31 Oct
    applicable: tpApplies,
    reason: facts.hasIntlTxn
      ? "Client has international transactions with associated enterprises"
      : facts.hasSDT
        ? "Client has specified domestic transactions above ₹20 crore"
        : "No international transactions or SDT recorded",
  });

  // ITR for TP cases — 30 November of AY.
  out.push({
    kind: "ITR_TP",
    label: "Income-tax Return (transfer pricing case)",
    dueDate: new Date(Date.UTC(ayYear, 10, 30)), // 30 Nov
    applicable: tpApplies,
    reason: "ITR due date for assessees subject to transfer pricing is 30 November",
  });

  // Master File Form 3CEAA (Rule 10DA):
  // Part A — every constituent entity of an international group (no threshold).
  // Part B — consolidated group revenue > ₹500 crore AND (aggregate intl txn
  // > ₹50 crore OR intangibles-related txn > ₹10 crore).
  const partB =
    (facts.groupRevenue || 0) > 500 * CR &&
    ((facts.intlTxnValue || 0) > 50 * CR ||
      (facts.intangiblesTxnValue || 0) > 10 * CR);
  const partA = !!facts.isConstituentOfIntlGroup || facts.hasIntlTxn;
  out.push({
    kind: "MASTER_FILE_3CEAA",
    label: partB
      ? "Form 3CEAA — Master File (Parts A & B, Rule 10DA)"
      : "Form 3CEAA — Master File (Part A only)",
    dueDate: new Date(Date.UTC(ayYear, 10, 30)), // 30 Nov (ITR due date)
    applicable: partA || partB,
    reason: partB
      ? "Group revenue > ₹500 Cr and transaction thresholds crossed — full Master File"
      : partA
        ? "Constituent of an international group — Part A applies (no threshold)"
        : "Not a constituent of an international group",
  });

  // Form 3CEAB — intimation for MF when multiple Indian constituent entities
  // designate one filer. Due 30 days before 3CEAA → 31 Oct. We surface it only
  // when full MF applies (best-effort; single-entity groups can mark N/A).
  out.push({
    kind: "MF_INTIMATION_3CEAB",
    label: "Form 3CEAB — Master File intimation (designated entity)",
    dueDate: new Date(Date.UTC(ayYear, 9, 31)),
    applicable: partB,
    reason: partB
      ? "Required 30 days before Form 3CEAA where a designated entity files for the group"
      : "Full Master File not applicable",
  });

  // CbCR Form 3CEAD (Rule 10DB) — consolidated group revenue > ₹6,400 crore.
  // Due 12 months from end of the reporting accounting year → 31 Mar following
  // the AY start.
  const cbcr = (facts.groupRevenue || 0) > 6400 * CR;
  out.push({
    kind: "CBCR_3CEAD",
    label: "Form 3CEAD — Country-by-Country Report (Rule 10DB)",
    dueDate: new Date(Date.UTC(ayYear + 1, 2, 31)), // 31 Mar next year
    applicable: cbcr,
    reason: cbcr
      ? "Consolidated group revenue exceeds ₹6,400 crore"
      : "Consolidated group revenue below ₹6,400 crore",
  });

  // Form 3CEAC — CbCR intimation by Indian constituent of a foreign-parented
  // group. At least 2 months before 3CEAD due date → 31 Jan.
  out.push({
    kind: "CBCR_INTIMATION_3CEAC",
    label: "Form 3CEAC — CbCR intimation",
    dueDate: new Date(Date.UTC(ayYear + 1, 0, 31)), // 31 Jan
    applicable: cbcr,
    reason: cbcr
      ? "Required at least two months before the CbCR due date"
      : "CbCR not applicable",
  });

  // Safe Harbour Form 3CEFA — on or before ITR due date.
  out.push({
    kind: "SAFE_HARBOUR_3CEFA",
    label: "Form 3CEFA — Safe Harbour option (Rule 10TE)",
    dueDate: new Date(Date.UTC(ayYear, 10, 30)),
    applicable: facts.hasIntlTxn,
    reason: facts.hasIntlTxn
      ? "Optional — file to elect safe harbour for eligible transactions"
      : "No international transactions",
  });

  return out;
}

export function currentFinancialYear(now = new Date()): string {
  // FY runs Apr–Mar. In Jul 2026 the FY being *reported* (last completed)
  // is 2025-26.
  const y = now.getFullYear();
  const startYear = now.getMonth() >= 3 ? y - 1 : y - 2;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}

export const REMINDER_OFFSETS = [30, 7, 1] as const;

export function daysUntil(date: Date, now = new Date()): number {
  return Math.ceil((date.getTime() - now.getTime()) / 86400000);
}
