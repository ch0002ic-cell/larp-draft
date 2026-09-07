import { readRegulationCatalog, readRegulationOverlays, writeRegulationOverlay, type RegulationOverlay } from "@/lib/singapore-regulations";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
  const url = new URL(request.url);
  const query = (url.searchParams.get("query") ?? "").trim().toLowerCase();
  const kind = url.searchParams.get("kind");
  const status = url.searchParams.get("status");
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(500, Math.max(1, Number.parseInt(url.searchParams.get("limit") ?? "100", 10) || 100));
  const [catalog, overlays] = await Promise.all([readRegulationCatalog(), readRegulationOverlays()]);
  const overlayById = new Map(overlays.map((item) => [item.regulationId, item]));
  const matched = catalog.instruments
    .filter((item) => !query || item.title.toLowerCase().includes(query) || item.id.toLowerCase().includes(query))
    .filter((item) => !kind || item.kind === kind)
    .filter((item) => !status || item.status === status);
  const regulations = matched
    .slice((page - 1) * limit, page * limit)
    .map((item) => ({ ...item, overlay: overlayById.get(item.id) ?? null }));

  return Response.json({ ...catalog, count: matched.length, page, limit, regulations });
  } catch {
    return Response.json({ error: "Requested records are unavailable. Check the source service and saved evidence." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const input = await request.json() as Partial<RegulationOverlay>;
  if (!input.regulationId || typeof input.internalNotes !== "string") return Response.json({ error: "regulationId and internalNotes are required." }, { status: 400 });
  const catalog = await readRegulationCatalog();
  if (!catalog.instruments.some((item) => item.id === input.regulationId)) return Response.json({ error: "Unknown regulation." }, { status: 404 });
  const overlay: RegulationOverlay = { regulationId: input.regulationId, tracked: input.tracked ?? true, tags: Array.isArray(input.tags) ? input.tags.slice(0, 12) : [], internalNotes: input.internalNotes.slice(0, 10000), updatedAt: new Date().toISOString() };
  try {
    await writeRegulationOverlay(overlay);
    return Response.json({ overlay });
  } catch {
    return Response.json({ error: "Could not save the annotation. The R2 credential needs write access for the Regulations/ prefix." }, { status: 502 });
  }
}
