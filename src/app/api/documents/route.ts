import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;

    const documents = await prisma.document.findMany({
      where: {
        client: { userId },
      },
      include: {
        client: {
          select: { id: true, name: true },
        },
        analysis: {
          select: { id: true, status: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

function generateDocumentContent(
  type: string,
  clientName: string,
  financialYear: string
): string {
  const templates: Record<string, string> = {
    "tp-study": `TRANSFER PRICING STUDY REPORT
=======================================
Client: ${clientName}
Financial Year: ${financialYear}
Prepared by: [Firm Name]
Date: ${new Date().toLocaleDateString("en-IN")}

TABLE OF CONTENTS
-----------------
1. Executive Summary
2. Industry Overview
3. Company Overview
4. Overview of Associated Enterprises
5. International Transactions
6. Functional Analysis
   6.1 Functions Performed
   6.2 Risks Assumed
   6.3 Assets Employed
7. Economic Analysis
   7.1 Selection of Most Appropriate Method
   7.2 Selection of Tested Party
   7.3 Benchmarking Analysis
   7.4 Comparability Adjustments
8. Determination of Arm's Length Price/Range
9. Conclusion

1. EXECUTIVE SUMMARY
This Transfer Pricing Study Report has been prepared for ${clientName} in accordance with the provisions of Sections 92 to 92F of the Income-tax Act, 1961 read with Rules 10A to 10THD of the Income-tax Rules, 1962. The report documents the international transactions entered into by ${clientName} with its Associated Enterprises during Financial Year ${financialYear} and demonstrates that these transactions are at arm's length.

2. INDUSTRY OVERVIEW
[To be populated based on client industry analysis]

3. COMPANY OVERVIEW
${clientName} is engaged in [business description]. The company operates through its registered office in India and has related party transactions with its associated enterprises across multiple jurisdictions.

4. OVERVIEW OF ASSOCIATED ENTERPRISES
[List of associated enterprises with details of relationship, jurisdiction, and nature of business]

5. INTERNATIONAL TRANSACTIONS
The following international transactions have been entered into by ${clientName} with its Associated Enterprises during the relevant financial year:
[Transaction details to be populated from analysis data]

6. FUNCTIONAL ANALYSIS
6.1 Functions Performed
[Detailed description of functions performed by each entity]

6.2 Risks Assumed
[Analysis of risks borne by each entity in the transaction chain]

6.3 Assets Employed
[Description of tangible and intangible assets used]

7. ECONOMIC ANALYSIS
7.1 Selection of Most Appropriate Method
Having regard to the nature and class of transaction, the Most Appropriate Method has been selected in accordance with Rule 10C of the Income-tax Rules.

8. DETERMINATION OF ARM'S LENGTH PRICE
Based on the economic analysis conducted, the arm's length price/range has been determined as follows:
[Benchmark results and conclusions]

9. CONCLUSION
Based on the above analysis, it is concluded that the international transactions entered into by ${clientName} with its Associated Enterprises are at arm's length as per the provisions of the Income-tax Act, 1961.`,

    "local-file": `FORM 3CEB - LOCAL FILE
=======================================
Report under Section 92E of the Income-tax Act, 1961

Client: ${clientName}
Assessment Year: ${financialYear}
Date of Report: ${new Date().toLocaleDateString("en-IN")}

PART A: PARTICULARS OF THE PERSON
-----------------------------------
1. Name: ${clientName}
2. Address: [Registered Address]
3. PAN: [PAN Number]
4. Status: Company
5. Nature of Business: [Business Description]
6. Previous Year: ${financialYear}

PART B: PARTICULARS OF INTERNATIONAL TRANSACTIONS
---------------------------------------------------
1. Details of International Transactions:
   a. Nature of Transaction: [Type]
   b. Amount: [Amount in INR]
   c. Associated Enterprise: [Name and Jurisdiction]
   d. Method Used: [TP Method]

PART C: PARTICULARS OF SPECIFIED DOMESTIC TRANSACTIONS
------------------------------------------------------
[If applicable]

PART D: ADDITIONAL INFORMATION
-------------------------------
1. Details of transfer pricing documentation maintained
2. Details of comparables selected
3. Summary of functional analysis

CERTIFICATION
This report is prepared in accordance with the provisions of Section 92E read with Rule 10E of the Income-tax Rules, 1962.

Prepared by: [CA Name]
Membership No.: [ICAI Membership Number]
UDIN: [UDIN Number]`,

    "master-file": `MASTER FILE
=======================================
[In accordance with Section 92D(1) read with Rule 10DA]

Client: ${clientName}
Financial Year: ${financialYear}
Group: ${clientName} Group

TABLE OF CONTENTS
-----------------
Part A: Organisational Structure
Part B: Description of MNE Group Business
Part C: MNE Group's Intangibles
Part D: MNE Group's Intercompany Financial Activities
Part E: MNE Group's Financial and Tax Positions

PART A: ORGANISATIONAL STRUCTURE
1. Chart depicting the MNE group's legal and ownership structure
2. Geographical location of operating entities
3. Entity-wise functional description

PART B: DESCRIPTION OF MNE GROUP BUSINESS
1. Important drivers of business profit
2. Description of the supply chain for the group's five largest products/services
3. List of important service arrangements (other than R&D services)
4. Functional analysis of principal contributions by individual entities
5. Important business restructuring transactions during the financial year

PART C: MNE GROUP'S INTANGIBLES
1. General description of the MNE group's strategy for development, ownership and exploitation of intangibles
2. List of intangibles important for transfer pricing purposes
3. List of important agreements among identified associated enterprises related to intangibles
4. Transfer pricing policies related to R&D and intangibles

PART D: MNE GROUP'S INTERCOMPANY FINANCIAL ACTIVITIES
1. Description of how the MNE group is financed
2. Details of any central financing entity
3. Transfer pricing policies related to financing arrangements

PART E: MNE GROUP'S FINANCIAL AND TAX POSITIONS
1. MNE group's annual consolidated financial statement
2. List of existing unilateral APAs, bilateral APAs, and other rulings`,

    "agreement-services": `INTRAGROUP AGREEMENT - SERVICES
=======================================
INTERCOMPANY SERVICE AGREEMENT

This Agreement is entered into as of [Date], between:

(1) ${clientName} India (hereinafter referred to as "Service Provider")
    Address: [Registered Office Address, India]

AND

(2) [Associated Enterprise Name] (hereinafter referred to as "Service Recipient")
    Address: [Registered Office Address, Country]

RECITALS
--------
WHEREAS the Service Provider and Service Recipient are associated enterprises within the meaning of Section 92A of the Income-tax Act, 1961;

AND WHEREAS the Service Provider possesses the capability, expertise, and resources to provide certain services to the Service Recipient;

NOW THEREFORE the parties agree as follows:

1. SCOPE OF SERVICES
1.1 The Service Provider shall provide the following services:
   a. [IT Support Services / Software Development / Back-office Operations]
   b. [Description of specific service deliverables]
   c. [Service level metrics and KPIs]

2. TERM
2.1 This Agreement shall commence on [Start Date] and continue for a period of [X] years.
2.2 Either party may terminate with [90] days written notice.

3. COMPENSATION
3.1 The Service Recipient shall pay the Service Provider a fee calculated as:
   [Cost Plus Mark-up of X% / Arm's Length Fee]
3.2 The fee shall be invoiced [monthly/quarterly] and payable within [30] days.

4. TRANSFER PRICING COMPLIANCE
4.1 The compensation under this Agreement is determined on an arm's length basis.
4.2 The transfer pricing method applied is [TNMM/CPM/CUP].
4.3 Both parties agree to maintain contemporaneous documentation as required.

5. INTELLECTUAL PROPERTY
5.1 All IP created during the course of services shall remain the property of [Party].

6. CONFIDENTIALITY
6.1 Both parties shall maintain strict confidentiality of proprietary information.

7. GOVERNING LAW
7.1 This Agreement shall be governed by the laws of India.

8. DISPUTE RESOLUTION
8.1 Any disputes shall first be resolved through mutual consultation.
8.2 Failing which, disputes shall be referred to arbitration under [Rules].

IN WITNESS WHEREOF, the parties have executed this Agreement.

For ${clientName} India          For [Associated Enterprise]
___________________________      ___________________________
Authorized Signatory             Authorized Signatory
Date:                            Date:`,

    "agreement-licensing": `INTRAGROUP AGREEMENT - LICENSING
=======================================
INTERCOMPANY LICENSE AGREEMENT

This License Agreement is entered into as of [Date], between:

(1) [IP Owner Entity] (hereinafter referred to as "Licensor")
    Address: [Address]

AND

(2) ${clientName} India (hereinafter referred to as "Licensee")
    Address: [Address, India]

RECITALS
--------
WHEREAS the Licensor is the owner of certain valuable intellectual property;
AND WHEREAS the Licensee desires to obtain a license to use such intellectual property;

TERMS
-----
1. GRANT OF LICENSE
1.1 The Licensor hereby grants to the Licensee a [non-exclusive/exclusive] license to use:
   a. [Trademarks / Patents / Trade Secrets / Know-how / Software]
   b. Territory: [India / specific regions]

2. TERM
2.1 This Agreement shall be effective from [Date] for a period of [X] years.

3. ROYALTY
3.1 The Licensee shall pay to the Licensor a royalty of [X]% of Net Sales.
3.2 "Net Sales" means gross sales less returns, discounts, and applicable taxes.
3.3 Royalties shall be calculated and paid on a [quarterly] basis.

4. TRANSFER PRICING
4.1 The royalty rate has been determined on an arm's length basis using [CUP/TNMM].
4.2 The parties shall maintain documentation in compliance with Indian TP regulations.

5. WITHHOLDING TAX
5.1 The Licensee shall withhold tax as per the applicable DTAA / Income-tax Act.

6. INTELLECTUAL PROPERTY PROTECTION
6.1 The Licensee shall use the licensed IP only as permitted herein.
6.2 The Licensee shall not sub-license without prior written consent.

7. GOVERNING LAW
7.1 This Agreement is governed by the laws of [Jurisdiction].

IN WITNESS WHEREOF the parties execute this Agreement.

For [Licensor]                   For ${clientName} India
___________________________      ___________________________
Authorized Signatory             Authorized Signatory`,

    "agreement-lending": `INTRAGROUP AGREEMENT - LENDING
=======================================
INTERCOMPANY LOAN AGREEMENT

This Loan Agreement is entered into as of [Date], between:

(1) [Lending Entity] (hereinafter referred to as "Lender")
    Address: [Address]

AND

(2) ${clientName} India (hereinafter referred to as "Borrower")
    Address: [Address, India]

RECITALS
--------
WHEREAS the Borrower requires funds for its business operations;
AND WHEREAS the Lender has agreed to provide the loan on the terms set forth herein;

TERMS
-----
1. LOAN AMOUNT
1.1 The Lender shall advance to the Borrower a sum of [Currency] [Amount].
1.2 The loan shall be disbursed on [Date / in tranches].

2. INTEREST RATE
2.1 The Borrower shall pay interest at [X]% per annum on the outstanding principal.
2.2 The interest rate has been benchmarked on an arm's length basis using [CUP method / credit rating approach].
2.3 Interest shall be calculated on [actual/360] day basis and payable [quarterly].

3. REPAYMENT
3.1 The principal shall be repaid in [X] equal [annual/semi-annual] installments.
3.2 The first installment shall be due on [Date].
3.3 Prepayment is permitted with [30] days notice without penalty.

4. TRANSFER PRICING COMPLIANCE
4.1 The interest rate under this Agreement is determined at arm's length.
4.2 The benchmarking analysis is based on comparable loan transactions.
4.3 The applicable Safe Harbour Rules under Rule 10TD, if elected, shall apply.

5. SECURITY
5.1 The loan is [unsecured / secured by corporate guarantee / secured by assets].

6. THIN CAPITALISATION
6.1 The parties acknowledge the provisions of Section 94B of the Income-tax Act.

7. WITHHOLDING TAX
7.1 The Borrower shall withhold tax on interest payments as per applicable law/DTAA.

8. GOVERNING LAW
8.1 This Agreement shall be governed by the laws of [Jurisdiction].

IN WITNESS WHEREOF the parties execute this Agreement.

For [Lender]                     For ${clientName} India
___________________________      ___________________________
Authorized Signatory             Authorized Signatory`,

    "benchmarking": `BENCHMARKING REPORT
=======================================
Client: ${clientName}
Financial Year: ${financialYear}
Transaction: [International Transaction Description]

EXECUTIVE SUMMARY
-----------------
This benchmarking report analyses the arm's length nature of international transactions entered into by ${clientName} with its Associated Enterprises.

1. TESTED PARTY
The tested party is ${clientName} India, being the least complex entity in the transaction.

2. MOST APPROPRIATE METHOD
The Transactional Net Margin Method (TNMM) has been selected as the Most Appropriate Method (MAM) under Rule 10C.

Reasons for selection:
- Net margin is less affected by functional differences
- Data availability for comparable companies
- Consistency with industry practice

3. PROFIT LEVEL INDICATOR
The Operating Profit / Total Cost (OP/TC) ratio has been selected as the Profit Level Indicator (PLI).

4. SEARCH PROCESS
4.1 Database: Prowess / Capitaline / EMIS / Bureau van Dijk
4.2 Search Strategy:
   Step 1: Industry Classification Code filtering
   Step 2: Quantitative filters (turnover, related party filter, etc.)
   Step 3: Qualitative screening

5. QUANTITATIVE FILTERS APPLIED
- Related Party Transactions filter: <25% of revenue
- Persistent losses filter: exclude companies with losses in 2+ of 3 years
- Turnover range: [1/10x to 10x] of tested party
- Data availability: 3-year weighted average

6. COMPARABLE SET
[List of final comparable companies with financial data]

Company Name | OP/TC FY1 | OP/TC FY2 | OP/TC FY3 | Weighted Avg
-------------|-----------|-----------|-----------|-------------
[Company 1]  |    X%     |    X%     |    X%     |    X%
[Company 2]  |    X%     |    X%     |    X%     |    X%

7. ARM'S LENGTH RANGE
- Lower Quartile (Q1): X%
- Median: X%
- Upper Quartile (Q3): X%
- Arithmetic Mean: X%

8. TESTED PARTY MARGIN
- OP/TC of ${clientName}: X%

9. CONCLUSION
The operating margin of the tested party falls [within/outside] the arm's length range, indicating that the international transaction is [at arm's length / requires adjustment].`,
  };

  return templates[type] || `Document template for type: ${type}\nClient: ${clientName}\nFinancial Year: ${financialYear}`;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const body = await request.json();
    const { name, type, clientId, analysisId, financialYear } = body;

    if (!name || !type || !clientId) {
      return NextResponse.json(
        { error: "Name, type, and client are required" },
        { status: 400 }
      );
    }

    // Verify client belongs to user
    const client = await prisma.client.findFirst({
      where: { id: clientId, userId },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Client not found or unauthorized" },
        { status: 404 }
      );
    }

    const content = generateDocumentContent(
      type,
      client.name,
      financialYear || "2025-26"
    );

    const document = await prisma.document.create({
      data: {
        name,
        type,
        status: "draft",
        content,
        clientId,
        analysisId: analysisId || null,
      },
      include: {
        client: {
          select: { id: true, name: true },
        },
        analysis: {
          select: { id: true, status: true },
        },
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("Error creating document:", error);
    return NextResponse.json(
      { error: "Failed to create document" },
      { status: 500 }
    );
  }
}
