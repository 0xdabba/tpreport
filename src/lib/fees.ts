/**
 * Fee calculator defaults for TP engagements — editable in the proposal UI.
 * Anchored to mid-tier Indian CA firm pricing (per-deliverable, INR).
 */

export type FeeItem = {
  id: string;
  label: string;
  baseFee: number; // INR
  note?: string;
};

export const FEE_ITEMS: FeeItem[] = [
  { id: "form-3ceb", label: "Form 3CEB certification (Sec 92E)", baseFee: 75000 },
  { id: "tp-study", label: "Transfer Pricing Study / Local File", baseFee: 150000 },
  { id: "benchmarking", label: "Benchmarking study (per transaction class)", baseFee: 75000 },
  { id: "master-file", label: "Master File (Form 3CEAA)", baseFee: 100000 },
  { id: "cbcr", label: "CbCR compliance (Form 3CEAD/3CEAC)", baseFee: 125000 },
  { id: "agreements", label: "Intragroup agreement drafting (each)", baseFee: 40000 },
  { id: "safe-harbour", label: "Safe harbour evaluation + Form 3CEFA", baseFee: 50000 },
  { id: "planning", label: "TP policy design / planning memo", baseFee: 200000, note: "Scope-dependent" },
];

export const COMPLEXITY_MULTIPLIERS = [
  { id: "standard", label: "Standard (1-3 transaction classes, single AE geography)", multiplier: 1 },
  { id: "moderate", label: "Moderate (4-6 classes or multiple geographies)", multiplier: 1.25 },
  { id: "complex", label: "Complex (intangibles, restructuring, litigation history)", multiplier: 1.5 },
];

export function estimateEngagementFee(
  itemIds: string[],
  complexity: "standard" | "moderate" | "complex" = "standard"
): { items: { id: string; label: string; fee: number }[]; total: number } {
  const mult =
    COMPLEXITY_MULTIPLIERS.find((m) => m.id === complexity)?.multiplier || 1;
  const items = itemIds
    .map((id) => FEE_ITEMS.find((f) => f.id === id))
    .filter((f): f is FeeItem => !!f)
    .map((f) => ({ id: f.id, label: f.label, fee: Math.round(f.baseFee * mult) }));
  return { items, total: items.reduce((a, b) => a + b.fee, 0) };
}
