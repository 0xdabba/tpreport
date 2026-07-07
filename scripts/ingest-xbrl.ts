/**
 * MCA AOC-4 XBRL ingest pipeline (Phase 3).
 *
 * Usage:
 *   npx tsx scripts/ingest-xbrl.ts <dir-of-xbrl-files> [--demo]
 *
 * Parses MCA XBRL instance documents (AOC-4 filings downloaded from the MCA
 * portal / bulk data product), extracts the fields the benchmarking module
 * needs, and POSTs them into the built-in comparables dataset via
 * /api/comparables (or writes JSON with --out for manual import).
 *
 * MCA XBRL uses the in-ind-gaap taxonomy. The tags below cover the common
 * variants across taxonomy years; verify a sample against source filings
 * before trusting a bulk import — this pipeline asserts nothing it can't
 * parse and skips files with missing essentials.
 */

import fs from "fs";
import path from "path";

type ParsedCompany = {
  cin: string | null;
  name: string;
  nicCode: string | null;
  businessDesc: string | null;
  fyLabels: string[];
  revenues: (number | null)[];
  opProfits: (number | null)[];
  rptPct: number | null;
  dataSource: string;
  isDemo: boolean;
};

// Tag variants across in-ind-gaap taxonomy years
const TAGS = {
  name: ["NameOfCompany", "CompanyName"],
  cin: ["CorporateIdentityNumber", "CIN"],
  nic: ["DescriptionOfMainProductsServices", "NICCodeOfProductService", "NatureOfBusiness"],
  revenue: ["RevenueFromOperations", "TotalRevenue", "SaleOfGoodsManufactured", "IncomeFromServices"],
  profitBeforeTax: ["ProfitBeforeTax", "ProfitLossBeforeTax"],
  financeCosts: ["FinanceCosts", "InterestExpense"],
  otherIncome: ["OtherIncome"],
  rpt: ["TransactionsWithRelatedParties", "AmountOfRelatedPartyTransactions"],
};

function extract(xml: string, tags: string[], context?: string): string | null {
  for (const tag of tags) {
    // match <prefix:Tag contextRef="...">value</prefix:Tag>
    const re = new RegExp(
      `<[\\w-]*:?${tag}[^>]*${context ? `contextRef="[^"]*${context}[^"]*"` : ""}[^>]*>([^<]+)<`,
      "i"
    );
    const m = xml.match(re);
    if (m) return m[1].trim();
  }
  return null;
}

function num(s: string | null): number | null {
  if (!s) return null;
  const n = parseFloat(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function parseXbrlFile(filePath: string): ParsedCompany | null {
  const xml = fs.readFileSync(filePath, "utf8");

  const name = extract(xml, TAGS.name);
  if (!name) return null;

  // Current year (I) and previous year (P) contexts are the MCA convention
  const revCurrent = num(extract(xml, TAGS.revenue, "Current"));
  const revPrev = num(extract(xml, TAGS.revenue, "Previous"));
  const pbtCurrent = num(extract(xml, TAGS.profitBeforeTax, "Current"));
  const pbtPrev = num(extract(xml, TAGS.profitBeforeTax, "Previous"));
  const finCurrent = num(extract(xml, TAGS.financeCosts, "Current")) || 0;
  const finPrev = num(extract(xml, TAGS.financeCosts, "Previous")) || 0;
  const oiCurrent = num(extract(xml, TAGS.otherIncome, "Current")) || 0;
  const oiPrev = num(extract(xml, TAGS.otherIncome, "Previous")) || 0;

  if (revCurrent === null && revPrev === null) return null;

  // Operating profit ≈ PBT + finance costs − other income (standard TP practice)
  const opCurrent = pbtCurrent === null ? null : pbtCurrent + finCurrent - oiCurrent;
  const opPrev = pbtPrev === null ? null : pbtPrev + finPrev - oiPrev;

  const toCr = (v: number | null) => (v === null ? null : Math.round((v / 10000000) * 100) / 100);

  const rptAmt = num(extract(xml, TAGS.rpt, "Current"));
  const rptPct =
    rptAmt !== null && revCurrent ? Math.round((rptAmt / revCurrent) * 10000) / 100 : null;

  return {
    cin: extract(xml, TAGS.cin),
    name,
    nicCode: null,
    businessDesc: extract(xml, TAGS.nic),
    fyLabels: ["Prev FY", "Current FY"],
    revenues: [toCr(revPrev), toCr(revCurrent)],
    opProfits: [toCr(opPrev), toCr(opCurrent)],
    rptPct,
    dataSource: "MCA_XBRL",
    isDemo: false,
  };
}

async function main() {
  const [dir, ...flags] = process.argv.slice(2);
  if (!dir) {
    console.error("Usage: npx tsx scripts/ingest-xbrl.ts <dir> [--out file.json]");
    process.exit(1);
  }

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".xml") || f.endsWith(".xbrl"))
    .map((f) => path.join(dir, f));

  console.log(`Parsing ${files.length} XBRL files from ${dir}...`);
  const companies: ParsedCompany[] = [];
  let skipped = 0;
  for (const f of files) {
    try {
      const parsed = parseXbrlFile(f);
      if (parsed) companies.push(parsed);
      else skipped++;
    } catch {
      skipped++;
    }
  }
  console.log(`Parsed ${companies.length}, skipped ${skipped}.`);

  const outIdx = flags.indexOf("--out");
  const outFile = outIdx >= 0 ? flags[outIdx + 1] : "comparables-import.json";
  fs.writeFileSync(outFile, JSON.stringify({ companies }, null, 2));
  console.log(
    `Wrote ${outFile}. Import via: curl -X POST <app>/api/comparables -H 'Content-Type: application/json' --cookie <session> -d @${outFile}`
  );
}

if (require.main === module) {
  main();
}
