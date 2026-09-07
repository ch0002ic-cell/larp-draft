"use client";

import { Check, Download, FileText, LoaderCircle, RotateCcw, Search, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { LarpHeader } from "@/components/larp-header";
import { downloadBlob, fileStem } from "@/lib/download";
import { buildWorkingCopy, readDocxParagraphs, type EditableParagraph } from "@/lib/docx-working-copy";
import { regulationById, type RegulationId } from "@/lib/regulatory-workspace";
import type { ContractEditSuggestion, ContractReviewResult } from "@/lib/contract-review-model";
import { readPersistedContractReview } from "@/lib/contract-review-client";
import { ContractClauseReview } from "./contract-clause-review";
import { ContractFullDocument } from "./contract-full-document";
import { ReviewSessionTimer } from "./review-session-timer";
import { ReviewLimitations } from "./review-limitations";
import { useReviewSession } from "./use-review-session";

function formatClock(seconds: number) {
  const parts = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60];
  return parts.map((n) => String(n).padStart(2, "0")).join(":");
}

export function ContractEditor({ contractKey, regulationId }: { contractKey: string; regulationId: RegulationId }) {
  const [source, setSource] = useState<ArrayBuffer | null>(null);
  const [paragraphs, setParagraphs] = useState<EditableParagraph[]>([]);
  const [edits, setEdits] = useState<Record<number, string>>({});
  const [insertions, setInsertions] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "error" | "saving">("loading");
  const [message, setMessage] = useState("");
  const [review, setReview] = useState<ContractReviewResult | null>(null);
  const [reviewing, setReviewing] = useState(false);
  /** Clause-by-clause redline, or the working copy read as one document. */
  const [view, setView] = useState<"redline" | "document">("redline");
  const session = useReviewSession(true);
  const regulation = regulationById(regulationId);
  const fileName = decodeURIComponent(contractKey.split("/").at(-1) ?? "contract.docx");
  const sourceUrl = `/api/contracts/${contractKey.split("/").map(encodeURIComponent).join("/")}`;

  useEffect(() => {
    const controller = new AbortController();
    fetch(sourceUrl, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("The source document could not be loaded from R2.");
        const buffer = await response.arrayBuffer();
        const extracted = await readDocxParagraphs(buffer);
        setSource(buffer);
        setParagraphs(extracted);
        setState("ready");
      })
      .catch((error: Error) => { if (error.name !== "AbortError") { setMessage(error.message); setState("error"); } });
    return () => controller.abort();
  }, [sourceUrl]);

  useEffect(() => {
    let active = true;
    readPersistedContractReview(contractKey, regulationId).then((cached) => {
      if (active && cached) { setReview(cached); setMessage("Saved AI review loaded from the priority queue."); }
    }).catch((error: Error) => { if (active) { setMessage(error.message); setState("error"); } });
    return () => { active = false; };
  }, [contractKey, regulationId]);

  const changedCount = Object.keys(edits).filter((key) => edits[Number(key)] !== paragraphs.find((paragraph) => paragraph.index === Number(key))?.text).length + Object.keys(insertions).length;
  const visible = useMemo(() => paragraphs.filter((paragraph) => !query || (edits[paragraph.index] ?? paragraph.text).toLowerCase().includes(query.toLowerCase())), [edits, paragraphs, query]);

  const download = async () => {
    if (!source) return;
    setState("saving");
    setMessage("");
    try {
      const changes = new Map<number, string>();
      Object.entries(edits).forEach(([index, text]) => changes.set(Number(index), text));
      const blob = await buildWorkingCopy(source, changes, Object.values(insertions));
      const ok = downloadBlob(`${fileStem(fileName)}_LARP_working_copy.docx`, blob);
      setMessage(ok ? "Working copy downloaded. The R2 original was not changed." : "The browser blocked the download.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The working copy could not be created.");
    } finally {
      setState("ready");
    }
  };

  const runReview = async () => {
    setReviewing(true); setMessage("");
    try {
      const response = await fetch("/api/contracts/review", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key: contractKey, regulationId }) });
      const data = await response.json() as { review?: ContractReviewResult; error?: string };
      if (!response.ok || !data.review) throw new Error(data.error || "The AI review could not be completed.");
      setReview(data.review); setMessage("Drafting suggestions are ready and saved to the review service.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "The AI review could not be completed."); }
    finally { setReviewing(false); }
  };

  const applySuggestion = (suggestion: ContractEditSuggestion) => {
    if (suggestion.action === "insert" || suggestion.paragraphIndex < 0) setInsertions((current) => ({ ...current, [suggestion.id]: suggestion.proposedText }));
    else setEdits((current) => ({ ...current, [suggestion.paragraphIndex]: suggestion.proposedText }));
    session.recordSuggestion(suggestion.id, "accepted");
  };

  const rejectSuggestion = (suggestion: ContractEditSuggestion) => {
    if (suggestion.action === "insert" || suggestion.paragraphIndex < 0) setInsertions((current) => { const next = { ...current }; delete next[suggestion.id]; return next; });
    else setEdits((current) => { const next = { ...current }; delete next[suggestion.paragraphIndex]; return next; });
    session.recordSuggestion(suggestion.id, "skipped");
  };

  const nextClause = useRef<(() => void) | null>(null);

  const resetEdits = () => { setEdits({}); setInsertions({}); };
  const resolved = session.accepted.size + session.skipped.size;

  /**
   * The design's navy call to action under the side panel: the reviewer
   * finishes the clauses and then reads the whole thing back as one document.
   */
  const openFullDocument = <button type="button" className="open-final" onClick={() => setView("document")}>
    <span>
      <strong>Open full document</strong>
      <small>{resolved >= (review?.suggestions.length ?? 0)
        ? "Every suggestion decided · read it as one document"
        : "See the working copy with your decisions applied"}</small>
    </span>
    <i aria-hidden="true">→</i>
  </button>;

  const panelFooter = <>
    {openFullDocument}
    {review && <ReviewLimitations caveats={review.caveats} />}
  </>;

  return <div className="shell">
    <LarpHeader
      kicker="Word working copy"
      title={fileName}
      meta={regulation.shortName}
      position={review ? undefined : `${changedCount} edited`}
      actions={review
        ? <>
            <span className={`gen-state${reviewing ? " generating" : ""}`}><i />{reviewing ? "Generating" : "Generated"} · {regulation.shortName}</span>
            <span className="chargeable">
              <span><small>Time taken</small><strong>{formatClock(session.elapsedSeconds)}</strong></span>
              <button onClick={session.running ? session.pause : session.start} disabled={!session.startedAt}>{session.running ? "Pause" : "Resume"}</button>
            </span>
            <button className="btn btn--gold" onClick={() => { setView("redline"); nextClause.current?.(); }}>Go to next clause →</button>
          </>
        : <>
            <Link href={`/contracts?regulation=${regulationId}`} className="btn btn--outline-light">← Contract library</Link>
            <button className="btn btn--gold" onClick={download} disabled={!source || state === "saving"}><Download size={14} />{state === "saving" ? "Preparing…" : "Download copy"}</button>
          </>} />
    <main className={`editor-page${review ? " editor-page--review" : ""}`}>
      {!review && <aside className="editor-context">
        <span className="eyebrow">Review context</span><h1>{regulation.title}</h1><p>{regulation.summary}</p>
        <div className="purity-card"><ShieldCheck size={18} /><div><strong>Original protected</strong><p>This editor only fetched the R2 object with GET. Your text changes stay in browser memory and are applied to a downloaded copy.</p></div></div>
        <button className="btn btn--navy btn--block" onClick={runReview} disabled={reviewing || state === "loading"}>{reviewing ? <LoaderCircle className="spin" size={14} /> : <Sparkles size={14} />}{reviewing ? "Comparing contract…" : review ? "Refresh AI suggestions" : `Suggest ${regulation.shortName} edits`}</button>
        <p className="ai-processing-note">When you request suggestions, this contract is sent to your configured OpenAI API project for analysis. L.A.R.P requests no response storage.</p>
        <a href={sourceUrl} target="_blank" rel="noreferrer" className="btn btn--ghost">Open original source</a>
      </aside>}
      <section className={`document-editor${review ? " document-editor--review" : ""}`}>
        {!review && <div className="document-editor__bar"><div><span className="eyebrow">Editable Word text</span><strong>{paragraphs.length + Object.keys(insertions).length} paragraphs · {changedCount} changed</strong></div><label><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find text" /></label><button className="btn btn--ghost btn--sm" onClick={resetEdits} disabled={!changedCount}><RotateCcw size={13} />Reset edits</button></div>}
        <div className="document-editor__scroll">
          {review && view === "document" && <ContractFullDocument fileName={fileName} title={review.documentTitle || fileName} subtitle={review.documentType || "Browser working copy"} paragraphs={paragraphs} edits={edits} insertions={insertions} />}
          {review && view === "redline" && <ContractClauseReview review={review} onAccept={applySuggestion} onReject={rejectSuggestion} onUpdateAccepted={applySuggestion} accepted={session.accepted} skipped={session.skipped} showAssessment={false} panelFooter={panelFooter} nextClauseRef={nextClause} sourceParagraphs={paragraphs} />}
          {state === "loading" && <div className="editor-message"><LoaderCircle className="spin" />Reading the Word document from R2</div>}
          {state === "error" && <div className="editor-message">{message}</div>}
          {!review && (state === "ready" || state === "saving") && <article className="word-paper">
            <div className="word-paper__title"><FileText size={18} /><div><strong>{fileName}</strong><small>Browser working copy</small></div></div>
            {visible.map((paragraph, order) => {
              const value = edits[paragraph.index] ?? paragraph.text;
              const changed = value !== paragraph.text;
              return <div className={`editable-paragraph${changed ? " changed" : ""}`} key={paragraph.index}><span>{order + 1}</span><textarea value={value} rows={Math.max(2, Math.ceil(value.length / 105))} onChange={(event) => { session.recordManual(paragraph.index); setEdits((current) => ({ ...current, [paragraph.index]: event.target.value })); }} aria-label={`Paragraph ${order + 1}`} />{changed && <button onClick={() => setEdits((current) => { const next = { ...current }; delete next[paragraph.index]; return next; })} aria-label={`Reset paragraph ${order + 1}`}><RotateCcw size={13} /></button>}</div>;
            })}
            {Object.entries(insertions).map(([id, value], index) => <div className="editable-paragraph changed" key={id}><span>NEW</span><textarea value={value} rows={Math.max(2, Math.ceil(value.length / 105))} onChange={(event) => { session.recordManual(id); setInsertions((current) => ({ ...current, [id]: event.target.value })); }} aria-label={`Inserted paragraph ${index + 1}`} /><button onClick={() => setInsertions((current) => { const next = { ...current }; delete next[id]; return next; })} aria-label={`Remove inserted paragraph ${index + 1}`}><RotateCcw size={13} /></button></div>)}
          </article>}
        </div>
        <footer className="editor-footer">
          {review
            ? <>
                <span className="editor-footer__meta">{paragraphs.length + Object.keys(insertions).length} paragraphs · {changedCount} changed</span>
                <span className="editor-footer__meta">AI-assisted review · {review.model}</span>
                <span className="editor-footer__state" aria-live="polite">{message || (review.suggestions.length - resolved > 0 ? `${review.suggestions.length - resolved} edit${review.suggestions.length - resolved === 1 ? "" : "s"} awaiting your decision` : "Every suggestion decided")}</span>
                {view === "document" && <button className="btn btn--ghost btn--sm" onClick={() => setView("redline")}>← Back to redline</button>}
                <button className="btn btn--ghost btn--sm" onClick={resetEdits} disabled={!changedCount}><RotateCcw size={13} />Reset edits</button>
                <button className="btn btn--ghost btn--sm" onClick={session.approve} disabled={Boolean(session.approvedAt) || resolved < review.suggestions.length}><Check size={13} />{session.approvedAt ? "Approved" : "Approve review"}</button>
                <button className="btn btn--navy" onClick={download} disabled={!source || state === "saving"}><Download size={14} />Download Word working copy</button>
              </>
            : <><span aria-live="polite">{message || <><Check size={13} />Changes are local until you download a copy.</>}</span><button className="btn btn--gold" onClick={download} disabled={!source || state === "saving"}><Download size={14} />Download Word working copy</button></>}
        </footer>
      </section>
      {!review && <aside className="review-timer-rail" aria-label="Review time and approval">
        <div className="review-timer-rail__label"><span className="eyebrow">Matter time</span><strong>Time taken</strong><p>Tracks the time you spend reading, editing and approving this working copy.</p></div>
        <ReviewSessionTimer elapsedSeconds={session.elapsedSeconds} running={session.running} startedAt={session.startedAt} approvedAt={session.approvedAt} accepted={session.accepted.size} skipped={session.skipped.size} manualEdits={session.manualEdits.size} totalSuggestions={0} onPause={session.pause} onResume={session.start} onApprove={session.approve} />
      </aside>}
    </main>
  </div>;
}
