"use client";

import { AlertCircle, ArrowRight, BookOpen, Check, ChevronRight, Clock3, ExternalLink, FileDiff, History, LoaderCircle, PencilLine, RefreshCw, Scale, Search, ShieldCheck, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Version = { effectiveDate: string; basis: string; sourceUrl: string };
type LifecycleEvent = { date: string; stage: string; label: string; detail: string; sourceUrl: string };
type Regulation = {
  id: string; title: string; kind: string; status: string; source: string; sourceUrl: string; currentAsAt?: string; versions: Version[]; lifecycle?: LifecycleEvent[];
  latestChange?: { effectiveDate: string; instrument: string; summary: string; affectedProvision?: string; sourceUrl: string };
  overlay?: { internalNotes: string; tracked: boolean; tags: string[] } | null;
};
type PdpaComparison = {
  headline: string;
  executiveSummary: string;
  changes: Array<{ area: string; before: string; now: string; effectiveDate: string; significance: string; sourceUrl: string }>;
  businessImpact: string[];
  caveats: string[];
  generatedAt: string | null;
  generatedBy: "openai";
  model: string | null;
  sourceCoverage: "cached-official-text";
  sourceDocuments: Array<{ label: string; effectiveDate: string; sourceUrl: string; cached: boolean }>;
};

export function RegulationLibrary({ onClose }: { onClose: () => void }) {
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [selectedId, setSelectedId] = useState("PDPA2012");
  const [query, setQuery] = useState("");
  const [catalogError, setCatalogError] = useState("");
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [noteDraft, setNoteDraft] = useState<{ id: string; value: string } | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [comparison, setComparison] = useState<PdpaComparison | null>(null);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [comparisonState, setComparisonState] = useState<"loading" | "ready" | "generating" | "error">("loading");
  const [comparisonMessage, setComparisonMessage] = useState("");
  const [activeChangeIndex, setActiveChangeIndex] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => {
    if (controller.signal.aborted) return;
    setLoading(true); setCatalogError("");
    return fetch(`/api/regulations?query=${encodeURIComponent(query)}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => { if (!response.ok) throw new Error("Regulation catalogue unavailable. Try again after the source service is restored."); return response.json(); })
      .then((data) => { setRegulations(data.regulations ?? []); setTotal(data.count ?? 0); setLoading(false); })
      .catch((error) => { if (error.name !== "AbortError") { setLoading(false); setRegulations([]); setCatalogError(error.message); } });
    });
    return () => controller.abort();
  }, [query, refreshNonce]);

  const selected = regulations.find((item) => item.id === selectedId) ?? regulations[0];
  const versions = selected?.versions ?? [];
  const currentVersion = versions.at(-1);
  const previousVersion = versions.at(-2);

  const notes = noteDraft?.id === selected?.id ? noteDraft?.value ?? "" : selected?.overlay?.internalNotes ?? "";
  const setNotes = (value: string) => { if (selected) setNoteDraft({ id: selected.id, value }); setSaveState("idle"); };

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => {
    if (controller.signal.aborted) return;
    if (selected?.id !== "PDPA2012") { setComparison(null); return; }
    setComparisonState("loading");
    return fetch("/api/regulations/PDPA2012/comparison", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Comparison unavailable");
        setComparison(data.comparison);
        setAiConfigured(Boolean(data.aiConfigured));
        setComparisonState("ready");
      })
      .catch((error) => { if (error.name !== "AbortError") { setComparisonMessage(error.message); setComparisonState("error"); } });
    });
    return () => controller.abort();
  }, [selected?.id]);

  const groupedLifecycle = useMemo(() => selected?.lifecycle ?? [], [selected]);
  const activeChange = comparison?.changes[activeChangeIndex] ?? comparison?.changes[0];

  async function saveNotes() {
    if (!selected) return;
    setSaveState("saving");
    const response = await fetch("/api/regulations", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ regulationId: selected.id, internalNotes: notes, tracked: true, tags: ["monitored"] }) });
    setSaveState(response.ok ? "saved" : "error");
  }

  async function generateComparison() {
    setComparisonState("generating");
    setComparisonMessage("");
    try {
      const response = await fetch("/api/regulations/PDPA2012/comparison", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not generate the comparison");
      setComparison(data.comparison);
      setAiConfigured(Boolean(data.aiConfigured));
      setComparisonState("ready");
    } catch (error) {
      setComparisonMessage(error instanceof Error ? error.message : "Could not generate the comparison");
      setComparisonState("error");
    }
  }

  return <div className="regulation-backdrop" role="dialog" aria-modal="true" aria-label="Singapore regulation library">
    <div className="regulation-workspace">
      <header className="registry-topbar"><div><span><Scale size={17} /></span><div><small>OFFICIAL SOURCE REGISTRY</small><strong>Singapore legislation</strong></div></div><div className="registry-source"><ShieldCheck size={14} /><span>Source: Singapore Statutes Online</span><i />Official text locked</div><button onClick={onClose} aria-label="Close regulation library"><X size={18} /></button></header>
      <div className="registry-layout">
        <aside className="registry-list">
          <div className="registry-search"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search acts and regulations" /></div>
          <div className="registry-list-heading"><span>Showing {regulations.length} of {total} instruments</span><button aria-label="Refresh catalogue" onClick={() => setRefreshNonce((value) => value + 1)}><RefreshCw size={13} /></button></div>
          {loading ? <div className="registry-loading"><LoaderCircle size={18} />Loading official registry</div> : regulations.map((item) => <button className={item.id === selected?.id ? "active" : ""} key={item.id} onClick={() => setSelectedId(item.id)}><span className="law-icon"><BookOpen size={14} /></span><span><strong>{item.title}</strong><small>{item.kind.replace("-", " ")} · {item.status}</small></span><ChevronRight size={13} /></button>)}
          {catalogError && <p role="alert" className="catalog-callout">{catalogError}</p>}
        </aside>

        {selected && <section className="registry-detail">
          <div className="registry-heading"><div><div className="official-label"><span />{selected.status.toUpperCase()} · OFFICIAL SOURCE</div><h2>{selected.title}</h2><p>{selected.id} · Source status as at {selected.currentAsAt ?? currentVersion?.effectiveDate ?? "source sync"}</p></div><a href={selected.sourceUrl} target="_blank" rel="noreferrer">Open on SSO <ExternalLink size={13} /></a></div>

          <div className="version-compare">
            <div className="compare-heading"><div><FileDiff size={15} />VERSION COMPARISON</div><span>Official versions are immutable</span></div>
            {selected.id === "PDPA2012" && <div className="compare-grid">
              <div><small>PAST VERSION</small><strong>{comparison?.sourceDocuments[0]?.effectiveDate ?? previousVersion?.effectiveDate ?? "No earlier snapshot"}</strong><p>{comparison?.sourceDocuments[0]?.label ?? previousVersion?.basis}</p>{comparison?.sourceDocuments[0] && <a href={comparison.sourceDocuments[0].sourceUrl} target="_blank" rel="noreferrer">Open official text <ExternalLink size={11} /></a>}</div><ArrowRight size={18} /><div className="present-version"><small>PRESENT VERSION</small><strong>{comparison?.sourceDocuments[1]?.effectiveDate ?? currentVersion?.effectiveDate}</strong><p>{comparison?.sourceDocuments[1]?.label ?? currentVersion?.basis}</p>{comparison?.sourceDocuments[1] && <a href={comparison.sourceDocuments[1].sourceUrl} target="_blank" rel="noreferrer">Open official text <ExternalLink size={11} /></a>}</div>
            </div>}
            {selected.id === "WFA2025" && <div className="verified-change"><span><Clock3 size={14} /></span><div><small>READINESS STATUS</small><strong>Passed, published and not yet in force</strong><p>Use this record to prepare employment documents and processes. Do not label a current document as breaching the WFA until the relevant provisions commence.</p><em>Official SSO status: uncommenced</em></div><a href={selected.sourceUrl} target="_blank" rel="noreferrer"><ExternalLink size={13} /></a></div>}
            {selected.id === "PDPA2012" && <div className="ai-comparison">
              <div className="ai-comparison-head"><div><Sparkles size={15} /><span>PDPA CHANGE SUMMARY</span>{comparison && <em>{`OPENAI · ${comparison.model}`}</em>}</div><button onClick={generateComparison} disabled={comparisonState === "generating"}>{comparisonState === "generating" ? <LoaderCircle size={13} /> : <Sparkles size={13} />}{comparison?.generatedBy === "openai" ? "Refresh AI summary" : "Generate with OpenAI"}</button></div>
              {comparisonState === "loading" && <div className="comparison-loading"><LoaderCircle size={16} />Loading PDPA comparison</div>}
              {comparison && <>
                <div className="comparison-overview">
                  <div><small>EXECUTIVE SUMMARY</small><h3>{comparison.headline}</h3><p>{comparison.executiveSummary}</p></div>
                  <aside><strong>Business actions</strong><ul>{comparison.businessImpact.map((impact) => <li key={impact}>{impact}</li>)}</ul></aside>
                </div>
                <div className="comparison-browser">
                  <nav aria-label="PDPA change areas"><small>{comparison.changes.length} MATERIAL CHANGES</small>{comparison.changes.map((change, index) => <button type="button" className={index === activeChangeIndex ? "active" : ""} key={`${change.area}-${change.effectiveDate}`} onClick={() => setActiveChangeIndex(index)}><span>{String(index + 1).padStart(2, "0")}</span><strong>{change.area}</strong><ChevronRight size={14} /></button>)}</nav>
                  {activeChange && <section className="change-detail"><header><div><span>Effective {activeChange.effectiveDate}</span><strong>{activeChange.area}</strong></div><a href={activeChange.sourceUrl} target="_blank" rel="noreferrer">Official source <ExternalLink size={12} /></a></header><div className="change-before-after"><div className="before-state"><small>BEFORE</small><p>{activeChange.before}</p></div><span className="change-arrow"><ArrowRight size={15} /></span><div className="current-state"><small>CURRENT</small><p>{activeChange.now}</p></div></div><footer><small>OPERATIONAL IMPLICATION</small><p>{activeChange.significance}</p></footer></section>}
                </div>
                <div className="comparison-provenance"><ShieldCheck size={13} /><span>Compared using cached official text from both selected dates.</span></div>
              </>}
              {comparisonState === "error" && <div className="comparison-error"><AlertCircle size={14} /><span>{comparisonMessage}</span>{!aiConfigured && <small>Add OPENAI_API_KEY to .env.local, then restart the development server.</small>}</div>}
            </div>}
            {selected.latestChange && <div className="verified-change"><span><Check size={14} /></span><div><small>VERIFIED CHANGE INSTRUMENT</small><strong>{selected.latestChange.instrument}</strong><p>{selected.latestChange.summary}</p><em>Affected provision: {selected.latestChange.affectedProvision}</em></div><a href={selected.latestChange.sourceUrl} target="_blank" rel="noreferrer"><ExternalLink size={13} /></a></div>}
          </div>

          <div className="registry-bottom-grid">
            <section className="lifecycle-panel"><div className="compare-heading"><div><History size={15} />LEGISLATIVE LIFECYCLE</div><span>{groupedLifecycle.length} source events</span></div><div className="law-timeline">{groupedLifecycle.map((event) => <a href={event.sourceUrl} target="_blank" rel="noreferrer" key={`${event.date}-${event.stage}`}><i /><time>{event.date}</time><div><small>{event.stage}</small><strong>{event.label}</strong><p>{event.detail}</p></div><ExternalLink size={11} /></a>)}</div></section>
            <aside className="annotation-panel"><div className="compare-heading"><div><PencilLine size={15} />INTERNAL OVERLAY</div><span>Does not alter the law</span></div><p>Record your interpretation, affected business processes, or review instructions. The official source remains read-only.</p><label htmlFor="regulation-notes">Internal legal notes</label><textarea id="regulation-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Example: Revalidate our data retention clause against this version…" /><button onClick={saveNotes} disabled={saveState === "saving"}>{saveState === "saving" ? <LoaderCircle size={14} /> : <Check size={14} />}{saveState === "saved" ? "Saved to R2" : saveState === "error" ? "Write access required" : "Save internal overlay"}</button><small>Use a separate R2 write credential for annotations. Official SSO content cannot be edited here.</small></aside>
          </div>
        </section>}
      </div>
    </div>
  </div>;
}
