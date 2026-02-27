import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const TP_SYSTEM_PROMPT = `You are a senior transfer pricing expert with 20+ years of experience advising Indian multinational groups. You specialize in Indian Income-tax Act (Sections 92 to 92F), CBDT Rules 10A to 10THD, OECD Transfer Pricing Guidelines, and Safe Harbour Rules under Rule 10TD.

Your role is to generate professional, legally defensible transfer pricing documentation for Indian Chartered Accountants. Your output must:
- Use formal legal/tax language appropriate for regulatory submissions
- Reference specific sections of the Income-tax Act, 1961 and Rules where applicable
- Follow CBDT Rule 10DA (Master File) and 10DB (Local File) formats
- Apply OECD Chapter V documentation standards
- Use Indian accounting terminology (Crores, Lakhs where appropriate for large figures)
- Be factually grounded in the entity and transaction data provided
- Never fabricate specific financial numbers not provided — use "[To be verified]" for missing data
- Always maintain arm's length principle as the central thesis`;

export type DocumentSection = {
  id: string;
  title: string;
  content: string;
  order: number;
};

export type EntityData = {
  id: string;
  name: string;
  country: string;
  entityType: string;
  role: string | null;
  functions: string | null;
  risks: string | null;
  assets: string | null;
  revenue: number | null;
  expenses: number | null;
  employees: number | null;
};

export type TransactionData = {
  id: string;
  type: string;
  description: string | null;
  amount: number | null;
  currency: string;
  method: string | null;
  fromEntity: { name: string; country: string };
  toEntity: { name: string; country: string };
};

export type AnalysisData = {
  id: string;
  summary: string | null;
  functions: string | null;
  risks: string | null;
  assets: string | null;
  pricingMethod: string | null;
};

export type GenerationContext = {
  clientName: string;
  industry: string | null;
  financialYear: string;
  entities: EntityData[];
  transactions: TransactionData[];
  analysis: AnalysisData | null;
  pastReportExcerpts?: string[];
  firmName?: string;
};

// ---------------------------------------------------------------------------
// Section definitions for each document type
// ---------------------------------------------------------------------------

const DOCUMENT_SECTIONS: Record<string, { id: string; title: string }[]> = {
  "tp-study": [
    { id: "executive-summary", title: "Executive Summary" },
    { id: "industry-overview", title: "Industry Overview" },
    { id: "company-overview", title: "Company Overview" },
    { id: "associated-enterprises", title: "Overview of Associated Enterprises" },
    { id: "international-transactions", title: "International Transactions" },
    { id: "functional-analysis", title: "Functional Analysis" },
    { id: "economic-analysis", title: "Economic Analysis" },
    { id: "alp-determination", title: "Determination of Arm's Length Price" },
    { id: "conclusion", title: "Conclusion" },
  ],
  "local-file": [
    { id: "part-a", title: "Part A: Particulars of the Person" },
    { id: "part-b", title: "Part B: Particulars of International Transactions" },
    { id: "part-c", title: "Part C: Particulars of Specified Domestic Transactions" },
    { id: "part-d", title: "Part D: Additional Information" },
    { id: "certification", title: "Certification under Section 92E" },
  ],
  "master-file": [
    { id: "org-structure", title: "Part A: Organisational Structure" },
    { id: "business-description", title: "Part B: Description of MNE Group Business" },
    { id: "intangibles", title: "Part C: MNE Group's Intangibles" },
    { id: "financial-activities", title: "Part D: Intercompany Financial Activities" },
    { id: "financial-tax", title: "Part E: Financial and Tax Positions" },
  ],
  "agreement-services": [
    { id: "recitals", title: "Recitals and Parties" },
    { id: "scope", title: "Scope of Services" },
    { id: "compensation", title: "Compensation and Payment Terms" },
    { id: "tp-compliance", title: "Transfer Pricing Compliance" },
    { id: "general-terms", title: "General Terms and Execution" },
  ],
  "agreement-licensing": [
    { id: "recitals", title: "Recitals and Parties" },
    { id: "grant", title: "Grant of License" },
    { id: "royalty", title: "Royalty and Payment" },
    { id: "tp-compliance", title: "Transfer Pricing and Withholding Tax" },
    { id: "general-terms", title: "General Terms and Execution" },
  ],
  "agreement-lending": [
    { id: "recitals", title: "Recitals and Parties" },
    { id: "loan-terms", title: "Loan Amount, Interest and Repayment" },
    { id: "tp-compliance", title: "Transfer Pricing and Thin Capitalisation" },
    { id: "security", title: "Security and Covenants" },
    { id: "general-terms", title: "General Terms and Execution" },
  ],
  benchmarking: [
    { id: "executive-summary", title: "Executive Summary" },
    { id: "tested-party", title: "Tested Party Selection" },
    { id: "method-selection", title: "Most Appropriate Method" },
    { id: "search-process", title: "Benchmarking Search Process" },
    { id: "comparable-set", title: "Comparable Set and Results" },
    { id: "alp-range", title: "Arm's Length Range and Conclusion" },
  ],
};

export function getSectionsForDocType(docType: string) {
  return DOCUMENT_SECTIONS[docType] || [];
}

// ---------------------------------------------------------------------------
// Build section-specific prompts
// ---------------------------------------------------------------------------

function buildContextBlock(ctx: GenerationContext): string {
  const entityList = ctx.entities
    .map(
      (e) =>
        `- ${e.name} (${e.country}, ${e.entityType})${e.role ? ` — Role: ${e.role}` : ""}` +
        `${e.revenue ? ` | Revenue: ${formatINR(e.revenue)}` : ""}` +
        `${e.expenses ? ` | Expenses: ${formatINR(e.expenses)}` : ""}` +
        `${e.employees ? ` | Employees: ${e.employees}` : ""}` +
        `${e.functions ? `\n  Functions: ${e.functions}` : ""}` +
        `${e.risks ? `\n  Risks: ${e.risks}` : ""}` +
        `${e.assets ? `\n  Assets: ${e.assets}` : ""}`
    )
    .join("\n");

  const txnList = ctx.transactions
    .map(
      (t) =>
        `- ${t.type}: ${t.fromEntity.name} (${t.fromEntity.country}) → ${t.toEntity.name} (${t.toEntity.country})` +
        `${t.amount ? ` | Amount: ${t.currency} ${formatINR(t.amount)}` : ""}` +
        `${t.method ? ` | TP Method: ${t.method}` : ""}` +
        `${t.description ? `\n  Description: ${t.description}` : ""}`
    )
    .join("\n");

  let block = `
CLIENT: ${ctx.clientName}
INDUSTRY: ${ctx.industry || "Not specified"}
FINANCIAL YEAR: ${ctx.financialYear}
${ctx.firmName ? `PREPARED BY: ${ctx.firmName}` : ""}

ENTITIES IN THE GROUP:
${entityList || "No entities provided"}

INTERCOMPANY TRANSACTIONS:
${txnList || "No transactions provided"}`;

  if (ctx.analysis) {
    block += `

FUNCTIONAL ANALYSIS SUMMARY:
${ctx.analysis.summary || "Not available"}
Functions: ${ctx.analysis.functions || "Not specified"}
Risks: ${ctx.analysis.risks || "Not specified"}
Assets: ${ctx.analysis.assets || "Not specified"}
Pricing Method: ${ctx.analysis.pricingMethod || "Not specified"}`;
  }

  if (ctx.pastReportExcerpts && ctx.pastReportExcerpts.length > 0) {
    block += `

REFERENCE — EXCERPTS FROM PREVIOUSLY APPROVED REPORTS (match this writing style):
${ctx.pastReportExcerpts.map((e, i) => `--- Excerpt ${i + 1} ---\n${e}`).join("\n\n")}`;
  }

  return block;
}

function formatINR(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

// ---------------------------------------------------------------------------
// Core generation function — single section
// ---------------------------------------------------------------------------

export async function generateSection(
  docType: string,
  sectionId: string,
  sectionTitle: string,
  ctx: GenerationContext
): Promise<string> {
  const contextBlock = buildContextBlock(ctx);

  const sectionPrompts: Record<string, Record<string, string>> = {
    "tp-study": {
      "executive-summary": `Write the Executive Summary for a Transfer Pricing Study Report. Summarise the client, the group structure, the nature of international transactions, and the conclusion that transactions are at arm's length. Reference Sections 92-92F of the Income-tax Act, 1961 and Rules 10A-10THD. Keep it to 2-3 paragraphs.`,
      "industry-overview": `Write an Industry Overview section. Based on the client's industry "${ctx.industry || "technology"}", describe the industry landscape in India, key trends, competitive dynamics, and how these affect transfer pricing. Use publicly known industry data. 2-3 paragraphs.`,
      "company-overview": `Write the Company Overview section describing the client's business, operations, and position within its group. Use the entity data provided to describe the Indian entity's role and activities.`,
      "associated-enterprises": `Write the Overview of Associated Enterprises section. List and describe each entity in the group, their jurisdiction, relationship to the Indian entity, and principal activities. Present as a structured list with narrative.`,
      "international-transactions": `Write the International Transactions section. Detail each intercompany transaction — nature, parties involved, amounts, and the arm's length method applied. Present in both narrative form and a summary table format.`,
      "functional-analysis": `Write the Functional Analysis section with three subsections:
6.1 Functions Performed — describe functions performed by each entity
6.2 Risks Assumed — analyse risks borne by each entity
6.3 Assets Employed — describe tangible and intangible assets used
Base this on the entity FAR data provided. This is the most critical section — be thorough.`,
      "economic-analysis": `Write the Economic Analysis section covering:
7.1 Selection of Most Appropriate Method — justify the TP method selection under Rule 10C
7.2 Selection of Tested Party — explain why the tested party was chosen (typically the least complex entity)
7.3 Benchmarking Analysis — generate a realistic comparable company analysis with Indian companies, including search filters used (industry code, RPT filter <25%, persistent loss filter, turnover range)
7.4 Comparability Adjustments — discuss any required adjustments
Use the TNMM method with OP/TC or OP/OR as PLI unless the transaction data suggests otherwise. Generate 8-12 realistic comparable Indian companies with plausible margin data.`,
      "alp-determination": `Write the Determination of Arm's Length Price section. Present the arm's length range (Q1, Median, Q3, Mean) from the benchmarking analysis, compare with the tested party's margin, and state the conclusion. Include a summary table.`,
      conclusion: `Write the Conclusion section. Summarise that based on the functional analysis, economic analysis, and benchmarking, the international transactions are at arm's length per Sections 92-92F. Keep it concise — 1-2 paragraphs.`,
    },
    "local-file": {
      "part-a": `Write Part A: Particulars of the Person for Form 3CEB. Include fields for name, address, PAN, status, nature of business, and previous year. Use the client data provided. Format as a structured form with numbered fields.`,
      "part-b": `Write Part B: Particulars of International Transactions. For each transaction, include: nature of transaction, amount in INR, name and jurisdiction of associated enterprise, and TP method used. Format as a structured table.`,
      "part-c": `Write Part C: Particulars of Specified Domestic Transactions. If there are domestic related-party transactions under Section 92BA, list them. If not applicable, state so with reference to the section.`,
      "part-d": `Write Part D: Additional Information. Include: details of TP documentation maintained, comparables selected, summary of functional analysis, and any safe harbour elections under Rule 10TD.`,
      certification: `Write the Certification section under Section 92E read with Rule 10E. Include the CA's certification that the report has been prepared in accordance with applicable provisions. Include placeholders for CA Name, Membership Number, UDIN, date and place.`,
    },
    "master-file": {
      "org-structure": `Write Part A: Organisational Structure for the Master File per Rule 10DA. Include: legal and ownership structure chart (describe in text), geographical location of entities, and entity-wise functional description.`,
      "business-description": `Write Part B: Description of MNE Group Business. Cover: important profit drivers, supply chain description, important service arrangements, functional analysis of principal contributions by entities, and any business restructuring during the year.`,
      intangibles: `Write Part C: MNE Group's Intangibles. Describe: strategy for development/ownership/exploitation of intangibles, list of important intangibles for TP purposes, important IP agreements between associated enterprises, and TP policies related to R&D and intangibles.`,
      "financial-activities": `Write Part D: Intercompany Financial Activities. Describe: how the group is financed, any central financing entity, and TP policies for financing arrangements between group entities.`,
      "financial-tax": `Write Part E: Financial and Tax Positions. Cover: reference to annual consolidated financial statements, and list of existing APAs (unilateral/bilateral), MAP cases, and other tax rulings.`,
    },
    "agreement-services": {
      recitals: `Draft the Recitals and Parties section for an Intercompany Service Agreement. Identify the service provider and recipient from the entity data and transactions. Include WHEREAS clauses establishing the relationship under Section 92A.`,
      scope: `Draft the Scope of Services clause. Based on the transaction data, describe the specific services being provided, deliverables, service levels, and KPIs. Be specific to the transaction type.`,
      compensation: `Draft the Compensation and Payment Terms clause. Include the pricing mechanism (cost plus markup / arm's length fee), invoicing frequency, payment terms, and currency. Base the markup on the TP method in the transaction data.`,
      "tp-compliance": `Draft the Transfer Pricing Compliance clause. State that compensation is on arm's length basis, specify the TP method applied, and include documentation maintenance obligations. Reference Indian TP regulations.`,
      "general-terms": `Draft the General Terms section including: IP ownership, confidentiality, governing law (Indian law), dispute resolution (arbitration), term and termination, and execution blocks for authorized signatories of both parties.`,
    },
    "agreement-licensing": {
      recitals: `Draft the Recitals and Parties section for an Intercompany License Agreement. Identify the licensor (IP owner) and licensee from entity data. Establish the licensing relationship.`,
      grant: `Draft the Grant of License clause. Specify: type of IP (trademarks/patents/software/know-how), exclusivity, territory, permitted use, and sublicensing restrictions.`,
      royalty: `Draft the Royalty and Payment clause. Include: royalty rate (% of net sales), definition of net sales, calculation period, payment schedule, and audit rights. Base on transaction data.`,
      "tp-compliance": `Draft the TP Compliance and Withholding Tax clauses. State arm's length basis, TP method used, documentation obligations, and withholding tax provisions under applicable DTAA and Income-tax Act.`,
      "general-terms": `Draft General Terms: IP protection, confidentiality, term, termination, governing law, dispute resolution, and execution blocks.`,
    },
    "agreement-lending": {
      recitals: `Draft the Recitals and Parties for an Intercompany Loan Agreement. Identify lender and borrower from entity data.`,
      "loan-terms": `Draft the Loan Amount, Interest Rate, and Repayment clauses. Include: principal amount, interest rate (benchmarked at arm's length), calculation basis, repayment schedule, and prepayment provisions. Reference Safe Harbour Rules under Rule 10TD for interest rates if applicable.`,
      "tp-compliance": `Draft the TP Compliance and Thin Capitalisation clauses. Cover: arm's length interest rate justification, benchmarking method, Section 94B thin capitalisation provisions, and documentation requirements.`,
      security: `Draft the Security and Covenants clauses. Cover: security type (unsecured/guaranteed/secured), financial covenants, reporting obligations, and events of default.`,
      "general-terms": `Draft General Terms: withholding tax, governing law, dispute resolution, amendments, and execution blocks.`,
    },
    benchmarking: {
      "executive-summary": `Write the Executive Summary of the Benchmarking Report. Summarise the transaction being tested, the method used, and the arm's length conclusion. 1-2 paragraphs.`,
      "tested-party": `Write the Tested Party Selection section. Explain why the tested party was selected (typically the least complex entity), describe its functional profile, and justify the selection under OECD guidelines.`,
      "method-selection": `Write the Most Appropriate Method selection section. Justify the MAM under Rule 10C, explain why other methods were rejected, and describe the PLI (Profit Level Indicator) selected — typically OP/TC or OP/OR for TNMM.`,
      "search-process": `Write the Benchmarking Search Process section. Describe:
- Database used (Prowess/Capitaline)
- Search strategy (industry code → quantitative filters → qualitative screening)
- Quantitative filters: RPT filter (<25%), persistent loss filter, turnover range, data availability
- Number of companies at each step
Generate a realistic search funnel with plausible numbers.`,
      "comparable-set": `Write the Comparable Set and Results section. Generate 8-12 realistic Indian comparable companies appropriate for the client's industry. For each company provide:
- Company name (use realistic but fictional Indian company names)
- Brief business description
- OP/TC or OP/OR margins for 3 financial years
- 3-year weighted average
Present as a formatted table. Ensure margins are realistic for the industry (typically 5-25% for services, 2-15% for distribution, 8-20% for IT).`,
      "alp-range": `Write the Arm's Length Range and Conclusion section. Calculate Q1, Median, Q3, and Mean from the comparable set. Compare with the tested party's actual margin. State whether the transaction is at arm's length. If the margin falls outside the range, discuss potential adjustments under Section 92C.`,
    },
  };

  const sectionPrompt =
    sectionPrompts[docType]?.[sectionId] ||
    `Write the "${sectionTitle}" section for a ${docType} document. Use the client and transaction data provided.`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    system: TP_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `${contextBlock}\n\n---\n\nSECTION TO GENERATE: ${sectionTitle}\n\nINSTRUCTIONS:\n${sectionPrompt}\n\nGenerate ONLY this section. Do not include any preamble like "Here is the section" — start directly with the section content. Use proper formatting with headings, numbered lists, and tables where appropriate.`,
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  return textBlock?.text || `[Error generating section: ${sectionTitle}]`;
}

// ---------------------------------------------------------------------------
// Generate full document — all sections
// ---------------------------------------------------------------------------

export async function generateFullDocument(
  docType: string,
  ctx: GenerationContext
): Promise<DocumentSection[]> {
  const sectionDefs = getSectionsForDocType(docType);

  if (sectionDefs.length === 0) {
    throw new Error(`Unknown document type: ${docType}`);
  }

  const results: DocumentSection[] = [];

  // Generate sections sequentially to maintain coherence and manage rate limits
  for (let i = 0; i < sectionDefs.length; i++) {
    const def = sectionDefs[i];
    const content = await generateSection(docType, def.id, def.title, ctx);
    results.push({
      id: def.id,
      title: def.title,
      content,
      order: i,
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Assemble sections into a single document string
// ---------------------------------------------------------------------------

export function assembleDocument(
  sections: DocumentSection[],
  docType: string,
  clientName: string,
  financialYear: string
): string {
  const typeNames: Record<string, string> = {
    "tp-study": "TRANSFER PRICING STUDY REPORT",
    "local-file": "FORM 3CEB - LOCAL FILE",
    "master-file": "MASTER FILE",
    "agreement-services": "INTERCOMPANY SERVICE AGREEMENT",
    "agreement-licensing": "INTERCOMPANY LICENSE AGREEMENT",
    "agreement-lending": "INTERCOMPANY LOAN AGREEMENT",
    benchmarking: "BENCHMARKING REPORT",
  };

  const header = `${typeNames[docType] || docType.toUpperCase()}
${"=".repeat(50)}
Client: ${clientName}
Financial Year: ${financialYear}
Date of Preparation: ${new Date().toLocaleDateString("en-IN")}

TABLE OF CONTENTS
${"-".repeat(30)}
${sections.map((s, i) => `${i + 1}. ${s.title}`).join("\n")}

${"=".repeat(50)}

`;

  const body = sections
    .sort((a, b) => a.order - b.order)
    .map((s, i) => `${i + 1}. ${s.title}\n${"-".repeat(s.title.length + 4)}\n\n${s.content}`)
    .join("\n\n\n");

  return header + body;
}
