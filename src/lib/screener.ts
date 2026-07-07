/**
 * Client-base TP opportunity screener. Takes a firm's client list (from an
 * Excel upload) and flags, per client, which TP obligations likely apply and
 * the estimated engagement fee — turning a compliance obligation into a
 * pipeline report for the firm.
 */

import * as XLSX from "xlsx";
import { checkSafeHarbour, SafeHarbourCategory } from "@/lib/safe-harbour";

const CR = 10000000;

export type ScreenerRow = {
  name: string;
  industry?: string | null;
  turnover?: number | null; // INR
  hasForeignAE: boolean;
  intlTxnValue?: number | null; // INR
  sdtValue?: number | null; // INR
  groupRevenue?: number | null; // INR consolidated
};

export type ScreenedRow = ScreenerRow & {
  need3CEB: boolean;
  needMasterFile: boolean;
  masterFilePartB: boolean;
  needCbCR: boolean;
  safeHarbourEligible: boolean;
  safeHarbourCategory: string | null;
  flags: string[];
  estimatedFee: number; // INR
};

export type ScreenerSummary = {
  total: number;
  need3ceb: number;
  needMf: number;
  needCbcr: number;
  shEligible: number;
  feePotential: number;
};

function industryToShCategory(industry: string | null | undefined): SafeHarbourCategory | null {
  if (!industry) return null;
  const s = industry.toLowerCase();
  if (s.includes("software") || s.includes("it services")) return "SOFTWARE_DEV";
  if (s.includes("bpo") || s.includes("ites") || s.includes("it-enabled")) return "ITES";
  if (s.includes("kpo") || s.includes("analytics")) return "KPO";
  if (s.includes("pharma")) return "CONTRACT_RND_PHARMA";
  if (s.includes("auto")) return "AUTO_COMPONENTS_CORE";
  return null;
}

export function screenRow(row: ScreenerRow): ScreenedRow {
  const flags: string[] = [];
  let estimatedFee = 0;

  const intl = row.intlTxnValue || 0;
  const sdt = row.sdtValue || 0;
  const group = row.groupRevenue || 0;

  const need3CEB = (row.hasForeignAE && intl > 0) || sdt > 20 * CR;
  if (need3CEB) {
    flags.push(
      row.hasForeignAE && intl > 0
        ? "Form 3CEB required — international transactions with AE (no de minimis)"
        : "Form 3CEB required — SDT above ₹20 crore"
    );
    estimatedFee += 75000; // 3CEB
    estimatedFee += 150000; // TP study
    if (intl > 5 * CR) estimatedFee += 75000; // benchmarking realistically needed
  }

  const masterFilePartB =
    group > 500 * CR && intl > 50 * CR;
  const needMasterFile = masterFilePartB || (row.hasForeignAE && intl > 0);
  if (masterFilePartB) {
    flags.push("Full Master File (3CEAA Parts A & B) — group revenue > ₹500 Cr and intl txns > ₹50 Cr");
    estimatedFee += 100000;
  } else if (needMasterFile) {
    flags.push("Master File Part A only (constituent of international group)");
    estimatedFee += 25000;
  }

  const needCbCR = group > 6400 * CR;
  if (needCbCR) {
    flags.push("CbCR applicable — group revenue > ₹6,400 Cr (3CEAD/3CEAC)");
    estimatedFee += 125000;
  }

  const shCat = industryToShCategory(row.industry);
  let safeHarbourEligible = false;
  if (shCat && intl > 0) {
    const res = checkSafeHarbour({ category: shCat, transactionValue: intl });
    safeHarbourEligible = res.eligible;
    if (res.eligible) {
      flags.push(`Safe harbour candidate (${shCat.replace(/_/g, " ").toLowerCase()}) — evaluate Form 3CEFA election`);
      estimatedFee += 50000;
    }
  }

  return {
    ...row,
    need3CEB,
    needMasterFile,
    masterFilePartB,
    needCbCR,
    safeHarbourEligible,
    safeHarbourCategory: safeHarbourEligible ? shCat : null,
    flags,
    estimatedFee: need3CEB || needMasterFile || needCbCR ? estimatedFee : 0,
  };
}

export function summarize(rows: ScreenedRow[]): ScreenerSummary {
  return {
    total: rows.length,
    need3ceb: rows.filter((r) => r.need3CEB).length,
    needMf: rows.filter((r) => r.masterFilePartB).length,
    needCbcr: rows.filter((r) => r.needCbCR).length,
    shEligible: rows.filter((r) => r.safeHarbourEligible).length,
    feePotential: rows.reduce((a, b) => a + b.estimatedFee, 0),
  };
}

// ---------------------------------------------------------------------------
// Excel parsing
// ---------------------------------------------------------------------------

export function parseScreenerXlsx(buf: Buffer): { rows: ScreenerRow[]; warnings: string[] } {
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
  const warnings: string[] = [];
  if (raw.length === 0) return { rows: [], warnings: ["No data rows found"] };

  const keys = Object.keys(raw[0]);
  const find = (...cands: string[]) =>
    keys.find((k) => cands.some((c) => k.toLowerCase().replace(/[^a-z0-9 ]/g, "").includes(c)));

  const nameKey = find("client", "name", "company");
  if (!nameKey) return { rows: [], warnings: [`No client-name column found. Columns: ${keys.join(", ")}`] };
  const industryKey = find("industry", "sector", "business");
  const turnoverKey = find("turnover", "revenue");
  const aeKey = find("foreign ae", "foreign", "ae", "associated");
  const intlKey = find("international", "intl", "cross border");
  const sdtKey = find("sdt", "domestic");
  const groupKey = find("group", "consolidated");

  const num = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[,₹\s]/g, ""));
    return Number.isFinite(n) ? n : null;
  };
  const bool = (v: unknown): boolean => {
    if (typeof v === "boolean") return v;
    const s = String(v || "").toLowerCase();
    return s === "yes" || s === "y" || s === "true" || s === "1";
  };

  // Values may be entered in crores (common) — heuristic: if the max turnover
  // value is under 100,000 treat the sheet as crore-denominated.
  const sample = raw.map((r) => num(turnoverKey ? r[turnoverKey] : null)).filter((n): n is number => n !== null);
  const inCrores = sample.length > 0 && Math.max(...sample) < 100000;
  if (inCrores) warnings.push("Values look crore-denominated — interpreted as ₹ crore.");
  const scale = (n: number | null) => (n === null ? null : inCrores ? n * 10000000 : n);

  const rows: ScreenerRow[] = raw
    .filter((r) => r[nameKey])
    .map((r) => ({
      name: String(r[nameKey]),
      industry: industryKey ? (r[industryKey] as string) || null : null,
      turnover: scale(num(turnoverKey ? r[turnoverKey] : null)),
      hasForeignAE: aeKey ? bool(r[aeKey]) : false,
      intlTxnValue: scale(num(intlKey ? r[intlKey] : null)),
      sdtValue: scale(num(sdtKey ? r[sdtKey] : null)),
      groupRevenue: scale(num(groupKey ? r[groupKey] : null)),
    }));

  return { rows, warnings };
}
