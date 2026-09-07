import "server-only";

import { getR2Object, putR2Json } from "@/lib/r2";

export type LawChange = {
  area: string;
  before: string;
  now: string;
  effectiveDate: string;
  impact: string;
};

export type LawSource = { title: string; url: string; publisher: string };

export type LawChangeDraft = {
  title: string;
  shortName: string;
  jurisdiction: string;
  legalStatus: "proposal" | "bill" | "passed" | "uncommenced" | "current" | "uncertain";
  statusAsAt: string;
  summary: string;
  changes: LawChange[];
  sources: LawSource[];
  confidence: "high" | "medium" | "low";
  caveats: string[];
};

export type SavedLawChange = LawChangeDraft & {
  id: string;
  createdAt: string;
  reviewed: true;
};

const intakeKey = "Regulations/intake.json";
const allowedSourceHosts = ["sso.agc.gov.sg", "mom.gov.sg", "www.mom.gov.sg", "pdpc.gov.sg", "www.pdpc.gov.sg", "mddi.gov.sg", "www.mddi.gov.sg", "parliament.gov.sg", "www.parliament.gov.sg"];

export function isAllowedLawSource(value: string) {
  try { return allowedSourceHosts.includes(new URL(value).hostname.toLowerCase()); } catch { return false; }
}

export function sanitizeDraft(input: LawChangeDraft): LawChangeDraft {
  const statuses = new Set(["proposal", "bill", "passed", "uncommenced", "current", "uncertain"]);
  const confidence = new Set(["high", "medium", "low"]);
  return {
    title: String(input.title ?? "Untitled regulatory change").slice(0, 180),
    shortName: String(input.shortName ?? "LAW").slice(0, 24),
    jurisdiction: String(input.jurisdiction ?? "Singapore").slice(0, 80),
    legalStatus: statuses.has(input.legalStatus) ? input.legalStatus : "uncertain",
    statusAsAt: String(input.statusAsAt ?? new Date().toISOString().slice(0, 10)).slice(0, 32),
    summary: String(input.summary ?? "").slice(0, 6000),
    changes: Array.isArray(input.changes) ? input.changes.slice(0, 12).map((item) => ({ area: String(item.area ?? "").slice(0, 160), before: String(item.before ?? "").slice(0, 2000), now: String(item.now ?? "").slice(0, 2000), effectiveDate: String(item.effectiveDate ?? "Not confirmed").slice(0, 80), impact: String(item.impact ?? "").slice(0, 2000) })) : [],
    sources: Array.isArray(input.sources) ? input.sources.filter((source) => isAllowedLawSource(String(source.url ?? ""))).slice(0, 12).map((source) => ({ title: String(source.title ?? "Official source").slice(0, 240), url: String(source.url), publisher: String(source.publisher ?? "Singapore government").slice(0, 120) })) : [],
    confidence: confidence.has(input.confidence) ? input.confidence : "low",
    caveats: Array.isArray(input.caveats) ? input.caveats.slice(0, 10).map((item) => String(item).slice(0, 1000)) : [],
  };
}

export async function readSavedLawChanges(): Promise<SavedLawChange[]> {
  const response = await getR2Object(intakeKey);
  if (response.status === 404) return [];
  if (!response.ok) throw new Error("Saved law changes unavailable.");
  const value = await response.json();
  if (!Array.isArray(value)) throw new Error("Invalid saved law changes.");
  return value as SavedLawChange[];
}

export async function saveLawChange(draft: LawChangeDraft) {
  const clean = sanitizeDraft(draft);
  if (!clean.summary || clean.sources.length === 0) throw new Error("INVALID_LAW_CHANGE");
  const current = await readSavedLawChanges();
  const record: SavedLawChange = { ...clean, id: `law-${Date.now()}`, createdAt: new Date().toISOString(), reviewed: true };
  await putR2Json(intakeKey, [record, ...current].slice(0, 100));
  return record;
}
