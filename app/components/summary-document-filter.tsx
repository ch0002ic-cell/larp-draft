"use client";

import {
  Building2,
  FileText,
  List,
  LoaderCircle,
  Network,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  contractMatchesRegulation,
  regulationById,
  type RegulationId,
} from "@/lib/regulatory-workspace";
import { DOCUMENT_TYPES } from "@/lib/contract-metadata";
import { readPersistedContractReview } from "@/lib/contract-review-client";
import type { ContractReviewResult } from "@/lib/contract-review-model";
import { SummaryImpactGraph } from "./summary-impact-graph";

type ChangePriority = "High" | "Medium" | "Low";
const priorityOrder: Record<ChangePriority, number> = {
  High: 0,
  Medium: 1,
  Low: 2,
};

type Contract = {
  key: string;
  name: string;
  format: string;
  editable: boolean;
  convertible: boolean;
  client: string;
  documentType: string;
  status: string;
  lastModified: string;
  downloadUrl: string;
};

function priorityFor(
  contract: Contract,
  regulationId: RegulationId,
  review: ContractReviewResult | null,
): ChangePriority {
  if (
    review?.suggestions.some((suggestion) => suggestion.confidence === "high")
  )
    return "High";
  if (review?.suggestions.length) return "Medium";
  if (review) return "Low";
  const value = decodeURIComponent(
    `${contract.key} ${contract.name}`,
  ).toLowerCase();
  const direct =
    regulationId === "WFA2025"
      ? /employment|employee|offer|intern|staff|workplace/.test(value)
      : /privacy|personal data|data protection|processing|security|confidential|nda/.test(
          value,
        );
  if (
    direct &&
    ["Agreement", "Offer letter", "Policy"].includes(contract.documentType)
  )
    return "High";
  if (
    direct ||
    ["Agreement", "Offer letter", "Policy", "Guidance"].includes(
      contract.documentType,
    )
  )
    return "Medium";
  return "Low";
}

export function SummaryDocumentFilter({
  regulationId,
}: {
  regulationId: RegulationId;
}) {
  const regulation = regulationById(regulationId);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [documentType, setDocumentType] = useState("All document types");
  const [client, setclient] = useState("All companies");
  const [priority, setPriority] = useState("All priorities");
  const [view, setView] = useState<"list" | "graph">("list");
  const [selectedKey, setSelectedKey] = useState("");
  const [savedReviews, setSavedReviews] = useState<
    Record<string, ContractReviewResult>
  >({});
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/contracts", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json()) as { contracts?: Contract[] };
        if (!response.ok) throw new Error();
        const items = body.contracts ?? [];
        setContracts(items);
        const cached = await Promise.all(
          items.map(async (contract) => ({
            key: contract.key,
            review: await readPersistedContractReview(contract.key, regulationId),
          })),
        );
        setSavedReviews(
          Object.fromEntries(
            cached
              .filter((item) => item.review)
              .map((item) => [item.key, item.review!]),
          ),
        );
        setState("ready");
      })
      .catch((error: Error) => {
        if (error.name !== "AbortError") setState("error");
      });
    return () => controller.abort();
  }, [regulationId]);

  const relevant = useMemo(
    () =>
      contracts
        .filter((contract) =>
          contractMatchesRegulation(contract.key, regulationId),
        )
        .map((contract) => {
          const review = savedReviews[contract.key] ?? null;
          return {
            ...contract,
            priority: priorityFor(contract, regulationId, review),
            prioritySource: review
              ? ("AI checked" as const)
              : ("Pre-screened" as const),
          };
        })
        .sort(
          (a, b) =>
            priorityOrder[a.priority] - priorityOrder[b.priority] ||
            a.name.localeCompare(b.name),
        ),
    [contracts, regulationId, savedReviews],
  );
  const typeCounts = useMemo(
    () =>
      new Map(
        DOCUMENT_TYPES.map((type) => [
          type,
          relevant.filter((contract) => contract.documentType === type).length,
        ]),
      ),
    [relevant],
  );
  const priorityCounts = useMemo(
    () =>
      new Map(
        (Object.keys(priorityOrder) as ChangePriority[]).map((item) => [
          item,
          relevant.filter((contract) => contract.priority === item).length,
        ]),
      ),
    [relevant],
  );
  const companies = useMemo(
    () =>
      [...new Set(relevant.map((contract) => contract.client))].sort((a, b) =>
        a === "Unassigned" ? 1 : b === "Unassigned" ? -1 : a.localeCompare(b),
      ),
    [relevant],
  );
  const visible = useMemo(
    () =>
      relevant
        .filter(
          (contract) =>
            documentType === "All document types" ||
            contract.documentType === documentType,
        )
        .filter(
          (contract) =>
            client === "All companies" || contract.client === client,
        )
        .filter(
          (contract) =>
            priority === "All priorities" || contract.priority === priority,
        ),
    [client, documentType, priority, relevant],
  );
  const activeKey = visible.some((contract) => contract.key === selectedKey)
    ? selectedKey
    : (visible[0]?.key ?? "");

  return (
    <section
      className="document-impact-filter"
      aria-labelledby={`${regulationId}-document-filter-title`}
    >
      <div className="document-impact-filter__head">
        <div>
          <span className="eyebrow">
            <SlidersHorizontal size={13} /> Affected-document filter
          </span>
          <h2 id={`${regulationId}-document-filter-title`}>
            Documents by priority, type and client
          </h2>
          <p>
            Focus on files most likely to need clause changes under{" "}
            {regulation.shortName}. AI-checked priorities use the
            official-source clause review; unchecked files are clearly marked as
            pre-screened.
          </p>
        </div>
        <strong>
          {visible.length}
          <small>of {relevant.length} documents</small>
        </strong>
      </div>
      <div className="document-impact-filter__controls">
        <label>
          <span>Document type</span>
          <select
            value={documentType}
            onChange={(event) => setDocumentType(event.target.value)}
          >
            <option>All document types</option>
            {DOCUMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type} ({typeCounts.get(type) ?? 0})
              </option>
            ))}
          </select>
        </label>
        <label>
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
        </label>
        <label>
          <span>Change priority</span>
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
          >
            <option>All priorities</option>
            {(Object.keys(priorityOrder) as ChangePriority[]).map((item) => (
              <option key={item}>
                {item} ({priorityCounts.get(item) ?? 0})
              </option>
            ))}
          </select>
        </label>
        {(documentType !== "All document types" ||
          client !== "All companies" ||
          priority !== "All priorities") && (
          <button
            onClick={() => {
              setDocumentType("All document types");
              setclient("All companies");
              setPriority("All priorities");
            }}
          >
            Clear filters
          </button>
        )}
        <button
          className="document-impact-view-button"
          onClick={() =>
            setView((current) => (current === "list" ? "graph" : "list"))
          }
        >
          {view === "list" ? <Network size={14} /> : <List size={14} />}
          {view === "list" ? "Show graph" : "Back to table"}
        </button>
      </div>
      {state === "ready" && view === "graph" && (
        <SummaryImpactGraph
          regulationId={regulationId}
          contracts={visible}
          reviews={savedReviews}
          selectedKey={activeKey}
          onSelect={setSelectedKey}
        />
      )}
      {view === "list" && (
        <div className="document-impact-filter__list">
          {state === "loading" && (
            <div className="document-filter-message">
              <LoaderCircle className="spin" size={17} />
              Loading R2 documents
            </div>
          )}
          {state === "error" && (
            <div className="document-filter-message">
              The R2 document metadata could not be loaded.
            </div>
          )}
          {state === "ready" &&
            visible.map((contract) => {
              const workbench = contract.editable || contract.convertible;
              const href = workbench
                ? `/contracts/${contract.key.split("/").map(encodeURIComponent).join("/")}?regulation=${regulationId}`
                : contract.downloadUrl;
              return (
                <article key={contract.key}>
                  <span className="document-filter-icon">
                    <FileText size={15} />
                  </span>
                  <div className="document-filter-name">
                    <strong>{contract.name}</strong>
                    <small>{contract.key}</small>
                  </div>
                  <span className="document-filter-client">
                    <Building2 size={12} />
                    {contract.client}
                  </span>
                  <span className="document-filter-type">
                    {contract.documentType}
                  </span>
                  <button
                    className={`document-filter-priority document-filter-priority--${contract.priority.toLowerCase()}`}
                    onClick={() => {
                      setSelectedKey(contract.key);
                      setView("graph");
                    }}
                    title={`Explain why ${contract.name} is ${contract.priority} priority`}
                  >
                    <strong>{contract.priority}</strong>
                    <small>
                      {contract.prioritySource === "AI checked" && (
                        <Sparkles size={10} />
                      )}
                      {contract.prioritySource}
                    </small>
                  </button>
                  <Link href={href} target={workbench ? undefined : "_blank"}>
                    {workbench ? "Review & edit" : "Open source"}
                  </Link>
                </article>
              );
            })}
          {state === "ready" && visible.length === 0 && (
            <div className="document-filter-message">
              No documents match both filters.
            </div>
          )}
        </div>
      )}
      <p className="document-impact-filter__note">
        <strong>Priority meaning:</strong> High = a direct clause match or
        high-confidence AI change; Medium = a relevant file or material AI
        suggestion; Low = no material AI change found or only an indirect
        filename match. Select a priority badge to see its policy dependency
        path.
      </p>
    </section>
  );
}
