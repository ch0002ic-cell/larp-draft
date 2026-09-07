import { getR2Object, putR2Json } from "@/lib/r2";

export type RegulationVersion = {
  effectiveDate: string;
  basis: string;
  sourceUrl: string;
};

export type RegulationLifecycleEvent = {
  date: string;
  stage: "consultation" | "bill" | "passed" | "assent" | "published" | "commenced" | "consolidated";
  label: string;
  detail: string;
  sourceUrl: string;
};

export type RegulationRecord = {
  id: string;
  title: string;
  kind: "act" | "subsidiary-legislation";
  status: "current" | "repealed" | "uncommenced" | "revoked";
  sourceUrl: string;
  source: "Singapore Statutes Online";
  currentAsAt?: string;
  versions: RegulationVersion[];
  lifecycle?: RegulationLifecycleEvent[];
  latestChange?: {
    effectiveDate: string;
    instrument: string;
    summary: string;
    affectedProvision?: string;
    sourceUrl: string;
  };
};

export type RegulationOverlay = {
  regulationId: string;
  tracked: boolean;
  tags: string[];
  internalNotes: string;
  updatedAt: string;
};

export type RegulationCatalog = {
  fetchedAt: string | null;
  source: "Singapore Statutes Online";
  sourceUrl: string;
  instruments: RegulationRecord[];
};

const catalogKey = "Regulations/catalog.json";
const overlaysKey = "Regulations/overlays.json";

export async function readRegulationCatalog(): Promise<RegulationCatalog> {
  const response = await getR2Object(catalogKey);
  if (!response.ok) throw new Error("Regulation catalogue unavailable. Complete an authorised catalogue sync.");
  const catalog = await response.json() as RegulationCatalog;
  if (!Array.isArray(catalog.instruments) || !catalog.fetchedAt) throw new Error("Invalid regulation catalogue.");
  return catalog;
}

export async function writeRegulationCatalog(catalog: RegulationCatalog) {
  await putR2Json(catalogKey, catalog);
}

export async function readRegulationOverlays(): Promise<RegulationOverlay[]> {
  const response = await getR2Object(overlaysKey);
  if (response.status === 404) return [];
  if (!response.ok) throw new Error("Regulation annotations unavailable.");
  const overlays = await response.json();
  if (!Array.isArray(overlays)) throw new Error("Invalid regulation annotations.");
  return overlays as RegulationOverlay[];
}

export async function writeRegulationOverlay(overlay: RegulationOverlay) {
  const overlays = await readRegulationOverlays();
  const next = [...overlays.filter((item) => item.regulationId !== overlay.regulationId), overlay];
  await putR2Json(overlaysKey, next);
}
