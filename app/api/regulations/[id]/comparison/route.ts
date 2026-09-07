import {
  changedTextEvidence,
  pdpaComparisonDates,
  readPdpaComparison,
  readPdpaSourceSnapshot,
  writePdpaComparison,
  type PdpaComparison,
} from "@/lib/pdpa-comparison";
import { createResponse, incompleteReason, responseRefusal, responseText } from "@/lib/openai-responses";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function sourceState() {
  const [before, current] = await Promise.all([
    readPdpaSourceSnapshot(pdpaComparisonDates.before),
    readPdpaSourceSnapshot(pdpaComparisonDates.current),
  ]);
  return { before, current };
}

function withSourceState(comparison: PdpaComparison, before: Awaited<ReturnType<typeof readPdpaSourceSnapshot>>, current: Awaited<ReturnType<typeof readPdpaSourceSnapshot>>) {
  return {
    ...comparison,
    sourceDocuments: comparison.sourceDocuments.map((document) => ({
      ...document,
      cached: document.effectiveDate === pdpaComparisonDates.before ? Boolean(before) : Boolean(current),
    })),
  };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
  const { id } = await params;
  if (id !== "PDPA2012") return Response.json({ error: "Detailed comparison is currently available for PDPA2012." }, { status: 404 });
  const [{ before, current }, comparison] = await Promise.all([sourceState(), readPdpaComparison()]);
  return Response.json({ comparison: withSourceState(comparison, before, current), aiConfigured: Boolean(process.env.OPENAI_API_KEY) });
  } catch {
    return Response.json({ error: "Requested records are unavailable. Check the source service and saved evidence." }, { status: 503 });
  }
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id !== "PDPA2012") return Response.json({ error: "Detailed comparison is currently available for PDPA2012." }, { status: 404 });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return Response.json({ error: "Add OPENAI_API_KEY to .env.local to generate an AI comparison." }, { status: 503 });

  const { before, current } = await sourceState();
  if (!before?.text || !current?.text) return Response.json({ error: "Both official source snapshots are required. Run the authorised source sync first." }, { status: 409 });
  const evidence = changedTextEvidence(before.text, current.text);
  const allowedSources = [before.sourceUrl, current.sourceUrl];
  const model = process.env.OPENAI_MODEL ?? "gpt-5-mini";
  const schema = {
    type: "object",
    properties: {
      headline: { type: "string" },
      executiveSummary: { type: "string" },
      changes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            area: { type: "string" },
            before: { type: "string" },
            now: { type: "string" },
            effectiveDate: { type: "string" },
            significance: { type: "string" },
            sourceUrl: { type: "string" },
          },
          required: ["area", "before", "now", "effectiveDate", "significance", "sourceUrl"],
          additionalProperties: false,
        },
      },
      businessImpact: { type: "array", items: { type: "string" } },
      caveats: { type: "array", items: { type: "string" } },
    },
    required: ["headline", "executiveSummary", "changes", "businessImpact", "caveats"],
    additionalProperties: false,
  };

  // The comparison reasons over up to 100k characters of statute text, so it can
  // run for minutes. Allow for that rather than cutting a working call short.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 240000);
  try {
    const response = await createResponse(apiKey, {
      model,
      input: [
        {
          role: "system",
          content: "You are a Singapore regulatory change analyst. Compare only the supplied PDPA evidence. Be precise, concise and neutral. Distinguish legal text from operational implications. Do not invent sections, dates, duties or URLs. This is a summary, not legal advice.",
        },
        {
          role: "user",
          content: `Compare the Personal Data Protection Act 2012 version effective ${pdpaComparisonDates.before} with the version effective ${pdpaComparisonDates.current}.\n\nSOURCE COVERAGE: Cached official SSO text from both dates\n\nTEXT PRESENT BEFORE BUT NOT CURRENT:\n${evidence.removed}\n\nTEXT PRESENT CURRENT BUT NOT BEFORE:\n${evidence.added}\n\nAllowed source URLs (use only these):\n${allowedSources.join("\n")}`,
        },
      ],
      // A reasoning model spends this budget on its own reasoning before it
      // writes anything, and five changes with before/now wording is not a
      // small answer. At 4000 the response was cut off mid-JSON and the parse
      // below failed as an opaque 502.
      max_output_tokens: 32000,
      text: { format: { type: "json_schema", name: "pdpa_comparison", strict: true, schema } },
    }, controller.signal);
    const reason = incompleteReason(response);
    if (reason) return Response.json({ error: reason === "max_output_tokens" ? "The comparison was too long to finish. Cache the official texts and try again." : `The comparison stopped before finishing (${reason}).` }, { status: 502 });
    const text = responseText(response);
    if (!text) return Response.json({ error: responseRefusal(response) || "OpenAI returned no comparison." }, { status: 502 });
    const generated = JSON.parse(text) as Pick<PdpaComparison, "headline" | "executiveSummary" | "changes" | "businessImpact" | "caveats">;
    const safeSources = new Set(allowedSources);
    if (generated.changes.some((change) => !safeSources.has(change.sourceUrl))) throw new Error("Comparison contains an unsupported source citation.");
    const comparison: PdpaComparison = {
      pipelineVersion: 2,
      regulationId: "PDPA2012", fromDate: pdpaComparisonDates.before, toDate: pdpaComparisonDates.current,
      sourceDocuments: [before, current].map((snapshot) => ({ label: snapshot.effectiveDate, effectiveDate: snapshot.effectiveDate, sourceUrl: snapshot.sourceUrl, cached: true })),
      ...generated,
      generatedAt: new Date().toISOString(),
      generatedBy: "openai",
      model,
      sourceCoverage: "cached-official-text",
    };
    await writePdpaComparison(comparison);
    return Response.json({ comparison: withSourceState(comparison, before, current), aiConfigured: true });
  } catch (error) {
    console.error("PDPA comparison failed", error, (error as { cause?: unknown } | null)?.cause);
    if (error instanceof Error && error.name === "AbortError") return Response.json({ error: "OpenAI request timed out." }, { status: 502 });
    return Response.json({ error: error instanceof Error ? error.message : "OpenAI comparison failed." }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
