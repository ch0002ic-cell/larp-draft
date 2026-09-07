import { writeRegulationCatalog, type RegulationRecord } from "@/lib/singapore-regulations";
import { extractLegalText, pdpaComparisonDates, writePdpaSourceSnapshot } from "@/lib/pdpa-comparison";

export const dynamic = "force-dynamic";

const SSO = "https://sso.agc.gov.sg";
const pageSize = 500;

const cleanText = (value: string) => value.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();

function parseInstruments(html: string, kind: "act" | "subsidiary-legislation", status: RegulationRecord["status"]) {
  const found = new Map<string, RegulationRecord>();
  const pattern = kind === "act" ? /^\/Act\/([A-Za-z0-9_-]+)(?:[/?#]|$)/i : /^\/SL\/([A-Za-z0-9_-]+)(?:[/?#]|$)/i;
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = match[1];
    const idMatch = href.match(pattern);
    const title = cleanText(match[2]);
    if (!idMatch || !title || /^(actions|download|subsidiary legislation|amendments rss feed)$/i.test(title)) continue;
    const id = idMatch[1];
    found.set(id, { id, title, kind, status, source: "Singapore Statutes Online", sourceUrl: new URL(href, SSO).toString(), versions: [] });
  }
  return [...found.values()];
}

async function fetchCategory(kind: "act" | "subsidiary-legislation", browseStatus: "Current" | "Repealed" | "Revoked" | "Uncommenced", status: RegulationRecord["status"]) {
  const segment = kind === "act" ? "Act" : "SL";
  const records = new Map<string, RegulationRecord>();
  for (let page = 1; page <= 20; page++) {
    const url = `${SSO}/Browse/${segment}/${browseStatus}/All/${page}?PageSize=${pageSize}&SortBy=Title&SortOrder=ASC`;
    const response = await fetch(url, { headers: { "user-agent": "LARP-Regulatory-Snapshot/1.0 (+manual administrator sync)" }, cache: "no-store" });
    if (!response.ok) throw new Error(`SSO returned ${response.status} for ${segment} page ${page}`);
    const previousCount = records.size;
    const pageRecords = parseInstruments(await response.text(), kind, status);
    pageRecords.forEach((record) => records.set(record.id, record));
    if (pageRecords.length === 0 || records.size === previousCount) break;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return [...records.values()];
}

async function syncPdpaSnapshots() {
  const result = { cached: 0, warnings: [] as string[] };
  for (const effectiveDate of [pdpaComparisonDates.before, pdpaComparisonDates.current]) {
    const sourceUrl = `${SSO}/Act/PDPA2012?DocDate=${effectiveDate.replaceAll("-", "")}`;
    try {
      const response = await fetch(sourceUrl, { headers: { "user-agent": "LARP-Regulatory-Snapshot/1.0 (+manual administrator sync)" }, cache: "no-store" });
      if (!response.ok) throw new Error(`SSO returned ${response.status}`);
      const text = extractLegalText(await response.text());
      if (text.length < 1000) throw new Error("SSO returned too little legal text");
      await writePdpaSourceSnapshot({ regulationId: "PDPA2012", effectiveDate, sourceUrl, fetchedAt: new Date().toISOString(), text });
      result.cached += 1;
    } catch (error) {
      result.warnings.push(`${effectiveDate}: ${error instanceof Error ? error.message : "snapshot failed"}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return result;
}

export async function POST(request: Request) {
  const expectedSecret = process.env.REGULATION_SYNC_SECRET;
  if (!expectedSecret || request.headers.get("authorization") !== `Bearer ${expectedSecret}`) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const singaporeHour = Number(new Intl.DateTimeFormat("en-SG", { timeZone: "Asia/Singapore", hour: "2-digit", hourCycle: "h23" }).format(new Date()));
  if (singaporeHour < 3 || singaporeHour >= 7) return Response.json({ error: "SSO automated extraction is restricted to 03:00–07:00 Singapore time. No request was sent to SSO." }, { status: 423 });

  try {
    const categories = [
      await fetchCategory("act", "Current", "current"),
      await fetchCategory("act", "Repealed", "repealed"),
      await fetchCategory("act", "Uncommenced", "uncommenced"),
      await fetchCategory("subsidiary-legislation", "Current", "current"),
      await fetchCategory("subsidiary-legislation", "Revoked", "revoked"),
      await fetchCategory("subsidiary-legislation", "Uncommenced", "uncommenced"),
    ];
    const instruments = categories.flat();
    if (!instruments.length) throw new Error("SSO returned no catalogue records.");
    const catalog = { fetchedAt: new Date().toISOString(), source: "Singapore Statutes Online" as const, sourceUrl: SSO, instruments };
    await writeRegulationCatalog(catalog);
    const pdpaSnapshots = await syncPdpaSnapshots();
    return Response.json({
      synced: instruments.length,
      currentActs: categories[0].length,
      repealedActs: categories[1].length,
      uncommencedActs: categories[2].length,
      currentSubsidiaryLegislation: categories[3].length,
      revokedSubsidiaryLegislation: categories[4].length,
      uncommencedSubsidiaryLegislation: categories[5].length,
      pdpaSnapshots,
      fetchedAt: catalog.fetchedAt,
    });
  } catch (error) {
    console.error("Regulation catalogue sync failed", error);
    return Response.json({ error: error instanceof Error ? error.message : "Regulation catalogue sync failed." }, { status: 502 });
  }
}
