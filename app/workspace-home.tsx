"use client";

import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Cloud,
  ExternalLink,
  FilePlus2,
  FileText,
  LoaderCircle,
  Search,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LarpHeader } from "@/components/larp-header";
import {
  WORKSPACE_REGULATIONS,
  contractMatchesRegulation,
  type RegulationId,
} from "@/lib/regulatory-workspace";

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
};

type IntakeRecord = {
  id: string;
  title: string;
  shortName: string;
  legalStatus: string;
  statusAsAt: string;
  summary: string;
  sources: Array<{ url: string }>;
};

export function WorkspaceHome() {
  const [selected, setSelected] = useState<RegulationId>("PDPA2012");
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [query, setQuery] = useState("");
  const [intakeError, setIntakeError] = useState("");
  const [intake, setIntake] = useState<IntakeRecord[]>([]);
  const regulation = WORKSPACE_REGULATIONS.find(
    (item) => item.id === selected,
  )!;

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/contracts", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json()) as { contracts?: Contract[] };
        if (!response.ok) throw new Error("Unable to load contracts");
        setContracts(body.contracts ?? []);
        setState("ready");
      })
      .catch((error: Error) => {
        if (error.name !== "AbortError") setState("error");
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    fetch("/api/regulations/intake", { cache: "no-store" })
      .then((response) => { if (!response.ok) throw new Error("Reviewed team intake is unavailable."); return response.json(); })
      .then((body: { records?: IntakeRecord[] }) =>
        setIntake(body.records ?? []),
      )
      .catch((error: Error) => setIntakeError(error.message));
  }, []);

  const matching = useMemo(
    () =>
      contracts
        .filter((contract) => contractMatchesRegulation(contract.key, selected))
        .filter(
          (contract) =>
            !query ||
            `${contract.name} ${contract.key}`
              .toLowerCase()
              .includes(query.toLowerCase()),
        ),
    [contracts, query, selected],
  );
  const editable = matching.filter((contract) => contract.editable).length;

  return (
    <div className="shell">
      <LarpHeader
        kicker="Regulatory workspace"
        title="Singapore legal operations"
        meta="Shared matter intelligence"
        actions={
          <>
            <Link href="/regulations/new" className="btn btn--outline-light">
              <FilePlus2 size={14} />
              Add law change
            </Link>
            {/* <Link href="/resilience" className="btn btn--outline-light">
              Dependency map
            </Link> */}
          </>
        }
      />
      <main className="workspace">
        <section className="workspace__intro">
          <div>
            <span className="eyebrow">Regulatory portfolio</span>
            <h1>Choose the law, then work from the source contract.</h1>
            <p>
              Every review starts from the original object in R2. Edits stay in
              your browser and download as a separate working copy.
            </p>
          </div>
          <div className="workspace__trust">
            <ShieldCheck size={18} />
            <span>
              <strong>Read-only contract source</strong>R2 originals are never
              overwritten
            </span>
          </div>
        </section>

        <section
          className="regulation-switcher"
          aria-label="Tracked regulations"
        >
          {WORKSPACE_REGULATIONS.map((item, index) => (
            <button
              key={item.id}
              className={`regulation-tile${selected === item.id ? " active" : ""}`}
              onClick={() => setSelected(item.id)}
              aria-pressed={selected === item.id}
            >
              <span className="regulation-tile__top">
                <span className="regulation-tile__code">
                  CASE {String(index + 1).padStart(2, "0")} · {item.shortName}
                </span>
                <span
                  className={`law-state law-state--${item.status.toLowerCase()}`}
                >
                  {item.status}
                </span>
              </span>
              <strong>{item.title}</strong>
              <small>{item.statusDetail}</small>
              <span className="regulation-tile__open">
                Open workspace <ArrowRight size={14} />
              </span>
            </button>
          ))}
        </section>

        <section className="workspace-grid">
          <article className="workspace-law">
            <div className="workspace-law__head">
              <div>
                <span className="eyebrow">Current focus</span>
                <h2>{regulation.title}</h2>
                <p>{regulation.summary}</p>
              </div>
              <a
                href={regulation.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn--gold-outline"
              >
                Official text <ExternalLink size={14} />
              </a>
            </div>
            <div className="obligation-list">
              {regulation.obligations.map((obligation) => (
                <div className="obligation-line" key={obligation.ref}>
                  <span>{obligation.ref}</span>
                  <div>
                    <strong>{obligation.title}</strong>
                    <small>{obligation.detail}</small>
                  </div>
                  <em>{obligation.state}</em>
                </div>
              ))}
            </div>
            <div className="workspace-law__actions">
              <Link href={regulation.detailUrl} className="btn btn--navy">
                <BookOpen size={15} />
                View regulation analysis
              </Link>
              <Link href={regulation.contractQuery} className="btn btn--gold">
                Review affected contracts <ArrowRight size={15} />
              </Link>
            </div>
          </article>

          <aside className="contract-snapshot">
            <div className="contract-snapshot__head">
              <div>
                <span className="eyebrow">
                  <Cloud size={12} /> Live R2 library
                </span>
                <h2>Affected contracts</h2>
              </div>
              {state === "ready" && (
                <span>
                  {matching.length} found · {editable} editable
                </span>
              )}
            </div>
            <label className="workspace-search">
              <Search size={15} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search contract names"
              />
            </label>
            <div className="contract-snapshot__list">
              {state === "loading" && (
                <div className="workspace-empty">
                  <LoaderCircle className="spin" size={18} />
                  Loading contracts from R2
                </div>
              )}
              {state === "error" && (
                <div className="workspace-empty">
                  The R2 contract library could not be loaded.
                </div>
              )}
              {state === "ready" &&
                matching.slice(0, 6).map((contract) => (
                  <Link
                    key={contract.key}
                    href={
                      contract.editable || contract.convertible
                        ? `/contracts/${contract.key.split("/").map(encodeURIComponent).join("/")}?regulation=${selected}`
                        : contract.downloadUrl
                    }
                    target={
                      contract.editable || contract.convertible
                        ? undefined
                        : "_blank"
                    }
                    className="contract-snapshot__row"
                  >
                    <span className="file-glyph">
                      <FileText size={15} />
                    </span>
                    <span>
                      <strong>{contract.name}</strong>
                      <small>
                        {contract.format.toUpperCase()} ·{" "}
                        {(contract.size / 1024).toFixed(0)} KB
                      </small>
                    </span>
                    <em>
                      {contract.editable
                        ? "Review & edit"
                        : contract.convertible
                          ? "Convert PDF"
                          : "View original"}
                    </em>
                  </Link>
                ))}
              {state === "ready" && matching.length === 0 && (
                <div className="workspace-empty">
                  No contracts match this regulation and search.
                </div>
              )}
            </div>
            <Link
              href={regulation.contractQuery}
              className="contract-snapshot__all"
            >
              Open all matching contracts <ArrowRight size={14} />
            </Link>
            <p className="contract-snapshot__note">
              <CheckCircle2 size={13} />
              DOCX files edit directly. PDFs become text-first Word working
              copies; legacy `.doc` files remain source-only.
            </p>
          </aside>
        </section>

        <section className="intake-lane">
          <div>
            <span className="eyebrow">Reviewed team intake</span>
            <h2>Additional law changes</h2>
            <p>
              AI research appears here only after a lawyer confirms the
              official-source draft.
            </p>
          </div>
          <div className="intake-lane__records">
            {intakeError && <p role="alert">{intakeError}</p>}
            {intake.slice(0, 3).map((record) => (
              <article key={record.id}>
                <span>{record.shortName}</span>
                <div>
                  <strong>{record.title}</strong>
                  <small>
                    {record.legalStatus} · position as at {record.statusAsAt} ·{" "}
                    {record.sources.length} official source
                    {record.sources.length === 1 ? "" : "s"}
                  </small>
                </div>
              </article>
            ))}
            {!intakeError && intake.length === 0 && (
              <p>No additional changes have been confirmed.</p>
            )}
          </div>
          <Link href="/regulations/new" className="btn btn--navy">
            <FilePlus2 size={15} />
            Research a law change
          </Link>
        </section>
      </main>
    </div>
  );
}
