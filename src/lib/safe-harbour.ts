/**
 * Safe Harbour eligibility engine — Rule 10TA–10TE as amended by CBDT
 * notification of 25 March 2025 (applicable AY 2025-26 and AY 2026-27).
 * Thresholds for the main service categories were raised to ₹300 crore and
 * lithium-ion batteries for EV/HEV added to core auto components.
 *
 * NOTE: draft rules under the Income-tax Act 2025 propose consolidating IT
 * service categories at a 15.5% margin with a ₹2,000 crore threshold — still
 * draft; surfaced as an advisory note, not applied.
 */

export type SafeHarbourCategory =
  | "SOFTWARE_DEV"
  | "ITES"
  | "KPO"
  | "CONTRACT_RND_SOFTWARE"
  | "CONTRACT_RND_PHARMA"
  | "AUTO_COMPONENTS_CORE"
  | "AUTO_COMPONENTS_NON_CORE"
  | "INTRA_GROUP_LOAN"
  | "CORPORATE_GUARANTEE"
  | "LOW_VALUE_INTRA_GROUP_SERVICES";

export type SafeHarbourInput = {
  category: SafeHarbourCategory;
  transactionValue: number; // INR
  operatingMargin?: number | null; // % (OP/OE) declared by the taxpayer
  employeeCostRatio?: number | null; // % of operating cost — KPO only
};

export type SafeHarbourResult = {
  eligible: boolean;
  requiredMargin: number | null; // % — null when not margin-based
  declaredMargin: number | null;
  meetsMargin: boolean | null;
  notes: string[];
};

const CR = 10000000;

export const SAFE_HARBOUR_CATEGORIES: {
  id: SafeHarbourCategory;
  label: string;
}[] = [
  { id: "SOFTWARE_DEV", label: "Software development services" },
  { id: "ITES", label: "IT-enabled services (BPO)" },
  { id: "KPO", label: "Knowledge process outsourcing" },
  { id: "CONTRACT_RND_SOFTWARE", label: "Contract R&D — software" },
  { id: "CONTRACT_RND_PHARMA", label: "Contract R&D — generic pharma" },
  { id: "AUTO_COMPONENTS_CORE", label: "Core auto components (incl. EV li-ion batteries)" },
  { id: "AUTO_COMPONENTS_NON_CORE", label: "Non-core auto components" },
  { id: "INTRA_GROUP_LOAN", label: "Intra-group loan to non-resident AE" },
  { id: "CORPORATE_GUARANTEE", label: "Corporate guarantee to AE" },
  { id: "LOW_VALUE_INTRA_GROUP_SERVICES", label: "Low value-adding intra-group services" },
];

export function checkSafeHarbour(input: SafeHarbourInput): SafeHarbourResult {
  const notes: string[] = [];
  const v = input.transactionValue;
  const declared = input.operatingMargin ?? null;

  const marginBased = (
    cap: number,
    required: number,
    capNote: string
  ): SafeHarbourResult => {
    if (v > cap) {
      return {
        eligible: false,
        requiredMargin: required,
        declaredMargin: declared,
        meetsMargin: null,
        notes: [capNote],
      };
    }
    const meets = declared === null ? null : declared >= required;
    if (meets === false)
      notes.push(
        `Declared margin ${declared}% is below the required ${required}% — raise the markup or benchmark normally.`
      );
    if (meets === null)
      notes.push(`Eligible by value; margin of at least ${required}% (OP/OE) must be declared.`);
    return {
      eligible: true,
      requiredMargin: required,
      declaredMargin: declared,
      meetsMargin: meets,
      notes,
    };
  };

  switch (input.category) {
    case "SOFTWARE_DEV":
    case "ITES": {
      // ≤ ₹100 Cr → 17%; > ₹100 Cr ≤ ₹300 Cr → 18%
      if (v <= 100 * CR) return marginBased(100 * CR, 17, "");
      return marginBased(
        300 * CR,
        18,
        "Transaction value exceeds ₹300 crore — outside safe harbour (Rule 10TD as amended Mar 2025)."
      );
    }
    case "KPO": {
      if (v > 300 * CR) {
        return {
          eligible: false,
          requiredMargin: null,
          declaredMargin: declared,
          meetsMargin: null,
          notes: ["Transaction value exceeds ₹300 crore — outside safe harbour."],
        };
      }
      const ecr = input.employeeCostRatio;
      let required = 24;
      if (ecr === null || ecr === undefined) {
        notes.push(
          "Employee-cost ratio not provided — assuming ≥60% (required margin 24%). Bands: ≥60% → 24%, 40–60% → 21%, <40% → 18%."
        );
      } else if (ecr >= 60) required = 24;
      else if (ecr >= 40) required = 21;
      else required = 18;
      const meets = declared === null ? null : declared >= required;
      if (meets === false)
        notes.push(`Declared margin ${declared}% below required ${required}%.`);
      return {
        eligible: true,
        requiredMargin: required,
        declaredMargin: declared,
        meetsMargin: meets,
        notes,
      };
    }
    case "CONTRACT_RND_SOFTWARE":
    case "CONTRACT_RND_PHARMA":
      return marginBased(
        300 * CR,
        24,
        "Transaction value exceeds ₹300 crore — outside safe harbour."
      );
    case "AUTO_COMPONENTS_CORE":
      return marginBased(
        300 * CR,
        12,
        "Transaction value exceeds ₹300 crore — outside safe harbour."
      );
    case "AUTO_COMPONENTS_NON_CORE":
      return marginBased(
        300 * CR,
        8.5,
        "Transaction value exceeds ₹300 crore — outside safe harbour."
      );
    case "INTRA_GROUP_LOAN":
      return {
        eligible: true,
        requiredMargin: null,
        declaredMargin: null,
        meetsMargin: null,
        notes: [
          "Interest rate must be at least the 6-month reference rate + spread linked to the AE's credit rating (Rule 10TD table; CRISIL or equivalent rating required for loans above ₹250 crore).",
        ],
      };
    case "CORPORATE_GUARANTEE":
      return {
        eligible: true,
        requiredMargin: null,
        declaredMargin: null,
        meetsMargin: null,
        notes: ["Guarantee commission of at least 1% per annum of the amount guaranteed."],
      };
    case "LOW_VALUE_INTRA_GROUP_SERVICES": {
      if (v > 10 * CR) {
        return {
          eligible: false,
          requiredMargin: 5,
          declaredMargin: declared,
          meetsMargin: null,
          notes: ["Aggregate value exceeds ₹10 crore — outside safe harbour."],
        };
      }
      return {
        eligible: true,
        requiredMargin: 5,
        declaredMargin: declared,
        meetsMargin: declared === null ? null : declared <= 5,
        notes: ["Mark-up must not exceed 5% (cost-pooling method certified by an accountant)."],
      };
    }
  }
}

export const SAFE_HARBOUR_DISCLAIMER =
  "Indicative check based on Rule 10TD/10TE as amended by CBDT notification of 25 March 2025 (AY 2025-26 and 2026-27). Electing safe harbour requires Form 3CEFA before the return due date and acceptance by the AO. Draft rules under the Income-tax Act 2025 propose consolidated IT-services categories at 15.5% margin with a ₹2,000 crore threshold — not yet in force. Verify against the current notification before advising.";
