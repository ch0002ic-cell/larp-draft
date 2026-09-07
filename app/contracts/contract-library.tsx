"use client";

import {
  Building2,
  ChevronDown,
  Cloud,
  ExternalLink,
  FileText,
  GitBranch,
  LoaderCircle,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LarpHeader } from "@/components/larp-header";
import {
  readPersistedContractReview,
} from "@/lib/contract-review-client";
import type { ContractReviewResult } from "@/lib/contract-review-model";
import { DOCUMENT_TYPES } from "@/lib/contract-metadata";
import {
  contractMatchesRegulation,
  regulationById,
  type RegulationId,
} from "@/lib/regulatory-workspace";
import { TopDownContractGraph } from "@/app/resilience/top-down-contract-graph";

type Priority = "Unreviewed" | "Critical" | "High" | "Medium" | "Low";
type Contract = {
  id: string;
  key: string;
  name: string;
  size: number;
  lastModified: string;
  downloadUrl: string;
  format: string;
  editable: boolean;
  convertible: boolean;
  client: string;
  documentType: string;
  status: string;
};
type ReviewState = {
  state: "queued" | "checking" | "ready" | "error";
  review?: ContractReviewResult;
};

const priorityOrder: Record<Priority, number> = {
  Unreviewed: 4,
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

function aiPriority(
  review: ContractReviewResult | undefined,
): Priority {
  if (!review) return "Unreviewed";
  if (review.suggestions.some((item) => item.confidence === "high"))
    return "Critical";
  if (review.suggestions.length) return "High";
  return "Low";
}

export function ContractLibrary({
  initialRegulation,
}: {
  initialRegulation: RegulationId;
}) {
  const [regulationId, setRegulationId] =
    useState<RegulationId>(initialRegulation);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [query, setQuery] = useState("");
  const [client, setclient] = useState("All companies");
  const [documentType, setDocumentType] = useState("All document types");
  const [priority, setPriority] = useState("All priorities");
  const [view, setView] = useState<"queue" | "map">("queue");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [reviews, setReviews] = useState<Record<string, ReviewState>>({});
  const [batchRunning, setBatchRunning] = useState(false);
  const regulation = regulationById(regulationId);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/contracts", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json()) as { contracts?: Contract[] };
        if (!response.ok) throw new Error();
        const items = body.contracts ?? [];
        setContracts(items);
        const cached: Record<string, ReviewState> = {};
        const savedReviews = await Promise.all(
          items.map(async (contract) => ({
            contract,
            review: await readPersistedContractReview(contract.key, regulationId),
          })),
        );
        savedReviews.forEach(({ contract, review }) => {
          if (review) cached[contract.key] = { state: "ready", review };
        });
        setReviews(cached);
        setState("ready");
      })
      .catch((error: Error) => {
        if (error.name !== "AbortError") setState("error");
      });
    return () => controller.abort();
  }, [regulationId]);

  const relevant = useMemo(
    () =>
      contracts.filter((contract) =>
        contractMatchesRegulation(contract.key, regulationId),
      ),
    [contracts, regulationId],
  );
  const companies = useMemo(
    () => [...new Set(relevant.map((contract) => contract.client))].sort(),
    [relevant],
  );
  const visible = useMemo(
    () =>
      relevant
        .map((contract) => {
          const review = reviews[contract.key]?.review;
          return {
            ...contract,
            priority: aiPriority(
              review,
            ),
            reviewState: reviews[contract.key],
          };
        })
        .filter(
          (contract) =>
            !query ||
            `${contract.name} ${contract.key}`
              .toLowerCase()
              .includes(query.toLowerCase()),
        )
        .filter(
          (contract) =>
            client === "All companies" || contract.client === client,
        )
        .filter(
          (contract) =>
            documentType === "All document types" ||
            contract.documentType === documentType,
        )
        .filter(
          (contract) =>
            priority === "All priorities" || contract.priority === priority,
        )
        .sort(
          (a, b) =>
            priorityOrder[a.priority] - priorityOrder[b.priority] ||
            a.name.localeCompare(b.name),
        ),
    [client, documentType, priority, query, relevant, reviews],
  );

  const checkable = visible
    .filter((contract) => contract.editable || contract.convertible)
    .slice(0, 6);
  const completedChecks = Object.values(reviews).filter(
    (item) => item.state === "ready",
  ).length;

  async function runParallelChecks() {
    if (!checkable.length) return;
    setBatchRunning(true);
    setReviews((current) => ({
      ...current,
      ...Object.fromEntries(
        checkable.map((contract) => [
          contract.key,
          { state: "checking" as const },
        ]),
      ),
    }));
    await Promise.allSettled(
      checkable.map(async (contract) => {
        const response = await fetch("/api/contracts/review", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ key: contract.key, regulationId }),
        });
        const data = (await response.json()) as {
          review?: ContractReviewResult;
          error?: string;
        };
        if (!response.ok || !data.review) {
          setReviews((current) => ({
            ...current,
            [contract.key]: { state: "error" },
          }));
          throw new Error(data.error);
        }
        setReviews((current) => ({
          ...current,
          [contract.key]: { state: "ready", review: data.review },
        }));
      }),
    );
    setBatchRunning(false);
  }

  return (
    <div className="shell">
      <LarpHeader
        kicker="Contract review"
        title={regulation.shortName}
        meta={`${regulation.title} · priority workspace`}
        actions={
          <Link href="/" className="btn btn--outline-light">
            ← Main workspace
          </Link>
        }
      />
      <main className="contracts-page">
        <div className="contracts-page__head">
          <div>
            <span className="eyebrow">Integrated R2 review workspace</span>
            <h1>Dependency and priority queue</h1>
            <p>
              Trace the regulation to affected files, run parallel AI checks,
              then review proposed wording with a timed Git-style comparison.
            </p>
          </div>
          <div className="source-lock">
            <ShieldCheck size={17} />
            <span>
              <strong>No write-back</strong>R2 sources remain unchanged
            </span>
          </div>
        </div>
        <section className="review-command-bar">
          <div>
            <span className="eyebrow">
              <Sparkles size={13} /> AI priority check
            </span>
            <strong>{completedChecks} reviewed in this session</strong>
            <small>
              Runs up to six visible Word or PDF files concurrently and reuses
              the results in the editor.
            </small>
          </div>
          <button
            className="btn btn--gold"
            onClick={runParallelChecks}
            disabled={batchRunning || !checkable.length}
          >
            {batchRunning ? (
              <LoaderCircle className="spin" size={14} />
            ) : (
              <Sparkles size={14} />
            )}
            {batchRunning
              ? `Checking ${checkable.length} files in parallel…`
              : `AI check top ${checkable.length} visible files`}
          </button>
        </section>
        <div className="contracts-toolbar">
          <div className="law-toggle" aria-label="Regulation filter">
            {(["PDPA2012", "WFA2025"] as RegulationId[]).map((id) => (
              <button
                key={id}
                aria-pressed={regulationId === id}
                onClick={() => setRegulationId(id)}
              >
                {regulationById(id).shortName}
              </button>
            ))}
          </div>
          <label className="contracts-search">
            <Search size={15} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search R2 contracts"
            />
          </label>
          <label className="compact-select">
            <span>client</span>
            <select
              value={client}
              onChange={(event) => setclient(event.target.value)}
            >
              <option>All companies</option>
              {companies.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <ChevronDown size={12} />
          </label>
          <label className="compact-select">
            <span>Type</span>
            <select
              value={documentType}
              onChange={(event) => setDocumentType(event.target.value)}
            >
              <option>All document types</option>
              {DOCUMENT_TYPES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <ChevronDown size={12} />
          </label>
          <label className="compact-select">
            <span>Priority</span>
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
            >
              <option>All priorities</option>
              {Object.keys(priorityOrder).map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <ChevronDown size={12} />
          </label>
        </div>
        <div className="view-switch">
          <button
            className={view === "queue" ? "active" : ""}
            onClick={() => setView("queue")}
          >
            <FileText size={14} />
            Priority queue
          </button>
          <button
            className={view === "map" ? "active" : ""}
            onClick={() => setView("map")}
          >
            <GitBranch size={14} />
            Dependency map
          </button>
          <span>
            {state === "ready"
              ? `${visible.length} visible files`
              : "Connecting…"}
          </span>
        </div>
        {view === "map" ? (
          <section className="integrated-dependency-map">
            <TopDownContractGraph
              key={regulationId}
              contracts={visible}
              initialRegulationId={regulationId}
            />
          </section>
        ) : (
          <section
            className="contracts-table"
            aria-label={`${regulation.shortName} contracts`}
          >
            <div className="contracts-table__header">
              <span>Priority and document</span>
              <span>client / type</span>
              <span>AI check</span>
              <span>Action</span>
            </div>
            {state === "loading" && (
              <div className="contracts-message">
                <LoaderCircle className="spin" size={18} />
                Loading directly from R2
              </div>
            )}
            {state === "error" && (
              <div className="contracts-message">
                The contract library could not be loaded. Check the read-only R2
                credentials.
              </div>
            )}
            {state === "ready" &&
              visible.map((contract) => {
                const workbench = contract.editable || contract.convertible;
                const href = workbench
                  ? `/contracts/${contract.key.split("/").map(encodeURIComponent).join("/")}?regulation=${regulationId}`
                  : contract.downloadUrl;
                const suggestionCount =
                  contract.reviewState?.review?.suggestions.length;
                return (
                  <article className="contract-row" key={contract.key}>
                    <span className="contract-row__doc">
                      <b
                        className={`priority-badge priority-badge--${contract.priority.toLowerCase()}`}
                      >
                        {contract.priority}
                      </b>
                      <i>
                        <FileText size={16} />
                      </i>
                      <span>
                        <strong>{contract.name}</strong>
                        <small>{contract.key}</small>
                      </span>
                    </span>
                    <span className="contract-row__metadata">
                      <b>
                        <Building2 size={12} />
                        {contract.client}
                      </b>
                      <small>
                        {contract.documentType} ·{" "}
                        {contract.format.toUpperCase()} ·{" "}
                        {(contract.size / 1024).toFixed(0)} KB
                      </small>
                    </span>
                    <span
                      className={`ai-check-state ${contract.reviewState?.state ?? "queued"}`}
                    >
                      {contract.reviewState?.state === "checking" ? (
                        <>
                          <LoaderCircle className="spin" size={13} />
                          Checking
                        </>
                      ) : contract.reviewState?.state === "ready" ? (
                        <>
                          <Sparkles size={13} />
                          {suggestionCount} proposed change
                          {suggestionCount === 1 ? "" : "s"}
                        </>
                      ) : contract.reviewState?.state === "error" ? (
                        "Check failed"
                      ) : (
                        "Not checked"
                      )}
                    </span>
                    <Link
                      href={href}
                      target={workbench ? undefined : "_blank"}
                      className={workbench ? "btn btn--gold" : "btn btn--ghost"}
                    >
                      {workbench ? (
                        "Review & edit"
                      ) : (
                        <>
                          Open original <ExternalLink size={13} />
                        </>
                      )}
                    </Link>
                  </article>
                );
              })}
            {state === "ready" && visible.length === 0 && (
              <div className="contracts-message">
                No contracts match these filters.
              </div>
            )}
          </section>
        )}
        <p className="contracts-footnote">
          <Cloud size={13} />
          Documents remain unreviewed until an AI review is available. A qualified
          reviewer must assess the resulting priority and suggested changes.
        </p>
      </main>
    </div>
  );
}
