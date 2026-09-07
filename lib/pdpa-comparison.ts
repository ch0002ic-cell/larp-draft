import { getR2Object, putR2Json } from "@/lib/r2";

export const pdpaComparisonDates = {
  before: "2021-01-02",
  current: "2025-12-05",
} as const;

export type PdpaSourceSnapshot = {
  regulationId: "PDPA2012";
  effectiveDate: string;
  sourceUrl: string;
  fetchedAt: string;
  text: string;
};

export type PdpaComparisonChange = {
  area: string;
  before: string;
  now: string;
  effectiveDate: string;
  significance: string;
  sourceUrl: string;
};

export type PdpaComparison = {
  pipelineVersion: 2;
  regulationId: "PDPA2012";
  fromDate: string;
  toDate: string;
  headline: string;
  executiveSummary: string;
  changes: PdpaComparisonChange[];
  businessImpact: string[];
  caveats: string[];
  generatedAt: string | null;
  generatedBy: "openai";
  model: string | null;
  sourceCoverage: "cached-official-text";
  sourceDocuments: Array<{ label: string; effectiveDate: string; sourceUrl: string; cached: boolean }>;
};

const compactDate = (date: string) => date.replaceAll("-", "");
const sourceKey = (date: string) => `Regulations/sources/PDPA2012/${compactDate(date)}.json`;
const comparisonKey = (fromDate: string, toDate: string) => `Regulations/comparisons/PDPA2012/${compactDate(fromDate)}--${compactDate(toDate)}.json`;

export async function readPdpaSourceSnapshot(date: string): Promise<PdpaSourceSnapshot | null> {
  const response = await getR2Object(sourceKey(date));
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Official source snapshot unavailable.");
  const snapshot = await response.json() as PdpaSourceSnapshot;
  if (snapshot.effectiveDate !== date || !snapshot.text?.trim()) throw new Error("Invalid source snapshot.");
  return snapshot;
}

export async function writePdpaSourceSnapshot(snapshot: PdpaSourceSnapshot) {
  await putR2Json(sourceKey(snapshot.effectiveDate), snapshot);
}

export async function readPdpaComparison(fromDate = pdpaComparisonDates.before, toDate = pdpaComparisonDates.current): Promise<PdpaComparison> {
  const response = await getR2Object(comparisonKey(fromDate, toDate));
  if (!response.ok) throw new Error("Saved comparison unavailable. Generate a comparison from official source snapshots.");
  const comparison = await response.json() as PdpaComparison;
  if (comparison.pipelineVersion !== 2 || comparison.generatedBy !== "openai" || comparison.sourceCoverage !== "cached-official-text"
    || comparison.fromDate !== fromDate || comparison.toDate !== toDate) throw new Error("Comparison requires regeneration from official source snapshots.");
  return comparison;
}

export async function writePdpaComparison(comparison: PdpaComparison) {
  await putR2Json(comparisonKey(comparison.fromDate, comparison.toDate), comparison);
}

export function extractLegalText(html: string) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(?:p|div|section|article|li|tr|h[1-6])>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, value: string) => String.fromCharCode(Number(value)))
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 20)
    .join("\n");
}

export function changedTextEvidence(beforeText: string, currentText: string) {
  const before = beforeText.split("\n");
  const current = currentText.split("\n");
  const normalize = (line: string) => line.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const beforeSet = new Set(before.map(normalize));
  const currentSet = new Set(current.map(normalize));
  const removed = before.filter((line) => !currentSet.has(normalize(line))).slice(0, 220).join("\n").slice(0, 50000);
  const added = current.filter((line) => !beforeSet.has(normalize(line))).slice(0, 220).join("\n").slice(0, 50000);
  return { removed, added };
}
