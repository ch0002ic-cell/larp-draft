import { createHash } from "node:crypto";
import JSZip from "jszip";
import { getR2Object } from "@/lib/r2";
import { isRegulationId, regulationById } from "@/lib/regulatory-workspace";
import { readCachedReview, writeCachedReview } from "@/lib/contract-review-server-cache";
import { createResponse, incompleteReason, responseText } from "@/lib/openai-responses";
import type { ContractParagraph, ContractReviewResult } from "@/lib/contract-review-model";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_BYTES = 20 * 1024 * 1024;
// Demo setting: only the opening section of a contract is sent to the model, so
// a review returns in seconds rather than ~2 minutes. The full document is still
// returned for display — the window applies to AI analysis only.
const REVIEW_PARAGRAPH_LIMIT = Number(process.env.REVIEW_PARAGRAPH_LIMIT ?? 80);
// A cache hit answers instantly, which reads as "nothing happened" on stage.
// Hold the response briefly so the UI's progress state is visible.
const CACHE_HIT_MIN_MS = Number(process.env.REVIEW_CACHE_HIT_MIN_MS ?? 5000);
const CACHE_HIT_MAX_MS = Number(process.env.REVIEW_CACHE_HIT_MAX_MS ?? 10000);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const allowedDomains = ["sso.agc.gov.sg", "mom.gov.sg", "pdpc.gov.sg", "mddi.gov.sg", "parliament.gov.sg"];
const allowedHosts = new Set([...allowedDomains, ...allowedDomains.map((domain) => `www.${domain}`)]);

function isAllowedSource(value: string) {
  try { return allowedHosts.has(new URL(value).hostname.toLowerCase()); } catch { return false; }
}

async function extractDocxParagraphs(bytes: Uint8Array): Promise<ContractParagraph[]> {
  const archive = await JSZip.loadAsync(bytes);
  const xml = await archive.file("word/document.xml")?.async("string");
  if (!xml) throw new Error("The Word document has no readable document body.");
  const paragraphs = [...xml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)].map((match, index) => ({
    index,
    text: [...match[0].matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map((part) => part[1]).join("").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'"),
  }));
  return paragraphs.filter((paragraph) => paragraph.text.trim()).slice(0, 1200);
}

const schema = {
  type: "object", additionalProperties: false,
  required: ["documentTitle", "documentType", "overallAssessment", "paragraphs", "suggestions", "sources", "caveats"],
  properties: {
    documentTitle: { type: "string" }, documentType: { type: "string" }, overallAssessment: { type: "string" },
    paragraphs: { type: "array", items: { type: "object", additionalProperties: false, required: ["index", "text"], properties: { index: { type: "integer" }, text: { type: "string" } } } },
    suggestions: { type: "array", items: { type: "object", additionalProperties: false, required: ["id", "paragraphIndex", "action", "clause", "originalText", "proposedText", "reason", "legalBasis", "sourceUrl", "confidence"], properties: {
      id: { type: "string" }, paragraphIndex: { type: "integer" }, action: { type: "string", enum: ["amend", "insert", "review"] }, clause: { type: "string" }, originalText: { type: "string" }, proposedText: { type: "string" }, reason: { type: "string" }, legalBasis: { type: "string" }, sourceUrl: { type: "string" }, confidence: { type: "string", enum: ["high", "medium", "low"] },
    } } },
    sources: { type: "array", items: { type: "object", additionalProperties: false, required: ["title", "url"], properties: { title: { type: "string" }, url: { type: "string" } } } },
    caveats: { type: "array", items: { type: "string" } },
  },
};

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const key = query.get("key") ?? "", regulationId = query.get("regulationId");
  const prefix = process.env.R2_CONTRACT_PREFIX ?? "Contracts/";
  if (!key.startsWith(prefix) || key.includes("..") || !isRegulationId(regulationId)) return Response.json({ error: "Invalid review request." }, { status: 400 });
  try {
    const source = await getR2Object(key);
    if (!source.ok) throw new Error("Source unavailable");
    const bytes = new Uint8Array(await source.arrayBuffer());
    if (bytes.byteLength > MAX_BYTES) return Response.json({ error: "Document exceeds review size budget." }, { status: 413 });
    const fingerprint = source.headers.get("etag")?.replaceAll('"', "") || createHash("sha256").update(bytes).digest("hex");
    const saved = await readCachedReview(key, regulationId, fingerprint);
    return Response.json({ review: saved?.review ?? null }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Saved review unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.startsWith("replace_")) return Response.json({ error: "AI review is unavailable: OPENAI_API_KEY is not configured on the server." }, { status: 503 });
  const body = await request.json() as { key?: string; regulationId?: string };
  const prefix = process.env.R2_CONTRACT_PREFIX ?? "Contracts/";
  const key = String(body.key ?? "");
  if (!key.startsWith(prefix) || key.includes("..")) return Response.json({ error: "Invalid contract key." }, { status: 400 });
  if (!isRegulationId(body.regulationId)) return Response.json({ error: "Choose PDPA or Workplace Fairness Act." }, { status: 400 });
  const extension = key.split(".").pop()?.toLowerCase();
  if (extension !== "pdf" && extension !== "docx") return Response.json({ error: "AI review currently supports PDF and DOCX files." }, { status: 415 });

  try {
    const source = await getR2Object(key);
    if (!source.ok) return Response.json({ error: "The source contract could not be loaded from R2." }, { status: source.status });
    const bytes = new Uint8Array(await source.arrayBuffer());
    if (bytes.byteLength > MAX_BYTES) return Response.json({ error: "This contract is larger than the 20 MB review limit." }, { status: 413 });

    const fingerprint = source.headers.get("etag")?.replaceAll('"', "") || createHash("sha256").update(bytes).digest("hex");
    const cached = await readCachedReview(key, body.regulationId, fingerprint);
    if (cached) {
      // Target a total response time in the 5-10s window, absorbing the R2 read
      // already spent rather than adding on top of it.
      const target = CACHE_HIT_MIN_MS + Math.floor(Math.random() * Math.max(0, CACHE_HIT_MAX_MS - CACHE_HIT_MIN_MS));
      await sleep(Math.max(0, target - (Date.now() - startedAt)));
      return Response.json({ review: cached.review, cached: true, cachedAt: cached.cachedAt, reviewedParagraphs: cached.reviewedParagraphs, totalParagraphs: cached.totalParagraphs });
    }

    const regulation = regulationById(body.regulationId);
    const knownParagraphs = extension === "docx" ? await extractDocxParagraphs(bytes) : [];
    // Chunk: the model sees the opening window, the client still gets every paragraph.
    const reviewParagraphs = knownParagraphs.slice(0, REVIEW_PARAGRAPH_LIMIT);
    const annotatedText = reviewParagraphs.map((paragraph) => `[PARAGRAPH ${paragraph.index}] ${paragraph.text}`).join("\n").slice(0, 180000);
    const content: Array<Record<string, string>> = [{ type: "input_text", text: `Review this contract against ${regulation.title}. The official source is ${regulation.sourceUrl}. ${regulation.summary}\n\nIdentify only material clauses affected by the verified legal position. Suggest complete replacement wording for amendments. For a missing clause, use action insert. For uncertainty, use action review. Do not invent obligations or commencement dates. Search official Singapore sources and distinguish current obligations from future readiness. ${extension === "docx" ? `You are reviewing the opening section of the contract (paragraphs 0-${Math.max(0, reviewParagraphs.length - 1)} of ${knownParagraphs.length}). Use the exact paragraph indexes below and preserve the original meaning where no change is needed:\n${annotatedText}` : `Extract only the first ${REVIEW_PARAGRAPH_LIMIT} paragraphs of the PDF in clean reading order with stable zero-based indexes, then map every suggestion to the closest of those paragraphs.`}` }];
    if (extension === "pdf") content.push({ type: "input_file", filename: key.split("/").at(-1) ?? "contract.pdf", file_data: `data:application/pdf;base64,${Buffer.from(bytes).toString("base64")}` });

    const raw = await createResponse(apiKey, {
      model: process.env.OPENAI_MODEL ?? "gpt-5-mini", store: false,
      instructions: "You are a cautious Singapore contract-review assistant supporting a qualified lawyer. Produce drafting suggestions, not a final legal opinion. Use only official Singapore government sources.",
      input: [{ role: "user", content }], tools: [{ type: "web_search", filters: { allowed_domains: allowedDomains }, search_context_size: "high" }], tool_choice: "auto", max_tool_calls: 8, max_output_tokens: 48000,
      text: { format: { type: "json_schema", name: "contract_regulatory_review", strict: true, schema } },
    });
    const reason = incompleteReason(raw);
    if (reason) throw new Error(reason === "max_output_tokens" ? "This contract is too long to review in one pass. Review a shorter document or split it into sections." : `The review stopped before finishing (${reason}).`);
    const parsed = JSON.parse(responseText(raw)) as Omit<ContractReviewResult, "model">;
    const paragraphs = extension === "docx" ? knownParagraphs : parsed.paragraphs.map((paragraph, index) => ({ index, text: String(paragraph.text ?? "") })).filter((paragraph) => paragraph.text.trim()).slice(0, 1200);
    const validIndexes = new Set(paragraphs.map((paragraph) => paragraph.index));
    if (parsed.suggestions.some((item) => !isAllowedSource(item.sourceUrl))) throw new Error("Review contains an unsupported source citation.");
    const suggestions = parsed.suggestions.slice(0, 20).map((item, index) => ({ ...item, id: item.id || `suggestion-${index}`, paragraphIndex: Number(item.paragraphIndex) })).filter((item) => item.action !== "amend" || validIndexes.has(item.paragraphIndex));
    const reviewedCount = extension === "docx" ? reviewParagraphs.length : Math.min(paragraphs.length, REVIEW_PARAGRAPH_LIMIT);
    const scopeCaveat = paragraphs.length > reviewedCount ? [`Only the opening ${reviewedCount} of ${paragraphs.length} paragraphs were analysed. Later clauses have not been reviewed.`] : [];
    const result: ContractReviewResult = { ...parsed, paragraphs, suggestions, sources: parsed.sources.filter((source) => isAllowedSource(source.url)).slice(0, 12), caveats: [...scopeCaveat, ...parsed.caveats].slice(0, 10), model: process.env.OPENAI_MODEL ?? "gpt-5-mini" };
    await writeCachedReview({ contractKey: key, regulationId: body.regulationId, fingerprint, reviewedParagraphs: reviewedCount, totalParagraphs: paragraphs.length, review: result });
    return Response.json({ review: result, cached: false, reviewedParagraphs: reviewedCount, totalParagraphs: paragraphs.length });
  } catch (error) {
    console.error("Contract regulatory review failed", error, (error as { cause?: unknown } | null)?.cause);
    return Response.json({ error: error instanceof Error ? error.message : "The contract review failed." }, { status: 502 });
  }
}
