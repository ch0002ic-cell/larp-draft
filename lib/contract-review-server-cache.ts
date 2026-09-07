import { createHash } from "node:crypto";
import { getR2Object, putR2Json } from "@/lib/r2";
import type { ContractReviewResult } from "@/lib/contract-review-model";

// Cached reviews live under Regulations/ because that prefix is writable and,
// unlike Contracts/, is not scanned by the contract listing — a .json file
// dropped under Contracts/ would surface as a phantom contract.
const cachePrefix = "Regulations/review-cache/";

// The fingerprint only tracks the source document, so it cannot notice a change
// to the prompt, the schema or the post-processing. Bump this whenever the shape
// or meaning of a stored review changes, otherwise old entries are served as if
// they were produced by the new pipeline. Entries written before versioning are
// treated as v1.
// v2: prod moved from gpt-5-mini to gpt-5.6-sol, so v1 entries describe a
// different model than the one now named in each review.
const CACHE_VERSION = "v3";

export type CachedContractReview = {
  contractKey: string;
  regulationId: string;
  version: string;
  /** R2 ETag of the source document. A replaced document invalidates the entry. */
  fingerprint: string;
  reviewedParagraphs: number;
  totalParagraphs: number;
  cachedAt: string;
  review: ContractReviewResult;
};

const cacheKeyFor = (contractKey: string, regulationId: string) =>
  `${cachePrefix}${regulationId}-${createHash("sha256").update(contractKey).digest("hex").slice(0, 32)}.json`;

export async function readCachedReview(contractKey: string, regulationId: string, fingerprint: string) {
  {
    const response = await getR2Object(cacheKeyFor(contractKey, regulationId));
    if (response.status === 404) return null;
    if (!response.ok) throw new Error("Review cache unavailable.");
    const value = await response.json() as Partial<CachedContractReview>;
    if (!value.review || value.fingerprint !== fingerprint) return null;
    if ((value.version ?? "v1") !== CACHE_VERSION) return null;
    return value as CachedContractReview;
  }
}

export async function writeCachedReview(entry: Omit<CachedContractReview, "cachedAt" | "version">) {
  await putR2Json(cacheKeyFor(entry.contractKey, entry.regulationId), { ...entry, version: CACHE_VERSION, cachedAt: new Date().toISOString() });
  return true;
}
