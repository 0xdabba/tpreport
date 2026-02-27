import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { hash } from "bcryptjs";
import path from "path";

// Resolve the file: URL to an absolute path so LibSQL can find the DB
const raw = process.env.DATABASE_URL!;
const dbUrl = raw.startsWith("file:./")
  ? `file:${path.resolve(process.cwd(), raw.slice(5))}`
  : raw;

const adapter = new PrismaLibSql({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database with realistic test data...\n");

  // Create demo CA user
  const password = await hash("demo1234", 12);
  const user = await prisma.user.upsert({
    where: { email: "demo@tpassist.com" },
    update: {},
    create: {
      email: "demo@tpassist.com",
      password,
      name: "Rajesh Sharma",
      firm: "Sharma & Associates, Chartered Accountants",
      phone: "+91 98765 43210",
      role: "ca",
    },
  });
  console.log(`User: ${user.name} (${user.email})`);

  // =========================================================================
  // CLIENT 1: Infosys Limited
  // =========================================================================
  const infosys = await prisma.client.create({
    data: {
      name: "Infosys Limited",
      industry: "Information Technology",
      description:
        "Global leader in next-generation digital services and consulting. Infosys operates through subsidiaries in the US, Europe, Australia, and Asia, providing IT services, BPO, and consulting to Fortune 500 clients. Significant intercompany transactions involve software development services, IP licensing, and management fees.",
      userId: user.id,
    },
  });
  console.log(`\nClient: ${infosys.name}`);

  const infyIndia = await prisma.entity.create({
    data: {
      name: "Infosys Limited",
      country: "India",
      entityType: "Public Limited Company",
      role: "Principal Entity / IP Owner",
      functions:
        "Software development, R&D, product engineering, global delivery management, IP creation and ownership, strategic decision-making",
      risks:
        "Technology obsolescence risk, market risk, credit risk, IP development risk, project execution risk, currency fluctuation risk",
      assets:
        "Proprietary software platforms (Finacle, EdgeVerve), development centers across India, patents and trademarks, trained workforce of 300,000+ employees",
      revenue: 1534410000000,
      expenses: 1107450000000,
      employees: 314015,
      clientId: infosys.id,
    },
  });

  const infyUS = await prisma.entity.create({
    data: {
      name: "Infosys BPM Limited (formerly Infosys BPO)",
      country: "India",
      entityType: "Subsidiary",
      role: "BPO Service Provider",
      functions:
        "Business process outsourcing, knowledge services, analytics services to global clients",
      risks: "Operational risk, client concentration risk, regulatory compliance risk",
      assets: "BPO delivery centers, process automation tools, trained workforce",
      revenue: 45230000000,
      expenses: 38120000000,
      employees: 45000,
      clientId: infosys.id,
      parentId: infyIndia.id,
    },
  });

  const infyLtdUS = await prisma.entity.create({
    data: {
      name: "Infosys Technologies (United States) Inc.",
      country: "United States",
      entityType: "Subsidiary",
      role: "Marketing & Distribution Entity",
      functions:
        "Client relationship management, sales and marketing in North America, local delivery coordination, contract management",
      risks:
        "Limited risk — bears only routine marketing and distribution risks, no IP or development risk",
      assets:
        "Office premises in US cities (Plano, Indianapolis, Hartford), local sales team, client contracts",
      revenue: 680500000000,
      expenses: 642300000000,
      employees: 25000,
      clientId: infosys.id,
      parentId: infyIndia.id,
    },
  });

  const infyUK = await prisma.entity.create({
    data: {
      name: "Infosys Consulting Holding AG",
      country: "Switzerland",
      entityType: "Subsidiary",
      role: "European Holding / Consulting Entity",
      functions:
        "Management consulting services delivery in EMEA, strategic advisory, holding company for European operations",
      risks: "Market risk in European consulting sector, currency risk (CHF/EUR/GBP)",
      assets: "Consulting brand, European client relationships, office premises",
      revenue: 125600000000,
      expenses: 118900000000,
      employees: 5200,
      clientId: infosys.id,
      parentId: infyIndia.id,
    },
  });

  const infyAus = await prisma.entity.create({
    data: {
      name: "Infosys Technologies (Australia) Pty Ltd",
      country: "Australia",
      entityType: "Subsidiary",
      role: "Marketing & Service Delivery Entity",
      functions: "Sales, marketing, and local delivery for Australian and NZ clients",
      risks: "Limited operational risk, AUD currency risk",
      assets: "Office premises in Sydney and Melbourne, local workforce",
      revenue: 82400000000,
      expenses: 76100000000,
      employees: 3800,
      clientId: infosys.id,
      parentId: infyIndia.id,
    },
  });

  // Infosys transactions
  await prisma.transaction.createMany({
    data: [
      {
        type: "Services",
        description:
          "Software development and IT services provided by Infosys India to US subsidiary for onward delivery to US clients. Pricing on cost-plus basis.",
        amount: 425000000000,
        currency: "INR",
        method: "TNMM",
        fromEntityId: infyIndia.id,
        toEntityId: infyLtdUS.id,
      },
      {
        type: "Licensing",
        description:
          "License of Finacle banking platform and EdgeVerve products to US entity for sublicensing to US banking clients. Royalty at 3% of net sublicense revenue.",
        amount: 18500000000,
        currency: "INR",
        method: "CUP",
        fromEntityId: infyIndia.id,
        toEntityId: infyLtdUS.id,
      },
      {
        type: "Services",
        description:
          "IT services and consulting delivery from India to European subsidiary for EMEA client engagements.",
        amount: 85000000000,
        currency: "INR",
        method: "TNMM",
        fromEntityId: infyIndia.id,
        toEntityId: infyUK.id,
      },
      {
        type: "Services",
        description:
          "Offshore development services from India to Australia entity for ANZ client projects.",
        amount: 52000000000,
        currency: "INR",
        method: "TNMM",
        fromEntityId: infyIndia.id,
        toEntityId: infyAus.id,
      },
      {
        type: "Services",
        description:
          "BPO and knowledge process outsourcing services from Infosys BPM to US entity.",
        amount: 32000000000,
        currency: "INR",
        method: "CPM",
        fromEntityId: infyUS.id,
        toEntityId: infyLtdUS.id,
      },
    ],
  });
  console.log("  → 5 entities, 5 transactions created");

  // =========================================================================
  // CLIENT 2: Sun Pharmaceutical Industries
  // =========================================================================
  const sunpharma = await prisma.client.create({
    data: {
      name: "Sun Pharmaceutical Industries Ltd",
      industry: "Pharmaceuticals",
      description:
        "India's largest and the world's fourth largest specialty generic pharmaceutical company. Operations span manufacturing in India, clinical research, and distribution through subsidiaries in the US (via Taro Pharmaceutical), Israel, and other global markets. Key TP issues involve API supply, finished dosage distribution, and R&D cost sharing.",
      userId: user.id,
    },
  });
  console.log(`\nClient: ${sunpharma.name}`);

  const sunIndia = await prisma.entity.create({
    data: {
      name: "Sun Pharmaceutical Industries Ltd",
      country: "India",
      entityType: "Public Limited Company",
      role: "Principal Entity / R&D Hub / API Manufacturer",
      functions:
        "Drug discovery and R&D, API manufacturing, formulation development, regulatory filings, group strategic management",
      risks:
        "R&D failure risk, regulatory approval risk, patent litigation risk, manufacturing quality risk, API pricing risk",
      assets:
        "R&D centers in Mumbai and Vadodara, manufacturing plants across Gujarat and Maharashtra, 700+ ANDAs filed with USFDA, patent portfolio",
      revenue: 463600000000,
      expenses: 367800000000,
      employees: 38000,
      clientId: sunpharma.id,
    },
  });

  const taroUS = await prisma.entity.create({
    data: {
      name: "Taro Pharmaceutical Industries Ltd",
      country: "United States",
      entityType: "Subsidiary",
      role: "US Manufacturing & Distribution Entity",
      functions:
        "Manufacturing of dermatological and topical pharmaceutical products, US market distribution, regulatory compliance with USFDA",
      risks:
        "USFDA compliance risk, product liability risk, limited market risk (US domestic)",
      assets:
        "Manufacturing facility in Hauppauge NY, USFDA-approved production lines, US distribution network",
      revenue: 52800000000,
      expenses: 43600000000,
      employees: 2800,
      clientId: sunpharma.id,
      parentId: sunIndia.id,
    },
  });

  const sunIsrael = await prisma.entity.create({
    data: {
      name: "Sun Pharma Global FZE",
      country: "United Arab Emirates",
      entityType: "Subsidiary",
      role: "Trading / Distribution Hub",
      functions:
        "Procurement of finished dosages from India, distribution to Middle East, Africa, and CIS markets",
      risks: "Limited risk — bears inventory risk and minor credit risk only",
      assets: "Warehousing in JAFZA, distribution contracts, minimal fixed assets",
      revenue: 38900000000,
      expenses: 36200000000,
      employees: 120,
      clientId: sunpharma.id,
      parentId: sunIndia.id,
    },
  });

  const sunIsraelR = await prisma.entity.create({
    data: {
      name: "Sun Pharma Advanced Research Company (SPARC)",
      country: "India",
      entityType: "Associate Company",
      role: "R&D / New Drug Development Entity",
      functions:
        "Novel drug delivery research, innovative drug development, clinical trials management",
      risks: "Full R&D risk, clinical trial failure risk, regulatory risk",
      assets: "R&D laboratories in Vadodara, clinical trial data, NCE pipeline",
      revenue: 2100000000,
      expenses: 4800000000,
      employees: 450,
      clientId: sunpharma.id,
      parentId: sunIndia.id,
    },
  });

  await prisma.transaction.createMany({
    data: [
      {
        type: "Goods",
        description:
          "Supply of Active Pharmaceutical Ingredients (APIs) from Sun India manufacturing plants to Taro US for finished dosage manufacturing.",
        amount: 28500000000,
        currency: "INR",
        method: "CUP",
        fromEntityId: sunIndia.id,
        toEntityId: taroUS.id,
      },
      {
        type: "Goods",
        description:
          "Supply of finished dosage forms (tablets, capsules, injectables) from Sun India to Sun Pharma Global FZE for distribution in emerging markets.",
        amount: 34200000000,
        currency: "INR",
        method: "RPM",
        fromEntityId: sunIndia.id,
        toEntityId: sunIsrael.id,
      },
      {
        type: "Services",
        description:
          "Contract research services from SPARC to Sun India for formulation development and clinical support.",
        amount: 3800000000,
        currency: "INR",
        method: "TNMM",
        fromEntityId: sunIsraelR.id,
        toEntityId: sunIndia.id,
      },
      {
        type: "Licensing",
        description:
          "License of Sun India's brand portfolio and product dossiers to Taro US for US market commercialisation. Royalty at 5% of net sales.",
        amount: 2640000000,
        currency: "INR",
        method: "CUP",
        fromEntityId: sunIndia.id,
        toEntityId: taroUS.id,
      },
    ],
  });
  console.log("  → 4 entities, 4 transactions created");

  // =========================================================================
  // CLIENT 3: Tata Consultancy Services
  // =========================================================================
  const tcs = await prisma.client.create({
    data: {
      name: "Tata Consultancy Services Limited",
      industry: "Information Technology",
      description:
        "India's largest IT services company and a Tata Group subsidiary. TCS operates through subsidiaries in 46+ countries providing IT services, consulting, and digital solutions. Major TP considerations include IT service fees, brand royalty to Tata Sons, and inter-entity management charges.",
      userId: user.id,
    },
  });
  console.log(`\nClient: ${tcs.name}`);

  const tcsIndia = await prisma.entity.create({
    data: {
      name: "Tata Consultancy Services Limited",
      country: "India",
      entityType: "Public Limited Company",
      role: "Principal Entity / Global Delivery Center",
      functions:
        "Software development, IT consulting, digital transformation services, R&D, global delivery management, IP development (TCS BaNCS, ignio)",
      risks:
        "Technology risk, project execution risk, IP development risk, talent retention risk, currency risk",
      assets:
        "Development centers across 20+ Indian cities, proprietary platforms (TCS BaNCS, ignio, iON), workforce of 600,000+, brand value",
      revenue: 2251070000000,
      expenses: 1658230000000,
      employees: 601546,
      clientId: tcs.id,
    },
  });

  const tcsUS = await prisma.entity.create({
    data: {
      name: "TCS America Inc.",
      country: "United States",
      entityType: "Subsidiary",
      role: "Marketing & Onsite Delivery Entity",
      functions:
        "Client-facing delivery in North America, sales and business development, onsite project management, local regulatory compliance",
      risks: "Limited risk — bears routine marketing and delivery coordination risk",
      assets: "US offices in New Jersey, Chicago, Dallas, client contracts, onsite workforce",
      revenue: 985000000000,
      expenses: 928000000000,
      employees: 45000,
      clientId: tcs.id,
      parentId: tcsIndia.id,
    },
  });

  const tcsUK = await prisma.entity.create({
    data: {
      name: "Tata Consultancy Services UK Limited",
      country: "United Kingdom",
      entityType: "Subsidiary",
      role: "European Delivery & Consulting Entity",
      functions:
        "IT services delivery in UK and Europe, management consulting, client acquisition for EMEA region",
      risks: "Operational risk, GBP/EUR currency risk",
      assets: "UK offices in London, Edinburgh, client portfolio including major UK banks",
      revenue: 342000000000,
      expenses: 318000000000,
      employees: 18000,
      clientId: tcs.id,
      parentId: tcsIndia.id,
    },
  });

  const tcsSingapore = await prisma.entity.create({
    data: {
      name: "TCS Asia Pacific Pte Ltd",
      country: "Singapore",
      entityType: "Subsidiary",
      role: "Regional Hub for Asia-Pacific",
      functions: "Regional management for APAC, sales coordination, local delivery for SEA clients",
      risks: "Limited operational risk, SGD currency risk",
      assets: "Singapore office, APAC client relationships",
      revenue: 128000000000,
      expenses: 119000000000,
      employees: 5500,
      clientId: tcs.id,
      parentId: tcsIndia.id,
    },
  });

  await prisma.transaction.createMany({
    data: [
      {
        type: "Services",
        description:
          "Offshore IT development and support services from TCS India to TCS America for North American client engagements.",
        amount: 620000000000,
        currency: "INR",
        method: "TNMM",
        fromEntityId: tcsIndia.id,
        toEntityId: tcsUS.id,
      },
      {
        type: "Services",
        description:
          "IT services delivery from TCS India to TCS UK for European client projects.",
        amount: 215000000000,
        currency: "INR",
        method: "TNMM",
        fromEntityId: tcsIndia.id,
        toEntityId: tcsUK.id,
      },
      {
        type: "Services",
        description:
          "Offshore delivery and support from TCS India to TCS Singapore for APAC clients.",
        amount: 78000000000,
        currency: "INR",
        method: "TNMM",
        fromEntityId: tcsIndia.id,
        toEntityId: tcsSingapore.id,
      },
      {
        type: "Licensing",
        description:
          "License of TCS BaNCS banking platform to TCS America for sublicensing to US financial institutions.",
        amount: 12500000000,
        currency: "INR",
        method: "CUP",
        fromEntityId: tcsIndia.id,
        toEntityId: tcsUS.id,
      },
    ],
  });
  console.log("  → 4 entities, 4 transactions created");

  // =========================================================================
  // Compliance Alerts
  // =========================================================================
  const allClients = [infosys, sunpharma, tcs];
  for (const client of allClients) {
    await prisma.complianceAlert.createMany({
      data: [
        {
          title: "Form 3CEB due for AY 2026-27",
          description: `Filing of Form 3CEB (Transfer Pricing Certificate) for ${client.name} due by 31st October 2026 under Section 92E.`,
          severity: "critical",
          status: "active",
          clientId: client.id,
        },
        {
          title: "Master File filing deadline approaching",
          description: `Master File (Form 3CEAB) for ${client.name} to be furnished to DGIT by 30th November 2026 per Rule 10DA.`,
          severity: "warning",
          status: "active",
          clientId: client.id,
        },
        {
          title: "Safe Harbour Rule update — CBDT Notification",
          description:
            "CBDT has issued Notification No. 46/2025 updating Safe Harbour margins for IT/ITES sector. Review applicability for current client structure.",
          severity: "info",
          status: "active",
          clientId: client.id,
        },
      ],
    });
  }
  console.log("\n9 compliance alerts created across all clients");

  console.log("\n✓ Seed complete!");
  console.log("\nLogin credentials:");
  console.log("  Email:    demo@tpassist.com");
  console.log("  Password: demo1234");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
