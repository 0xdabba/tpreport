/**
 * Benchmarking engine — parses comparables exported from Capitaline / Ace TP /
 * Prowess (xlsx), runs quantitative screening, and computes the arm's length
 * range per Indian Rule 10CA (35th–65th percentile when the dataset permits,
 * else arithmetic mean).
 *
 * IMPORTANT: this module never invents companies. All comparables come from
 * the uploaded file or the built-in CompanyFinancials dataset.
 */

import * as XLSX from "xlsx";

export type RawComparable = {
  name: string;
  cin?: string;
  businessDesc?: string;
  fyLabels: string[]; // e.g. ["FY23","FY24","FY25"] oldest→newest
  revenues: (number | null)[]; // INR crore
  opProfits: (number | null)[]; // INR crore
  margins: (number | null)[]; // % — computed if not present
  rptPct?: number | null;
};

export type ScreenedComparable = RawComparable & {
  wavgMargin: number | null;
  accepted: boolean;
  rejectReason: string | null;
};

export type ScreeningParams = {
  pli: "OP/TC" | "OP/OR";
  rptThreshold: number; // %
  turnoverMin?: number | null; // INR crore
  turnoverMax?: number | null;
};

export type AlpRange = {
  method: "percentile" | "mean";
  count: number;
  p35: number | null;
  median: number | null;
  p65: number | null;
  mean: number | null;
  min: number | null;
  max: number | null;
};

// ---------------------------------------------------------------------------
// Excel parsing — tolerant header matching for common DB export layouts
// ---------------------------------------------------------------------------

const NAME_KEYS = ["company", "company name", "name"];
const DESC_KEYS = ["business", "description", "business description", "products", "activity"];
const CIN_KEYS = ["cin"];
const RPT_KEYS = ["rpt", "rpt %", "rpt%", "related party", "related party %"];

function normKey(k: string): string {
  return k.toLowerCase().replace(/[^a-z0-9% ]/g, "").trim();
}

function matchKey(keys: string[], candidates: string[]): string | undefined {
  return keys.find((k) => candidates.some((c) => normKey(k).includes(c)));
}

/** Find columns like "Revenue FY23" / "Sales 2023" / "OP FY24" / "Margin FY25". */
function yearColumns(keys: string[], stems: string[]): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  for (const k of keys) {
    const nk = normKey(k);
    if (stems.some((s) => nk.includes(s))) {
      const yearMatch = k.match(/(fy\s?'?\d{2,4}|20\d{2}[-–]?\d{0,2})/i);
      out.push({ key: k, label: yearMatch ? yearMatch[1].toUpperCase().replace(/\s/g, "") : k });
    }
  }
  return out.slice(0, 3);
}

export function parseComparablesXlsx(buf: Buffer): { comparables: RawComparable[]; warnings: string[] } {
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
  const warnings: string[] = [];
  if (rows.length === 0) return { comparables: [], warnings: ["No data rows found in the first sheet"] };

  const keys = Object.keys(rows[0]);
  const nameKey = matchKey(keys, NAME_KEYS);
  if (!nameKey) {
    return { comparables: [], warnings: [`Could not find a company-name column. Found columns: ${keys.join(", ")}`] };
  }
  const descKey = matchKey(keys, DESC_KEYS);
  const cinKey = matchKey(keys, CIN_KEYS);
  const rptKey = matchKey(keys, RPT_KEYS);

  const revCols = yearColumns(keys, ["revenue", "sales", "turnover", "operating income", "total income"]);
  const opCols = yearColumns(keys, ["op ", "operating profit", "ebit", "pbit", "op/"]).filter(
    (c) => !revCols.some((r) => r.key === c.key)
  );
  const marginCols = yearColumns(keys, ["margin", "op/tc", "op/or", "pli", "ncp"]);

  if (revCols.length === 0 && marginCols.length === 0) {
    warnings.push(
      "No revenue or margin year-columns detected — margins cannot be computed. Expected headers like 'Revenue FY23' or 'OP/TC FY23'."
    );
  }

  const num = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[,%₹\s]/g, ""));
    return Number.isFinite(n) ? n : null;
  };

  const comparables: RawComparable[] = rows
    .filter((r) => r[nameKey])
    .map((r) => {
      const revenues = revCols.map((c) => num(r[c.key]));
      const opProfits = opCols.map((c) => num(r[c.key]));
      let margins = marginCols.map((c) => num(r[c.key]));
      if (margins.length === 0 && revenues.length > 0 && opProfits.length > 0) {
        margins = revenues.map((rev, i) => {
          const op = opProfits[i];
          if (rev === null || op === null || rev === 0) return null;
          return Math.round((op / rev) * 10000) / 100; // OP/OR default at parse time
        });
      }
      const fyLabels = (revCols.length ? revCols : marginCols).map((c) => c.label);
      return {
        name: String(r[nameKey]),
        cin: cinKey ? String(r[cinKey] || "") || undefined : undefined,
        businessDesc: descKey ? String(r[descKey] || "") || undefined : undefined,
        fyLabels,
        revenues,
        opProfits,
        margins,
        rptPct: rptKey ? num(r[rptKey]) : null,
      };
    });

  return { comparables, warnings };
}

// ---------------------------------------------------------------------------
// Screening
// ---------------------------------------------------------------------------

export function screenComparables(
  raw: RawComparable[],
  params: ScreeningParams
): ScreenedComparable[] {
  return raw.map((c) => {
    let accepted = true;
    let rejectReason: string | null = null;

    const availableYears = c.margins.filter((m) => m !== null).length;
    const wavgMargin = weightedAvgMargin(c, params.pli);

    if (availableYears === 0) {
      accepted = false;
      rejectReason = "No margin data available for any year";
    } else if (availableYears < 2) {
      accepted = false;
      rejectReason = "Financial data available for fewer than 2 of 3 years";
    } else if (c.rptPct !== null && c.rptPct !== undefined && c.rptPct > params.rptThreshold) {
      accepted = false;
      rejectReason = `Related-party transactions ${c.rptPct}% exceed ${params.rptThreshold}% threshold`;
    } else if (c.margins.every((m) => m !== null && m < 0)) {
      accepted = false;
      rejectReason = "Persistent operating losses in all available years";
    } else {
      const latestRev = [...c.revenues].reverse().find((r) => r !== null);
      if (params.turnoverMin != null && latestRev != null && latestRev < params.turnoverMin) {
        accepted = false;
        rejectReason = `Turnover ₹${latestRev} Cr below minimum ₹${params.turnoverMin} Cr`;
      } else if (params.turnoverMax != null && latestRev != null && latestRev > params.turnoverMax) {
        accepted = false;
        rejectReason = `Turnover ₹${latestRev} Cr above maximum ₹${params.turnoverMax} Cr`;
      }
    }

    return { ...c, wavgMargin, accepted, rejectReason };
  });
}

/**
 * Weighted average margin across years per Rule 10CA(2): aggregate numerator /
 * aggregate denominator, not simple average of ratios.
 * OP/OR: ΣOP / ΣRevenue. OP/TC: ΣOP / Σ(Revenue − OP).
 */
export function weightedAvgMargin(c: RawComparable, pli: "OP/TC" | "OP/OR"): number | null {
  let sumOp = 0;
  let sumRev = 0;
  let n = 0;
  for (let i = 0; i < Math.max(c.revenues.length, c.margins.length); i++) {
    const rev = c.revenues[i];
    const op = c.opProfits[i];
    if (rev !== null && rev !== undefined && op !== null && op !== undefined) {
      sumOp += op;
      sumRev += rev;
      n++;
    }
  }
  if (n > 0 && sumRev > 0) {
    const denom = pli === "OP/TC" ? sumRev - sumOp : sumRev;
    if (denom > 0) return Math.round((sumOp / denom) * 10000) / 100;
  }
  // fall back to simple average of margin column
  const ms = c.margins.filter((m): m is number => m !== null);
  if (ms.length === 0) return null;
  return Math.round((ms.reduce((a, b) => a + b, 0) / ms.length) * 100) / 100;
}

// ---------------------------------------------------------------------------
// Arm's length range — Rule 10CA
// ---------------------------------------------------------------------------

/**
 * Rule 10CA: where 6+ comparables in the dataset, the range is the 35th to
 * 65th percentile; otherwise the arithmetic mean applies (±3% tolerance band
 * per the annual CBDT notification — surfaced in the report text, not here).
 * Percentile placement: place = count × p/100; if integral, take the value at
 * that place (ordered ascending); else the next higher place.
 */
export function computeAlpRange(margins: number[]): AlpRange {
  const vals = [...margins].sort((a, b) => a - b);
  const n = vals.length;
  if (n === 0) {
    return { method: "mean", count: 0, p35: null, median: null, p65: null, mean: null, min: null, max: null };
  }
  const mean = Math.round((vals.reduce((a, b) => a + b, 0) / n) * 100) / 100;
  if (n < 6) {
    return {
      method: "mean",
      count: n,
      p35: null,
      median: percentile(vals, 50),
      p65: null,
      mean,
      min: vals[0],
      max: vals[n - 1],
    };
  }
  return {
    method: "percentile",
    count: n,
    p35: percentile(vals, 35),
    median: percentile(vals, 50),
    p65: percentile(vals, 65),
    mean,
    min: vals[0],
    max: vals[n - 1],
  };
}

function percentile(sortedAsc: number[], p: number): number {
  const n = sortedAsc.length;
  const place = (n * p) / 100;
  if (Number.isInteger(place)) {
    const idx = place - 1; // 1-based place → 0-based
    const v = (sortedAsc[idx] + sortedAsc[Math.min(idx + 1, n - 1)]) / 2;
    return Math.round(v * 100) / 100;
  }
  const idx = Math.ceil(place) - 1;
  return Math.round(sortedAsc[Math.max(0, idx)] * 100) / 100;
}

// ---------------------------------------------------------------------------
// Search funnel summary (for the search-process section of the report)
// ---------------------------------------------------------------------------

export function buildSearchFunnel(
  totalParsed: number,
  screened: ScreenedComparable[]
): { step: string; count: number }[] {
  const afterRpt = screened.filter(
    (c) => !c.rejectReason?.includes("Related-party")
  ).length;
  const afterLoss = screened.filter(
    (c) => !c.rejectReason?.includes("Related-party") && !c.rejectReason?.includes("Persistent")
  ).length;
  const accepted = screened.filter((c) => c.accepted).length;
  return [
    { step: "Companies in initial search set (database export)", count: totalParsed },
    { step: "After related-party transaction filter", count: afterRpt },
    { step: "After persistent-loss filter", count: afterLoss },
    { step: "Final accepted comparable set (incl. turnover & data-availability filters)", count: accepted },
  ];
}
