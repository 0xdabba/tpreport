/**
 * Seed — demo firm with clients, entities, transactions, a screened
 * benchmarking set, statutory deadlines, case-law library, and a DEMO-labeled
 * built-in comparables dataset.
 *
 * Logins: partner@demo.test / staff@demo.test (password: demo1234)
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import path from "path";

// Resolve the file: URL to an absolute path so LibSQL can find the DB
const raw = process.env.DATABASE_URL!;
const dbUrl = raw.startsWith("file:./")
  ? `file:${path.resolve(process.cwd(), raw.slice(5))}`
  : raw;

const adapter = new PrismaLibSql({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

const CR = 10000000;

function deriveToken(purpose: string, id: string): string {
  const secret = process.env.APP_SECRET || process.env.NEXTAUTH_SECRET || "dev-secret";
  return crypto.createHmac("sha256", secret).update(`${purpose}:${id}`).digest("base64url").slice(0, 32);
}
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function main() {
  console.log("Seeding TP Report demo data...");
  const password = await bcrypt.hash("demo1234", 12);

  // --- Firm + users -------------------------------------------------------
  const trialEnd = new Date();
  trialEnd.setFullYear(trialEnd.getFullYear() + 1);

  const firm = await prisma.firm.create({
    data: {
      name: "Demo & Associates LLP",
      addressLine1: "402, Trade Centre, Bandra Kurla Complex",
      city: "Mumbai",
      pincode: "400051",
      email: "tp@demoassociates.in",
      phone: "+91 98200 00000",
      frn: "123456W",
      logoText: "D&A",
      brandColor: "#C2410C",
      plan: "FIRM",
      planExpiresAt: trialEnd,
    },
  });

  const partner = await prisma.user.create({
    data: {
      name: "CA Priya Deshmukh",
      email: "partner@demo.test",
      password,
      firmId: firm.id,
      firmRole: "PARTNER",
      phone: "+91 98200 00001",
    },
  });
  await prisma.user.create({
    data: {
      name: "Arjun Nair",
      email: "staff@demo.test",
      password,
      firmId: firm.id,
      firmRole: "STAFF",
      phone: "+91 98200 00002",
    },
  });

  // --- Client 1: software exporter (safe-harbour / TNMM story) ------------
  const meridian = await prisma.client.create({
    data: {
      name: "Meridian Software Exports Pvt Ltd",
      industry: "Software development services",
      description: "Captive software development centre of Meridian Inc. (USA). Cost-plus remuneration.",
      pan: "AAACM1234F",
      turnover: 85 * CR,
      groupRevenue: 700 * CR,
      hasIntlTxn: true,
      hasSDT: false,
      firmId: firm.id,
      userId: partner.id,
    },
  });

  const meridianUS = await prisma.entity.create({
    data: {
      name: "Meridian Inc.",
      country: "United States",
      entityType: "Ultimate parent",
      role: "Principal / IP owner",
      functions: "Product strategy, sales & marketing, IP ownership, funding",
      risks: "Market risk, product risk, credit risk",
      assets: "Product IP, brand, customer contracts",
      revenue: 620 * CR,
      employees: 900,
      clientId: meridian.id,
    },
  });
  const meridianIN = await prisma.entity.create({
    data: {
      name: "Meridian Software Exports Pvt Ltd",
      country: "India",
      entityType: "Wholly-owned subsidiary",
      role: "Captive software development service provider",
      functions: "Software development, testing, maintenance per parent specifications",
      risks: "Limited — single-customer risk; no market or product risk",
      assets: "Workforce, leased premises, computers; no significant intangibles",
      revenue: 85 * CR,
      expenses: 72 * CR,
      employees: 450,
      clientId: meridian.id,
      parentId: meridianUS.id,
    },
  });
  const meridianTxn = await prisma.transaction.create({
    data: {
      type: "Provision of software development services",
      description: "Offshore software development services billed monthly at cost plus mark-up",
      amount: 85 * CR,
      currency: "INR",
      method: "TNMM",
      fromEntityId: meridianIN.id,
      toEntityId: meridianUS.id,
    },
  });
  const meridianAnalysis = await prisma.functionalAnalysis.create({
    data: {
      status: "complete",
      summary:
        "Indian entity is a routine captive software development service provider bearing limited risks; US parent owns all significant intangibles and bears entrepreneurial risk. TNMM with OP/TC selected as most appropriate method; Indian entity as tested party.",
      functions: "Software development and testing (India); strategy, sales, IP (US)",
      risks: "Limited risk (India); market/product risk (US)",
      assets: "Routine tangible assets (India); IP and brand (US)",
      pricingMethod: "TNMM",
      clientId: meridian.id,
      transactions: { connect: { id: meridianTxn.id } },
    },
  });

  // --- Client 2: pharma with UK subsidiary --------------------------------
  const sunrise = await prisma.client.create({
    data: {
      name: "Sunrise Pharma Labs Ltd",
      industry: "Pharmaceuticals",
      description: "Indian generic pharma parent with UK distribution subsidiary and licensing arrangements.",
      pan: "AAACS5678K",
      turnover: 640 * CR,
      groupRevenue: 830 * CR,
      hasIntlTxn: true,
      hasSDT: true,
      firmId: firm.id,
      userId: partner.id,
    },
  });
  const sunriseIN = await prisma.entity.create({
    data: {
      name: "Sunrise Pharma Labs Ltd",
      country: "India",
      entityType: "Ultimate parent",
      role: "Manufacturer / IP owner",
      functions: "R&D, manufacturing, regulatory filings, global strategy",
      risks: "Product liability, R&D risk, market risk",
      assets: "ANDAs/dossiers, manufacturing plants, brands",
      revenue: 640 * CR,
      expenses: 505 * CR,
      employees: 2100,
      clientId: sunrise.id,
    },
  });
  const sunriseUK = await prisma.entity.create({
    data: {
      name: "Sunrise Pharma UK Ltd",
      country: "United Kingdom",
      entityType: "Wholly-owned subsidiary",
      role: "Limited-risk distributor",
      functions: "Marketing and distribution in UK/EU",
      risks: "Limited inventory and credit risk",
      assets: "Distribution network, marketing team",
      revenue: 190 * CR,
      employees: 60,
      clientId: sunrise.id,
      parentId: sunriseIN.id,
    },
  });
  await prisma.transaction.createMany({
    data: [
      {
        type: "Sale of finished goods",
        description: "Export of generic formulations to UK subsidiary for resale",
        amount: 145 * CR,
        currency: "INR",
        method: "RPM",
        fromEntityId: sunriseIN.id,
        toEntityId: sunriseUK.id,
      },
      {
        type: "Corporate guarantee",
        description: "Guarantee to UK bank for subsidiary working-capital facility",
        amount: 40 * CR,
        currency: "INR",
        method: "Other method",
        fromEntityId: sunriseIN.id,
        toEntityId: sunriseUK.id,
      },
    ],
  });

  // --- Client 3: auto components JV ---------------------------------------
  const autoparts = await prisma.client.create({
    data: {
      name: "Kizuna AutoParts India Pvt Ltd",
      industry: "Auto components",
      description: "JV with Kizuna Corp (Japan); imports core components, pays royalty for technology.",
      pan: "AAACK9012L",
      turnover: 260 * CR,
      groupRevenue: 5200 * CR,
      hasIntlTxn: true,
      hasSDT: false,
      firmId: firm.id,
      userId: partner.id,
    },
  });
  const kizunaJP = await prisma.entity.create({
    data: {
      name: "Kizuna Corp",
      country: "Japan",
      entityType: "JV partner (60%)",
      role: "Technology owner",
      functions: "R&D, technology licensing, global sourcing",
      risks: "Technology risk, market risk",
      assets: "Patents, know-how",
      clientId: autoparts.id,
    },
  });
  const kizunaIN = await prisma.entity.create({
    data: {
      name: "Kizuna AutoParts India Pvt Ltd",
      country: "India",
      entityType: "Joint venture",
      role: "Licensed manufacturer",
      functions: "Manufacturing, local sales, quality control",
      risks: "Manufacturing and inventory risk",
      assets: "Plant & machinery, licensed technology",
      revenue: 260 * CR,
      expenses: 238 * CR,
      employees: 800,
      clientId: autoparts.id,
      parentId: kizunaJP.id,
    },
  });
  await prisma.transaction.createMany({
    data: [
      {
        type: "Payment of royalty",
        description: "Royalty at 3% of net sales for technology license",
        amount: 7.8 * CR,
        currency: "INR",
        method: "CUP",
        fromEntityId: kizunaIN.id,
        toEntityId: kizunaJP.id,
      },
      {
        type: "Import of raw materials and components",
        description: "Import of core components for manufacturing",
        amount: 96 * CR,
        currency: "INR",
        method: "TNMM",
        fromEntityId: kizunaJP.id,
        toEntityId: kizunaIN.id,
      },
    ],
  });

  // --- Benchmarking set for Meridian (screened, DEMO-shaped) ---------------
  const comparables = [
    { name: "Demo Infosystems Ltd", desc: "IT software development services", margins: [16.2, 17.8, 18.4], rpt: 4.2, rev: [420, 465, 512] },
    { name: "Demo Softech Solutions Ltd", desc: "Custom software development", margins: [13.1, 14.5, 15.2], rpt: 8.5, rev: [96, 104, 118] },
    { name: "Demo Digital Services Ltd", desc: "Application development & maintenance", margins: [19.4, 18.2, 20.1], rpt: 2.1, rev: [210, 232, 260] },
    { name: "Demo Cybertech Ltd", desc: "Software development & consulting", margins: [11.8, 12.9, 13.5], rpt: 6.7, rev: [74, 79, 88] },
    { name: "Demo InfoEdge Technologies Ltd", desc: "Offshore software services", margins: [22.5, 21.7, 23.2], rpt: 3.4, rev: [155, 171, 190] },
    { name: "Demo Nexus Software Ltd", desc: "Enterprise software development", margins: [15.6, 16.1, 15.9], rpt: 5.0, rev: [130, 141, 150] },
    { name: "Demo Quantum IT Ltd", desc: "Software development services", margins: [17.2, 18.9, 17.8], rpt: 1.8, rev: [88, 95, 103] },
    { name: "Demo Vertex Systems Ltd", desc: "IT services & software exports", margins: [14.3, 13.8, 14.9], rpt: 7.2, rev: [63, 68, 75] },
    { name: "Demo Global Software Ltd", desc: "Software development — high RPT", margins: [16.8, 17.4, 18.0], rpt: 41.5, rev: [340, 368, 401] },
    { name: "Demo Loss-Making Infotech Ltd", desc: "Software services — persistent losses", margins: [-3.2, -1.8, -4.1], rpt: 5.5, rev: [45, 41, 38] },
  ];
  const fyLabels = ["FY23", "FY24", "FY25"];
  const screened = comparables.map((c) => {
    const rejected =
      c.rpt > 25
        ? `Related-party transactions ${c.rpt}% exceed 25% threshold`
        : c.margins.every((m) => m < 0)
          ? "Persistent operating losses in all available years"
          : null;
    // OP/TC weighted average from OP/OR margins & revenues
    const ops = c.margins.map((m, i) => (m / 100) * c.rev[i]);
    const sumOp = ops.reduce((a, b) => a + b, 0);
    const sumRev = c.rev.reduce((a, b) => a + b, 0);
    const wavg = Math.round((sumOp / (sumRev - sumOp)) * 10000) / 100;
    return { ...c, rejected, wavg };
  });
  const acceptedCount = screened.filter((s) => !s.rejected).length;

  const benchSet = await prisma.benchmarkingSet.create({
    data: {
      name: "SWD comparables FY 2024-25 (demo)",
      firmId: firm.id,
      clientId: meridian.id,
      financialYear: "2024-25",
      testedParty: "Meridian Software Exports Pvt Ltd",
      testedMargin: 18.06,
      pli: "OP/TC",
      sourceDb: "capitaline",
      sourceFile: "capitaline-swd-export-demo.xlsx",
      searchSteps: JSON.stringify([
        { step: "Companies in initial search set (database export)", count: 10 },
        { step: "After related-party transaction filter", count: 9 },
        { step: "After persistent-loss filter", count: 8 },
        { step: "Final accepted comparable set (incl. turnover & data-availability filters)", count: acceptedCount },
      ]),
      rptThreshold: 25,
      status: "screened",
      comparables: {
        create: screened.map((c) => ({
          name: c.name,
          businessDesc: c.desc,
          fyLabels: JSON.stringify(fyLabels),
          revenues: JSON.stringify(c.rev),
          opProfits: JSON.stringify(c.margins.map((m, i) => Math.round((m / 100) * c.rev[i] * 100) / 100)),
          margins: JSON.stringify(c.margins),
          wavgMargin: c.wavg,
          rptPct: c.rpt,
          accepted: !c.rejected,
          rejectReason: c.rejected,
        })),
      },
    },
  });

  // --- One final document so the portal has content -----------------------
  const finalDoc = await prisma.document.create({
    data: {
      name: "TP Study Report - Meridian Software - FY 2024-25 (sample)",
      type: "tp-study",
      status: "final",
      financialYear: "2024-25",
      clientId: meridian.id,
      analysisId: meridianAnalysis.id,
      benchmarkingSetId: benchSet.id,
      approvedById: partner.id,
      approvedAt: new Date(),
      content: `TRANSFER PRICING STUDY REPORT
==================================================
Client: Meridian Software Exports Pvt Ltd
Financial Year: 2024-25

1. Executive Summary
--------------------
This sample document demonstrates the final-deliverable flow. Regenerate with AI (Documents -> Generate) for a complete grounded report using the entity, transaction, and benchmarking data seeded for this client.

2. Economic Analysis
--------------------
Tested party: Meridian Software Exports Pvt Ltd (OP/TC 18.06%). Comparable set: ${acceptedCount} accepted companies from the demo Capitaline export. The tested party margin falls within the 35th-65th percentile arm's length range computed per Rule 10CA.`,
    },
  });

  // --- Statutory deadlines (FY 2025-26, reported by 31 Oct / 30 Nov 2026) --
  const dl = (clientId: string, kind: string, label: string, due: Date) => ({
    clientId,
    kind,
    label,
    financialYear: "2025-26",
    dueDate: due,
    status: "upcoming",
  });
  await prisma.deadline.createMany({
    data: [
      dl(meridian.id, "FORM_3CEB", "Form 3CEB — Accountant's Report (Sec 92E)", new Date(Date.UTC(2026, 9, 31))),
      dl(meridian.id, "ITR_TP", "Income-tax Return (transfer pricing case)", new Date(Date.UTC(2026, 10, 30))),
      dl(meridian.id, "MASTER_FILE_3CEAA", "Form 3CEAA — Master File (Parts A & B, Rule 10DA)", new Date(Date.UTC(2026, 10, 30))),
      dl(meridian.id, "SAFE_HARBOUR_3CEFA", "Form 3CEFA — Safe Harbour option (Rule 10TE)", new Date(Date.UTC(2026, 10, 30))),
      dl(sunrise.id, "FORM_3CEB", "Form 3CEB — Accountant's Report (Sec 92E)", new Date(Date.UTC(2026, 9, 31))),
      dl(sunrise.id, "ITR_TP", "Income-tax Return (transfer pricing case)", new Date(Date.UTC(2026, 10, 30))),
      dl(sunrise.id, "MASTER_FILE_3CEAA", "Form 3CEAA — Master File (Parts A & B, Rule 10DA)", new Date(Date.UTC(2026, 10, 30))),
      dl(autoparts.id, "FORM_3CEB", "Form 3CEB — Accountant's Report (Sec 92E)", new Date(Date.UTC(2026, 9, 31))),
      dl(autoparts.id, "ITR_TP", "Income-tax Return (transfer pricing case)", new Date(Date.UTC(2026, 10, 30))),
    ],
  });

  // --- Portal token for Meridian ------------------------------------------
  const portalToken = deriveToken("portal", meridian.id);
  await prisma.portalToken.create({
    data: { clientId: meridian.id, tokenHash: hashToken(portalToken), label: "Client portal" },
  });

  // --- Case-law library (landmark Indian TP rulings — editorial summaries) --
  const cases: {
    name: string; citation: string; forum: string; year: number;
    tags: string; method?: string; holding: string;
  }[] = [
    {
      name: "Sony Ericsson Mobile Communications India Pvt Ltd v CIT",
      citation: "[2015] 374 ITR 118 (Del)",
      forum: "Delhi High Court", year: 2015,
      tags: "AMP expenditure,bright line,distributor",
      holding: "Rejected the bright-line test as a statutory basis for benchmarking AMP expenses of distributors; AMP can be an international transaction but must be analysed under prescribed methods with aggregation where appropriate.",
    },
    {
      name: "Maruti Suzuki India Ltd v CIT",
      citation: "[2016] 381 ITR 117 (Del)",
      forum: "Delhi High Court", year: 2015,
      tags: "AMP expenditure,bright line,manufacturer",
      holding: "For a full-fledged manufacturer, revenue failed to show the existence of an international transaction in AMP spend; machinery provisions fail absent an agreement or arrangement — AMP adjustment deleted.",
    },
    {
      name: "LG Electronics India Pvt Ltd v ACIT (Special Bench)",
      citation: "[2013] 140 ITD 41 (Del SB)",
      forum: "ITAT Delhi (SB)", year: 2013,
      tags: "AMP expenditure,bright line",
      holding: "Special Bench upheld the bright-line approach for AMP (later substantially overruled by Sony Ericsson/Maruti Suzuki in the High Court) — historically important for the AMP controversy timeline.",
    },
    {
      name: "PCIT v Kusum Health Care Pvt Ltd",
      citation: "[2018] 398 ITR 66 (Del)",
      forum: "Delhi High Court", year: 2017,
      tags: "receivables,notional interest,working capital",
      holding: "Outstanding receivables do not automatically constitute a separate international transaction; where working-capital adjusted margins are at arm's length, no separate interest imputation is warranted.",
    },
    {
      name: "DIT (IT) v Morgan Stanley & Co",
      citation: "[2007] 292 ITR 416 (SC)",
      forum: "Supreme Court", year: 2007,
      tags: "permanent establishment,captive,TNMM",
      method: "TNMM",
      holding: "For a captive service provider remunerated at arm's length, no further profit attribution to the PE is required if the transfer price accounts for the functions and risks of the PE.",
    },
    {
      name: "Vodafone India Services Pvt Ltd v UOI",
      citation: "[2014] 368 ITR 1 (Bom)",
      forum: "Bombay High Court", year: 2014,
      tags: "share issuance,income,jurisdiction",
      holding: "Issue of shares at a premium by an Indian company to its non-resident holding company does not give rise to income; Chapter X cannot apply absent income arising from an international transaction.",
    },
    {
      name: "CIT v EKL Appliances Ltd",
      citation: "[2012] 345 ITR 241 (Del)",
      forum: "Delhi High Court", year: 2012,
      tags: "commercial expediency,TPO powers,royalty",
      holding: "TPO cannot disallow a payment merely because the taxpayer suffered losses or the TPO doubts commercial benefit; benchmarking must respect the taxpayer's commercial judgment except in exceptional circumstances.",
    },
    {
      name: "Chryscapital Investment Advisors (I) Pvt Ltd v DCIT",
      citation: "[2015] 376 ITR 183 (Del)",
      forum: "Delhi High Court", year: 2015,
      tags: "comparable selection,high profit,outliers",
      holding: "A comparable cannot be excluded solely for earning abnormally high profits; the enquiry is functional comparability — if functions match, high margins alone are not a ground for exclusion.",
    },
    {
      name: "Rampgreen Solutions Pvt Ltd v CIT",
      citation: "[2015] 377 ITR 533 (Del)",
      forum: "Delhi High Court", year: 2015,
      tags: "comparable selection,KPO,BPO,functional comparability",
      method: "TNMM",
      holding: "KPO service providers are not comparable to voice-based BPO providers despite both being ITeS; functional profile, not broad industry classification, governs comparability.",
    },
    {
      name: "Li & Fung India Pvt Ltd v CIT",
      citation: "[2014] 361 ITR 85 (Del)",
      forum: "Delhi High Court", year: 2013,
      tags: "cost plus,sourcing support,PLI base",
      method: "TNMM",
      holding: "Rejected an adjustment computing remuneration on FOB value of third-party exports; the PLI base must reflect the costs and functions of the tested party itself, not value of goods it never owned.",
    },
    {
      name: "GAP International Sourcing (India) Pvt Ltd v ACIT",
      citation: "[2012] 149 TTJ 437 (Del)",
      forum: "ITAT Delhi", year: 2012,
      tags: "procurement support,berry ratio,PLI",
      holding: "For low-risk procurement support, operating-expense-based remuneration was appropriate; FOB-value-based attribution rejected. Recognised limited functional footprint of sourcing support entities.",
    },
    {
      name: "Bharti Airtel Ltd v ACIT",
      citation: "[2014] 63 SOT 113 (Del)",
      forum: "ITAT Delhi", year: 2014,
      tags: "corporate guarantee,international transaction",
      holding: "Corporate guarantee without cost or bearing on profits held not to be an international transaction under the pre-2012 definition (position altered prospectively by the 2012 Explanation; guarantee fee benchmarking remains contested).",
    },
    {
      name: "Micro Ink Ltd v ACIT",
      citation: "[2016] 176 TTJ 8 (Ahd)",
      forum: "ITAT Ahmedabad", year: 2015,
      tags: "corporate guarantee,shareholder activity",
      holding: "Guarantees issued as shareholder activity in the interest of the group were held not to warrant a fee; distinguishes shareholder activities from services conferring benefit.",
    },
    {
      name: "CIT v Cushman & Wakefield (India) Pvt Ltd",
      citation: "[2014] 367 ITR 730 (Del)",
      forum: "Delhi High Court", year: 2014,
      tags: "cost allocation,intra-group services,TPO jurisdiction",
      holding: "TPO's role is to determine the ALP of a transaction, not to judge whether the taxpayer benefited; but the AO may examine deductibility — clarifies the TPO/AO boundary on intra-group service payments.",
    },
    {
      name: "Mentor Graphics (Noida) Pvt Ltd v DCIT",
      citation: "[2007] 109 ITD 101 (Del)",
      forum: "ITAT Delhi", year: 2007,
      tags: "risk adjustment,captive,comparable selection",
      method: "TNMM",
      holding: "Early authority on granting risk adjustments to captive service providers whose risk profile is lower than entrepreneurial comparables.",
    },
    {
      name: "Aztec Software & Technology Services Ltd v ACIT (SB)",
      citation: "[2007] 107 ITD 141 (Bang SB)",
      forum: "ITAT Bangalore (SB)", year: 2007,
      tags: "burden of proof,most appropriate method,documentation",
      holding: "Special Bench framework for TP proceedings: taxpayer must maintain documentation and justify the most appropriate method; AO/TPO must follow statutory process before substituting the taxpayer's analysis.",
    },
    {
      name: "Genisys Integrating Systems (India) Pvt Ltd v DCIT",
      citation: "[2012] 53 SOT 159 (Bang)",
      forum: "ITAT Bangalore", year: 2011,
      tags: "turnover filter,comparable selection",
      holding: "Applied a turnover-based filter (commonly the 1x-10x band) for selecting comparables — companies with turnover vastly larger than the tested party are not comparable.",
    },
    {
      name: "CIT v Kodak India Pvt Ltd",
      citation: "[2017] 79 taxmann.com 362 (Bom)",
      forum: "Bombay High Court", year: 2016,
      tags: "international transaction,deemed transaction",
      holding: "Transaction between two domestic entities was not an international transaction merely because it flowed from a global arrangement between foreign parents, on the pre-amendment definition.",
    },
    {
      name: "Whirlpool of India Ltd v DCIT",
      citation: "[2016] 381 ITR 154 (Del)",
      forum: "Delhi High Court", year: 2015,
      tags: "AMP expenditure,international transaction",
      holding: "Absent machinery to determine ALP of AMP and absent an arrangement with the AE, AMP expenditure of a licensed manufacturer could not be treated as an international transaction.",
    },
    {
      name: "SAP Labs India Pvt Ltd v ACIT",
      citation: "[2011] 44 SOT 156 (Bang)",
      forum: "ITAT Bangalore", year: 2010,
      tags: "risk adjustment,captive,quantification",
      method: "TNMM",
      holding: "Recognised and quantified risk adjustment for captive software developers vis-a-vis entrepreneurial comparables; frequently cited for adjustment methodology.",
    },
    {
      name: "Instrumentarium Corporation Ltd, In re",
      citation: "[2016] 288 CTR 173 (AAR)",
      forum: "AAR", year: 2016,
      tags: "interest-free loan,base erosion",
      method: "CUP",
      holding: "Interest-free loan from a foreign parent to its Indian subsidiary must be benchmarked; the 'base erosion' argument (that imputing interest reduces Indian tax base) was rejected.",
    },
    {
      name: "Cheil Communications India Pvt Ltd v DCIT",
      citation: "[2010] 4 ITR(T) 358 (Del)",
      forum: "ITAT Delhi", year: 2010,
      tags: "pass-through costs,PLI,advertising",
      holding: "Pass-through costs that do not involve functions performed by the tested party should be excluded from the cost base when computing the PLI.",
    },
  ];
  await prisma.caseLaw.createMany({
    data: cases.map((c) => ({
      name: c.name,
      citation: c.citation,
      forum: c.forum,
      year: c.year,
      issueTags: c.tags,
      method: c.method || null,
      holding: c.holding,
    })),
  });

  // --- Built-in comparables dataset (DEMO records) -------------------------
  const demoDataset = [
    { name: "Demo Apex Software Ltd", industry: "Software development", desc: "Offshore software development", rev: [128, 141, 156], margins: [16.4, 17.1, 17.9], rpt: 3.5 },
    { name: "Demo BlueRiver ITES Ltd", industry: "IT-enabled services", desc: "Back-office processing services", rev: [64, 71, 80], margins: [14.2, 15.0, 15.6], rpt: 6.0 },
    { name: "Demo Cognivision Analytics Ltd", industry: "KPO", desc: "Data analytics and research services", rev: [42, 49, 57], margins: [21.3, 22.6, 23.4], rpt: 4.8 },
    { name: "Demo Deccan Pharma Research Ltd", industry: "Pharmaceuticals", desc: "Contract research for generics", rev: [95, 102, 114], margins: [18.7, 19.2, 20.5], rpt: 7.1 },
    { name: "Demo Everest AutoComp Ltd", industry: "Auto components", desc: "Core auto components manufacturer", rev: [310, 334, 371], margins: [10.4, 11.2, 11.8], rpt: 5.9 },
    { name: "Demo Falcon Engineering Ltd", industry: "Auto components", desc: "Non-core auto components", rev: [88, 92, 99], margins: [7.8, 8.3, 8.9], rpt: 9.2 },
    { name: "Demo Gateway Logistics Tech Ltd", industry: "Software development", desc: "Logistics software products", rev: [51, 60, 72], margins: [24.1, 25.4, 26.0], rpt: 2.2 },
    { name: "Demo Horizon BPM Ltd", industry: "IT-enabled services", desc: "Customer-experience BPO", rev: [140, 149, 161], margins: [12.6, 13.1, 13.8], rpt: 8.8 },
    { name: "Demo Indus MedDevices Ltd", industry: "Pharmaceuticals", desc: "Medical device assembly & export", rev: [77, 85, 96], margins: [15.9, 16.6, 17.2], rpt: 6.4 },
    { name: "Demo Jubilee TechServe Ltd", industry: "Software development", desc: "ERP implementation services", rev: [205, 221, 246], margins: [17.5, 18.0, 18.8], rpt: 3.0 },
    { name: "Demo Kaveri Textile Exports Ltd", industry: "Textiles", desc: "Garment manufacturing & export", rev: [175, 168, 181], margins: [6.2, 5.8, 6.9], rpt: 4.1 },
    { name: "Demo Lotus Chemical Industries Ltd", industry: "Chemicals", desc: "Specialty chemicals", rev: [260, 281, 305], margins: [13.4, 14.0, 14.7], rpt: 5.5 },
  ];
  await prisma.companyFinancials.createMany({
    data: demoDataset.map((d) => ({
      name: d.name,
      industry: d.industry,
      businessDesc: d.desc,
      fyLabels: JSON.stringify(["FY23", "FY24", "FY25"]),
      revenues: JSON.stringify(d.rev),
      opProfits: JSON.stringify(d.margins.map((m, i) => Math.round((m / 100) * d.rev[i] * 100) / 100)),
      margins: JSON.stringify(d.margins),
      rptPct: d.rpt,
      dataSource: "DEMO",
      isDemo: true,
    })),
  });

  console.log("Seed complete.");
  console.log("  Logins: partner@demo.test / staff@demo.test (demo1234)");
  console.log(`  Portal link (Meridian): /portal/${portalToken}`);
  console.log(`  Final doc: ${finalDoc.id}`);
  console.log(`  Case law: ${cases.length} rulings | Demo dataset: ${demoDataset.length} companies`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
