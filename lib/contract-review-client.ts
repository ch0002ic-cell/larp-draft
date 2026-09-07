import type { ContractReviewResult } from "@/lib/contract-review-model";

export async function readPersistedContractReview(contractKey: string, regulationId: string): Promise<ContractReviewResult | null> {
  const query = new URLSearchParams({ key: contractKey, regulationId });
  const response = await fetch(`/api/contracts/review?${query}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Saved review unavailable. Check the review service and source document.");
  const value = await response.json() as { review: ContractReviewResult | null };
  return value.review;
}
