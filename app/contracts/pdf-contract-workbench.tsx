"use client";

import { Download, FileText, LoaderCircle, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { LarpHeader } from "@/components/larp-header";
import { buildDocxBlob } from "@/lib/docx";
import { downloadBlob, fileStem } from "@/lib/download";
import type { ContractEditSuggestion, ContractReviewResult } from "@/lib/contract-review-model";
import { readPersistedContractReview } from "@/lib/contract-review-client";
import { regulationById, type RegulationId } from "@/lib/regulatory-workspace";
import { ContractClauseReview } from "./contract-clause-review";
import { ReviewSessionTimer } from "./review-session-timer";
import { ReviewLimitations } from "./review-limitations";
import { useReviewSession } from "./use-review-session";

export function PdfContractWorkbench({ contractKey, regulationId }: { contractKey: string; regulationId: RegulationId }) {
  const regulation = regulationById(regulationId);
  const fileName = decodeURIComponent(contractKey.split("/").at(-1) ?? "contract.pdf");
  const sourceUrl = `/api/contracts/${contractKey.split("/").map(encodeURIComponent).join("/")}`;
  const [review, setReview] = useState<ContractReviewResult | null>(null);
  const [edits, setEdits] = useState<Record<number, string>>({});
  const [inserted, setInserted] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "reviewing" | "saving" | "error">("reviewing");
  const [message, setMessage] = useState("");
  const session = useReviewSession(true);

  const runReview = useCallback(async () => {
    setState("reviewing"); setMessage("");
    try {
      const response = await fetch("/api/contracts/review", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key: contractKey, regulationId }) });
      const data = await response.json() as { review?: ContractReviewResult; error?: string };
      if (!response.ok || !data.review) throw new Error(data.error || "The PDF could not be reviewed.");
      setReview(data.review); setState("idle"); setMessage("AI suggestions are ready and saved to the review service.");
    } catch (error) { setState("error"); setMessage(error instanceof Error ? error.message : "The PDF could not be reviewed."); }
  }, [contractKey, regulationId]);

  useEffect(() => {
    let active = true;
    readPersistedContractReview(contractKey, regulationId).then((cached) => {
      if (!active) return;
      if (cached) { setReview(cached); setState("idle"); setMessage("Saved AI review loaded from the priority queue."); }
      else void runReview();
    }).catch((error: Error) => { if (active) { setMessage(error.message); setState("error"); } });
    return () => { active = false; };
  }, [contractKey, regulationId, runReview]);

  function applySuggestion(suggestion: ContractEditSuggestion) {
    if (suggestion.action === "insert" || suggestion.paragraphIndex < 0) setInserted((current) => ({ ...current, [suggestion.id]: suggestion.proposedText }));
    else setEdits((current) => ({ ...current, [suggestion.paragraphIndex]: suggestion.proposedText }));
    session.recordSuggestion(suggestion.id, "accepted");
  }

  function rejectSuggestion(suggestion: ContractEditSuggestion) {
    if (suggestion.action === "insert" || suggestion.paragraphIndex < 0) setInserted((current) => { const next = { ...current }; delete next[suggestion.id]; return next; });
    else setEdits((current) => { const next = { ...current }; delete next[suggestion.paragraphIndex]; return next; });
    session.recordSuggestion(suggestion.id, "skipped");
  }

  async function download() {
    if (!review) return;
    setState("saving"); setMessage("");
    try {
      const text = [...review.paragraphs.map((paragraph) => edits[paragraph.index] ?? paragraph.text), ...Object.values(inserted)];
      const blob = await buildDocxBlob({ title: review.documentTitle || fileStem(fileName), description: `Editable working copy of ${fileName}`, blocks: [
        { kind: "kicker", text: "PDF working copy" }, { kind: "title", text: review.documentTitle || fileStem(fileName) },
        { kind: "subtitle", text: `Prepared from ${fileName}. Verify layout, tables, signatures and page references against the source PDF.` }, { kind: "rule" },
        ...text.filter(Boolean).map((value) => ({ kind: "para" as const, text: value })),
      ] });
      const ok = downloadBlob(`${fileStem(fileName)}_LARP_editable_copy.docx`, blob);
      setMessage(ok ? "Editable Word copy downloaded. The R2 PDF was not changed." : "The browser blocked the download."); setState("idle");
    } catch (error) { setState("error"); setMessage(error instanceof Error ? error.message : "The Word copy could not be created."); }
  }

  return <div className="shell">
    <LarpHeader kicker="Contract review" title={fileName} meta={regulation.shortName} position={review ? `${review.suggestions.length} suggestions` : "Preparing review"} actions={<><Link href={`/contracts?regulation=${regulationId}`} className="btn btn--outline-light">← Contract library</Link><button className="btn btn--gold" onClick={download} disabled={!review || state === "saving"}><Download size={14} />Download working copy</button></>} />
    <main className="pdf-workbench">
      <aside className="pdf-source"><div><span className="eyebrow">Original R2 source</span><h1>{fileName}</h1><p><ShieldCheck size={14} />This PDF remains unchanged.</p></div><iframe src={sourceUrl} title={`Original PDF ${fileName}`} /></aside>
      <section className="pdf-conversion">
        <div className="pdf-conversion__bar"><div><span className="eyebrow">Review & edit</span><strong>{regulation.title}</strong></div><button className="btn btn--navy" onClick={runReview} disabled={state === "reviewing"}>{state === "reviewing" ? <LoaderCircle className="spin" size={14} /> : <Sparkles size={14} />}{state === "reviewing" ? "Preparing review…" : "Refresh AI review"}</button></div>
        <div className="pdf-warning"><FileText size={15} /><p><strong>PDF working-copy note</strong>Paragraph wording can be reviewed and edited, but complex tables, signatures, images, footnotes and exact pagination may differ in the downloaded Word copy. Verify it against the source PDF.</p></div>
        {message && <p className={`pdf-message ${state === "error" ? "error" : ""}`} role="status">{message}</p>}
        {!review && <div className="pdf-empty">{state === "reviewing" ? <LoaderCircle className="spin" size={24} /> : <Sparkles size={24} />}<strong>{state === "reviewing" ? "Preparing your review" : "Review unavailable"}</strong><p>{state === "reviewing" ? "Reading the PDF, checking the selected regulation and preparing clause-level suggestions." : "Refresh the AI review to try again."}</p></div>}
        {review && <div className="pdf-conversion__scroll"><ContractClauseReview review={review} onAccept={applySuggestion} onReject={rejectSuggestion} onUpdateAccepted={applySuggestion} accepted={session.accepted} skipped={session.skipped} /></div>}
      </section>
      <aside className="review-timer-rail" aria-label="Review time and approval">
        <div className="review-timer-rail__label"><span className="eyebrow">Matter time</span><strong>Time taken</strong><p>Tracks the time you spend comparing the PDF, editing and approving the working copy.</p></div>
        {review && <ReviewLimitations caveats={review.caveats} />}
        <ReviewSessionTimer elapsedSeconds={session.elapsedSeconds} running={session.running} startedAt={session.startedAt} approvedAt={session.approvedAt} accepted={session.accepted.size} skipped={session.skipped.size} manualEdits={session.manualEdits.size} totalSuggestions={review?.suggestions.length ?? 0} onPause={session.pause} onResume={session.start} onApprove={session.approve} />
      </aside>
    </main>
  </div>;
}
