"use client";

import { FileText, Network, Scale, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  WORKSPACE_REGULATIONS,
  type RegulationId,
} from "@/lib/regulatory-workspace";

export type GraphContract = {
  key: string;
  name: string;
  format?: string;
  size?: number;
  downloadUrl: string;
  client?: string;
  documentType?: string;
  priority?: "Unreviewed" | "Critical" | "High" | "Medium" | "Low";
  prioritySource?: "AI checked" | "Pre-screened";
};

type ContractFamily = {
  id: string;
  label: string;
  description: string;
  pattern: RegExp;
};

const families: ContractFamily[] = [
  {
    id: "employment",
    label: "Employment & people",
    description: "Offers, internships and workforce terms",
    pattern:
      /employment|employee|offer|intern|staff|workplace|human resource|\bhr\b/i,
  },
  {
    id: "privacy",
    label: "Privacy & confidentiality",
    description: "Data, security and confidentiality terms",
    pattern:
      /privacy|personal data|data protection|processing|security|confidential|\bnda\b/i,
  },
  {
    id: "investment",
    label: "Investment & fundraising",
    description: "VIMA, subscription and financing documents",
    pattern:
      /vima|investment|subscription|shareholder|convertible|safe note|financ/i,
  },
  {
    id: "commercial",
    label: "Commercial agreements",
    description: "Master, services, vendor and supply terms",
    pattern:
      /master|service|vendor|supplier|supply|customer|licen[cs]e|agreement/i,
  },
  {
    id: "other",
    label: "Corporate & other",
    description: "Remaining records requiring legal classification",
    pattern: /.*/i,
  },
];

function familyFor(contract: GraphContract) {
  const value = decodeURIComponent(`${contract.key} ${contract.name}`);
  return (
    families.find((family) => family.pattern.test(value)) ??
    families[families.length - 1]
  );
}

function relevanceLabel(regulationId: RegulationId, familyId: string) {
  if (regulationId === "WFA2025")
    return familyId === "employment" ? "Priority screen" : "Confirm relevance";
  return familyId === "privacy" ? "Priority screen" : "PDPA screen";
}

export function TopDownContractGraph({
  contracts,
  traceActive = false,
  onTraceChange,
  initialRegulationId = "PDPA2012",
  selectedKey,
  onDocumentSelect,
  showRegulationSwitcher = true,
}: {
  contracts: GraphContract[];
  traceActive?: boolean;
  onTraceChange?: (active: boolean) => void;
  initialRegulationId?: RegulationId;
  selectedKey?: string;
  onDocumentSelect?: (key: string) => void;
  showRegulationSwitcher?: boolean;
}) {
  const [regulationId, setRegulationId] =
    useState<RegulationId>(initialRegulationId);
  const [localTraceActive, setLocalTraceActive] = useState(false);
  const tracing = onTraceChange ? traceActive : localTraceActive;
  const changeTrace = onTraceChange ?? setLocalTraceActive;
  const regulation = WORKSPACE_REGULATIONS.find(
    (item) => item.id === regulationId,
  )!;
  const groups = useMemo(
    () =>
      families.map((family) => ({
        ...family,
        contracts: contracts.filter(
          (contract) => familyFor(contract).id === family.id,
        ),
      })),
    [contracts],
  );

  return (
    <div
      className={`td-graph${tracing ? " is-tracing" : ""}`}
      aria-label="Top-down contract dependency graph"
    >
      <div className="td-graph__toolbar">
        {showRegulationSwitcher && <div className="td-graph__controls" aria-label="Choose regulation">
          {WORKSPACE_REGULATIONS.map((item) => (
            <button
              key={item.id}
              onClick={() => setRegulationId(item.id)}
              className={regulationId === item.id ? "active" : ""}
              aria-pressed={regulationId === item.id}
            >
              <span>{item.shortName}</span>
              {item.title}
            </button>
          ))}
        </div>}
        <button
          className={`td-graph__trace ${tracing ? "active" : ""}`}
          onClick={() => changeTrace(!tracing)}
          aria-pressed={tracing}
        >
          {tracing ? <X size={15} /> : <Network size={15} />}
          {tracing ? "Clear amendment trace" : "Trace amendment"}
        </button>
      </div>

      <div className="td-graph__root">
        <span>
          <Scale size={18} />
        </span>
        <div>
          <small>
            {tracing
              ? "Amendment source · tracing active"
              : `${regulation.status} regulation · Singapore`}
          </small>
          <strong>{regulation.title}</strong>
        </div>
      </div>
      <div className="td-graph__trunk" aria-hidden="true" />

      <div className="td-graph__scroll">
        <div
          className="td-graph__branches"
          style={{ "--branch-count": groups.length } as React.CSSProperties}
        >
          {groups.map((group) => {
            const direct =
              regulationId === "WFA2025"
                ? group.id === "employment"
                : group.id === "privacy";
            return (
              <section
                className={`td-branch ${direct ? "is-direct" : "is-screen"}`}
                key={group.id}
              >
                <div className="td-branch__line" aria-hidden="true" />
                <div className="td-branch__category">
                  <span>
                    <ShieldCheck size={15} />
                  </span>
                  <div>
                    <strong>{group.label}</strong>
                    <small>{group.description}</small>
                  </div>
                  <em>{group.contracts.length}</em>
                </div>
                {tracing && (
                  <div className="td-branch__trace-label">
                    {direct
                      ? "Direct amendment path"
                      : "Secondary screening path"}
                  </div>
                )}
                <div className="td-branch__documents">
                  {group.contracts.map((contract) => {
                    const format = (
                      contract.format ?? contract.key.split(".").pop()
                    )?.toLowerCase();
                    const workbench = format === "docx" || format === "pdf";
                    const href = workbench
                      ? `/contracts/${contract.key.split("/").map(encodeURIComponent).join("/")}?regulation=${regulationId}`
                      : contract.downloadUrl;
                    const contents = <>
                        <FileText size={14} />
                        <span>
                          <strong>{contract.name}</strong>
                          <small>
                            {contract.documentType ??
                              (contract.format ?? "file").toUpperCase()}{" "}
                            · {contract.client ?? "Unassigned"} ·{" "}
                            {contract.prioritySource ?? relevanceLabel(regulationId, group.id)}
                          </small>
                        </span>
                        {contract.priority && <b className={`is-${contract.priority.toLowerCase()}`}>{contract.priority}</b>}
                      </>;
                    return onDocumentSelect ? (
                      <button
                        type="button"
                        className={`td-document${selectedKey === contract.key ? " is-selected" : ""}`}
                        onClick={() => onDocumentSelect(contract.key)}
                        key={contract.key}
                        title={`Explain ${contract.name}`}
                      >
                        {contents}
                      </button>
                    ) : (
                      <Link
                        className="td-document"
                        href={href}
                        target={workbench ? undefined : "_blank"}
                        key={contract.key}
                        title={contract.name}
                      >
                        {contents}
                      </Link>
                    );
                  })}
                  {group.contracts.length === 0 && (
                    <div className="td-branch__empty">
                      No contracts in this family
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
      <p className="td-graph__note" aria-live="polite">
        {tracing
          ? `Showing the ${regulation.shortName} amendment path from official source to contract families. Gold marks the highest-priority filename match; every other file remains in the secondary screening path.`
          : "Automatic filename screening only. Open a contract to confirm its legal obligations; R2 originals remain unchanged."}
      </p>
    </div>
  );
}
