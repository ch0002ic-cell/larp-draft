# L.A.R.P. — Localised Amendment Resilience Platform

**L.A.R.P. helps law firms maintain the legal assumptions embedded in their own work as the law changes.** Its intended workflow identifies affected materials, explains the dependency and consequence, and carries lawyer-approved updates through the materials and processes that rely on them.

Team L.A.R.P. achieved **Top 2 under Rajah & Tann Asia’s problem statement at SMU LIT Hackathon 2026**, as reported by the team. This is a track-specific achievement; it does not imply an overall competition placing, commercial partnership or sponsor endorsement. The platform is now moving from a hackathon proof of concept toward a validated product.

**Document status:** consolidated research and development plan, **6 September 2026**, for the team, prospective legal reviewers and engineering contributors. Implementation statements below come from this checkout; recommendations are proposed work, not delivered capabilities. Legal and vendor information is a dated research snapshot.

[Project submission](https://devpost.com/software/l-a-r-p-oc08f9) · [Team-reported prototype address](https://larp-lit.vercel.app/). Neither the submission’s contents nor the deployment’s current availability was independently verified during this review.

## Contents

- [Purpose and problem-statement alignment](#purpose-and-problem-statement-alignment)
- [Research findings and product position](#research-findings-and-product-position)
- [Singapore legal scenarios and evidence boundaries](#singapore-legal-scenarios-and-evidence-boundaries)
- [Current implementation](#current-implementation)
- [Resilience foundation](#resilience-foundation)
- [Proposed product and architecture](#proposed-product-and-architecture)
- [Confidentiality, reliability and sustainable operation](#confidentiality-reliability-and-sustainable-operation)
- [Validation and delivery plan](#validation-and-delivery-plan)
- [Run and configure the prototype](#run-and-configure-the-prototype)
- [Routes, APIs and storage](#routes-apis-and-storage)
- [Research corpus and historical assets](#research-corpus-and-historical-assets)
- [Engineering and documentation conventions](#engineering-and-documentation-conventions)
- [Research method and remaining uncertainties](#research-method-and-remaining-uncertainties)

## Purpose and problem-statement alignment

The challenge is recorded in the team’s materials as **“Designing a Sustainable and Resilient LegalTech.”** The central failure L.A.R.P. addresses is that a firm can know a rule changed while continuing to reuse a checklist, precedent, advisory or workflow that assumes the old rule. Legal knowledge is distributed through both explicit instructions and repeated drafting habits; an alert does not by itself update that institutional work.

The repository’s detailed challenge account identifies three required outcomes: **identify which existing artefacts are affected; understand how they are affected; propagate necessary updates before harm.** The team’s subsequent recap adds operational resilience, resource sustainability, sustainable legal work and ethical technology governance. These are complementary design constraints around L.A.R.P.’s central workflow, rather than separate products.

The original organiser-issued challenge document was not independently retrieved. This alignment is based on the team’s supplied account and repository history, not a purported verbatim quotation or verified judging rubric. SMU’s own [LIT Club profile](https://law.smu.edu.sg/student-activities/student-clubs/smu-legal-innovation-and-technology-lit) confirms the club’s legal-technology education and adoption mission; it does not establish the detailed 2026 track requirements.

| Challenge outcome | L.A.R.P.’s intended response | Evidence that would demonstrate success |
| --- | --- | --- |
| Identify affected work | Discover explicit citations and implicit dependencies in permitted firm materials; retain reviewed relationships. | An independently annotated corpus shows affected artefacts and spans found, missed items and unprocessed material. |
| Explain the effect | Compare source versions, test applicability and distinguish substantive conflict, incomplete evidence, obsolete references and future readiness. | Each finding connects a source provision, an artefact span, relevant facts and an explainable proposed action. |
| Propagate updates | Coordinate changes across templates, drafts, checklists, playbooks, advisories, training and automated controls, with owners and approvals. | A completed change set records reviewed revisions, publication acknowledgements, outstanding dependencies and rollback evidence. |
| Remain operationally resilient | Preserve work during source, model or network outages and recover without losing decisions. | Recovery exercises, visible source freshness and resumable jobs. |
| Use resources sustainably | Reuse extraction and validated dependencies; re-evaluate affected work while periodically checking for missed relationships. | Measured processing, storage and cost per completed update; energy measurements where available. |
| Support sustainable legal work | Reduce repeated searching and re-review while retaining accountable legal judgment. | Measured review burden, queue age, interruption load and reviewer feedback. |
| Govern technology responsibly | Enforce access boundaries, provenance, uncertainty and human approval. | Permission tests and a reconstructable record of the evidence, model activity and reviewer decision. |

The initial product should serve a **Singapore law firm’s knowledge or practice team maintaining its own precedents and operational materials**, beginning with a bounded data-protection workflow. The economic buyer may be a knowledge, risk, innovation or practice partner; this is a customer hypothesis to test. Employment materials provide adjacent examples, but the product should not become a general HR-compliance checker.

## Research findings and product position

The strongest direction is a **reviewed dependency ledger**: a durable record of which legal assumptions an artefact relies on, what evidence supports that relationship, and which downstream work must be revisited when a source or fact changes. The advantage to prove is better institutional maintenance with measurable coverage and less repeated work.

The competitive field already includes overlapping capabilities. The following are first-party descriptions accessed on 6 September 2026, not independent product tests or assurances about availability in a particular subscription.

| Alternative | Supported public positioning | Consequence for L.A.R.P. |
| --- | --- | --- |
| Icertis | Its undated [agentic contract-management overview](https://www.icertis.com/learn/agentic-ai-contract-management/) describes regulatory-change portfolio scans, amendment proposals and tracking counterparty acceptance. | The broad change-to-contract-remediation workflow cannot support a uniqueness claim. |
| CUBE | Its undated [RegPlatform overview](https://www.cube.global/products/regplatform) describes obligations, mapped controls and traceability; [RegMap](https://www.cube.global/products/regplatform/regmap) describes taxonomy mappings that apply to incoming content. | Mapping and ongoing regulatory workflows are established competitive capabilities, not an empty market. |
| Harvey | Undated [Vault](https://www.harvey.ai/platform/vault) and [Spaces](https://www.harvey.ai/platform/spaces) pages describe retained collections, firm knowledge and governed collaboration, including mapping requirements to policies and routing revisions. | Persistent material, legal-firm use and approval workflows are relevant comparison points. |
| Legora | Its undated [Monitors](https://legora.com/product/monitors) and [Workflows](https://legora.com/product/workflows) pages describe regulatory monitoring, impact assessment, ownership, audit trails and workflows using firm standards. | Compare against an integrated legal workflow, not only a generic chatbot. |
| Existing Singapore legal research | [SAL’s technology portfolio](https://sal.org.sg/technology/) includes LawNet AI. | Consider licensed research and document-system integration; Singapore localisation alone is insufficient differentiation. |
| The firm’s existing process | A lawyer, research subscriptions, document search and an ownership spreadsheet form a credible baseline. | A pilot must show improvement over what the firm already uses, including setup and verification effort. |

CUBE’s [announcement of 2 January 2025](https://cube.global/resources/news/cube-completes-acquisition-of-thomson-reuters-regulatory-intelligence-and-oden-businesses) records completion of its acquisition of Thomson Reuters Regulatory Intelligence and Oden on 31 December 2024. That business should not be counted separately as an independent current Thomson Reuters regulatory-intelligence competitor.

**Differentiation to validate:** recover previously undeclared assumptions across more than contracts, retain reviewer-confirmed evidence at version and span level, and coordinate the complete maintenance task inside a firm’s existing permissions and publication workflow. Useful assets could include evaluated legal assertion packs, reliable source adapters, reviewed dependency histories and deployment expertise. A graph visualisation or database table alone is not a defensible advantage.

Public documentation cannot establish that competitors lack an undocumented feature. Earlier assertions that nobody serves law firms, nobody retains mappings, all mappings are entered manually, or the second amendment becomes nearly free are excluded. Vendor pricing, savings, market size and willingness to pay remain unvalidated; no historical price quotes are used for budgeting.

## Singapore legal scenarios and evidence boundaries

These scenarios guide product design and evaluation. They do not decide whether a named employer, client or particular agreement complies with the law. Distinguish the legislation’s legal status from the confidence and completeness of L.A.R.P.’s assessment.

### Source hierarchy and lifecycle

Singapore Statutes Online (SSO), maintained by AGC, supplies useful consolidated text, historical versions and amendment feeds. Its consolidation is **unofficial**; the published Government Gazette is the authoritative text. Automated extraction is permitted only between **03:00 and 07:00 Singapore time**, subject to the other usage conditions. Reproduction requires the applicable acknowledgement, accuracy responsibilities and non-endorsement treatment. Source: [SSO FAQs, A3 and B1](https://sso.agc.gov.sg/FAQ), accessed 6 September 2026; [SSO Terms of Use](https://sso.agc.gov.sg/Terms-of-Use).

A production change record needs separate dates for publication, passage, assent, commencement, transition deadlines, retrieval and review. A Bill, consultation or announced implementation target is not an operative duty. Commencement may differ by provision. Capture the retrieved source and its hash, and validate the content’s effective version; a date in a URL is not sufficient evidence that the correct historical text was returned.

Guidance, circulars and model clauses also matter. Preserve publisher, title, retrieved version, date and content hash, even without a formal version number. A source diff identifies something to assess; it does not itself prove a client artefact is legally defective. Conversely, legal applicability can change when business facts change without any source-text amendment.

### Scenario set

| Scenario | Verified position or bounded evidence | Product use and necessary qualification |
| --- | --- | --- |
| PDPA reform baseline | PDPC’s [29 January 2021 commencement announcement](https://www.pdpc.gov.sg/news-and-events/announcements/2021/01/amendments-to-the-personal-data-protection-act-take-effect-from-1-february-2021) describes phased implementation beginning 1 February 2021. Financial-penalty amendments commenced separately on 1 October 2022 under [S 767/2022](https://sso.agc.gov.sg/SL-Supp/S767-2022/Published/20220930). | Use a historical replay to test long-lived assumptions. Do not describe the 2020 reform package as a newly enacted 2026 amendment. Section 24 of the amending Act is distinct from section 24 of the principal PDPA. |
| Breach assessment and escalation | [PDPA section 26D](https://sso.agc.gov.sg/Act/PDPA2012?ProvIds=pr26D-) requires notifying PDPC as soon as practicable, no later than three calendar days after the day of the assessment that the breach is notifiable. [Notification Regulations 2021, regulation 4](https://sso.agc.gov.sg/SL/PDPA2012-S64-2021) sets the significant-scale threshold at 500 affected individuals. | Trace a processor term into the incident checklist, escalation owner and training. The statutory clock is not universally 72 hours from discovery. Individual-notification duties and exceptions require their own assessment. A 24-hour contractual escalation period is a drafting choice, not this statutory deadline. |
| Employment purpose notification | PDPC’s [Selected Topics guidelines, revised May 2024, paragraphs 6.19–6.20](https://www.pdpc.gov.sg/-/media/files/pdpc/pdf-files/advisory-guidelines/ag-on-selected-topics/advisory-guidelines-on-the-pdpa-for-selected-topics-%28revised-may-2024%29.pdf) explain reasonable employment-related processing without consent and the notification obligation; notification can use contracts, handbooks or intranet notices. | A consent clause or absence of a purpose list in one contract is not enough to establish a breach. Retrieve the referenced notice and relevant facts. Record missing evidence when a linked handbook is unavailable. |
| Transfer certifications in 2026 | [Personal Data Protection (Amendment) Regulations 2026, S 86/2026](https://sso.agc.gov.sg/SL-Supp/S86-2026/Published/20260227), published 27 February and effective 2 March 2026, expands recognised certification systems in regulation 12. [IMDA’s Global CBPR page](https://www.imda.gov.sg/how-we-can-help/globalcbpr), updated 7 May 2026, confirms recognition for overseas transfers. | This is subsidiary legislation amending the 2021 Regulations. Inspect whether a transfer assessment or playbook relies on a certification route. An additional permitted route does not require every existing contract to adopt it. This is a historical example, not a claim that it is the latest PDPA-related change. |
| NRIC authentication | PDPC’s [2 February 2026 announcement](https://www.pdpc.gov.sg/media-events/pdpc-to-step-up-enforcement-action-against-misuse-of-nric-numbers-and-issues-new-advisory-on-data-protection) calls for phasing out full or partial NRIC authentication by 31 December 2026, with stepped-up enforcement from 1 January 2027, including default passwords for digital documents. | A strong non-contract scenario: trace an onboarding instruction into the document-password process and training. Treat the deadline as announced guidance/enforcement policy, not an invented commencement of a new Act. |
| NRIC masking distinction | MDDI’s [responsible-use explanation](https://www.mddi.gov.sg/newsroom/responsible-use-of-nric-numbers-across-public-and-private-sectors/), February 2026, distinguishes identification and authentication. | Do not infer a general prohibition on masking or recommend unmasking personal records from the authentication change. |
| Workplace fairness readiness | MOM’s [4 November 2025 second-reading speech, paragraph 27](https://www.mom.gov.sg/newsroom/speeches/2025/1104-second-reading-of-workplace-fairness-dispute-resolution-bill) targets implementation at end-2027, subject to readiness and adjustment. | Model an uncommenced-law readiness scenario, conditional on scope and later commencement instruments. Prepare recruitment, grievance and training materials without labelling the future duties already operative. The target is not a guaranteed commencement date. |
| Provision-specific negative control | [Statutes (Miscellaneous Amendments) Act 2025](https://sso.agc.gov.sg/Acts-Supp/19-2025/Published/20251128), published 28 November and commenced 5 December 2025, includes Employment Act deduction changes. Repository research also proposes its PDPA schedule amendment as a contrasting no-impact case. | Have a lawyer validate the precise enacted provisions and selected corpus before using the pair. A dynamic statutory reference may already accommodate a change; do not assume every salary clause needs amendment or claim a measured zero-impact result. |

SSO also lists **S 580/2026, Personal Data Protection (Amendment No. 2) Regulations 2026**, under 31 August 2026 in its [2026 supplement index](https://sso.agc.gov.sg/Browse/sl-supp/published/2026?PageSize=20&SortBy=number&SortOrder=DESC). Its operative text and commencement were not successfully retrieved. Verify them before adding obligations to the catalogue; the March certification scenario cannot stand in for complete 2026 coverage.

### Model clauses, stale citations and missing context

PDPC’s **Guide on Data Protection Clauses for Agreements Relating to the Processing of Personal Data**, dated 1 February 2021, concerns adaptable customer–contractor service-agreement clauses. Its [official PDF](https://www.pdpc.gov.sg/-/media/files/pdpc/pdf-files/resource-for-organisation/guide-on-data-protection-clauses-for-agreements-relating-to-the-processing-of-personal-data-1-feb-2021.pdf) is an input to drafting, not a universal statutory checklist for employment agreements.

The useful subject map from the guide is: permitted processing (2.1–2.2), overseas transfer (2.3), security and personnel access (2.4), access assistance (2.5), accuracy/correction (2.6), retention and return/deletion (2.7), breach escalation (2.8), and indemnity allocation (2.9). These are candidate assertion topics; their wording and applicability require legal review. A sample indemnity is not a mandatory statutory term, and an employee is not automatically the contractor/data intermediary in this service-agreement model.

Earlier repository research reported references in the 2021 guide to the revoked 2014 Regulations and Roman-numbered PDPA Parts. The current 2021 PDF’s full contents and any subsequent replacement were not successfully re-fetched because of access controls. Treat the precise stale-reference claim as **pending re-verification**, not a current accusation about PDPC’s publication. Old Part numbering can flag citation maintenance, but neither proves the document’s drafting date nor makes its substantive terms invalid. Similar wording also does not prove a contract was copied from this guide.

Preserve the guide’s licensing distinction recorded in the source notes: sample clauses and explanatory material have different reproduction treatment. Link to the official publication and check its current notice before redistribution; the original PDF is not included here.

Other historical detection ideas—retirement ages, CPF ceilings and rates, flexible-work procedures, pass conditions, copyright references and intern coverage—are outside the initial assertion pack until primary evidence, relevant dates and applicability are reviewed. Confidentiality surviving indefinitely is not the same as retaining personal data indefinitely. A missing contractual DPO name, destination-country list or grievance procedure is not by itself proof that the organisation lacks the required arrangement elsewhere. Data-portability readiness must likewise be tied to verified commencement and implementing rules before it is presented as an operative obligation.

## Current implementation

This is a **cloud-connected prototype with a mixture of functioning integrations and demonstrations**. The following audit describes source code, not a live deployment test or legal validation of generated results.

| Area | Implemented behaviour | Material boundary |
| --- | --- | --- |
| Application | Next.js 16.2.4 App Router, React 19.2.4, Tailwind 4, TypeScript; Bun scripts. | No automated test script is declared in `package.json`. |
| Regulatory workspace | PDPA and WFA views, lifecycle displays, catalogue UI, editable internal overlays and research intake. | The two workspaces use checked-in content. Saved research intake does not create a new end-to-end contract-review jurisdiction or regulation engine. |
| Catalogue sync | Administrator-triggered SSO category scraping, cached in R2; attempts two PDPA text snapshots. | This is not an implemented continuous provision-level RSS dependency engine. Other records receive no detailed version history. Reads replace cached PDPA/WFA entries with code seeds, so those records can remain stale. |
| Contracts | R2 listing, optional manifest, source streaming and filtering by document/client metadata. | PDPA matching admits all keys; WFA matching uses filename keywords. Defaults such as “Data Breach Notification” are metadata assumptions, not extracted legal findings. |
| Hosted AI review | PDF/DOCX review through the OpenAI Responses API, official-domain web search, structured suggestions and source URLs. | Default opening window: 80 paragraphs; DOCX extraction caps at 1,200 non-empty paragraphs and submitted text at 180,000 characters. At most 20 suggestions survive post-processing. No corpus-wide recall or completeness evidence. |
| PDF data handling | Sends the complete PDF as an API input file; asks the model for an opening-paragraph review. Opening the PDF workbench can start review automatically when no browser cache exists. | The paragraph limit limits requested analysis, **not file disclosure**. Displayed paragraph totals can describe returned extraction rather than the complete PDF. |
| DOCX working copy | Browser reads `word/document.xml`, applies paragraph replacements and appended insertions, and downloads a new package. | No native Word tracked revisions. Replacing a paragraph collapses text into its first text run; mixed formatting and complex structures need checking. Other Word parts are not comprehensively analysed. |
| PDF working copy | Produces a new DOCX from the model-returned paragraphs and accepted edits. | It may be incomplete and does not preserve exact layout, tables, signatures, images or pagination. It is not a faithful conversion or executed instrument. |
| Persistence | Server AI-review cache in R2; browser Cache Storage for review results; `sessionStorage` for the legacy fixture reviewer. | Server validation uses document fingerprint and a manual cache version, not every legal/prompt/model change. Browser results lack document-version invalidation. Current working edits and review timer are React state, not a durable shared record. |
| Human review and time | Accept/skip/edit UI, an approval timestamp and a session timer; legacy fixture signing and download flow. | These are not authenticated legal approvals, electronic-signature assurance or a billable-time ledger. The timer can include waiting time. |
| Similar clauses | Interactive filters, directories, match percentages and a queue count. | `app/contracts/find-similar-clauses.tsx` explicitly uses fixed fixtures. It neither searches the real corpus nor propagates the edit. |
| Graph and fixtures | Dependency visualisations, manifest relationships, five PDPA obligation groups and eleven legacy document fixtures. | Relationships are demonstration/authored data, not proof of automated edge discovery or a complete reviewed ledger. |
| Source preservation | No API writes back to original contract objects. | Separate review caches and internal regulatory records do write to R2. Downloading a changed working copy is not publication to a firm system or agreement to vary a contract. |
| Access and evidence | Server-only credentials, key-prefix checks, sync bearer secret and source-host filters. | No application-level user/matter authorisation was found in the API handlers. Host filtering does not verify source entailment, and substituting a fallback URL does not ground an unsupported claim. |

Primary code evidence: [contract review endpoint](app/api/contracts/review/route.ts), [similar-clause UI](app/contracts/find-similar-clauses.tsx), [regulation matching](lib/regulatory-workspace.ts), [catalogue state](lib/singapore-regulations.ts), [DOCX edits](lib/docx-working-copy.ts), [PDF workbench](app/contracts/pdf-contract-workbench.tsx), [server cache](lib/contract-review-server-cache.ts), [browser cache](lib/contract-review-cache.ts), [session timer](app/contracts/use-review-session.ts), [legacy review provider](lib/review/provider.tsx).

The original whiteboard’s local database/local AI and the submission’s semantic-search narrative describe intent. They are not supported deployment claims for this checkout. A browser-side editing step does not make the storage, inference or entire platform local.

## Resilience foundation

**Implemented in `larp-Ric`, 6 September 2026.** The additive [ledger](resilience-core/ledger.mjs) and its services remain separate from the preserved Next.js app: no existing routes, components, app dependencies or runtime configuration were changed. The local domain core uses Node built-ins and SQLite. The isolated module pins its JWT, PDF, ZIP and XML dependencies separately from the app. Microsoft adapters make Entra/Graph/SharePoint requests only when explicitly invoked with configuration and credentials; document parsing and deterministic discovery require no hosted model.

The implemented maintenance cycle pins source, assertion and artefact versions; discovers candidate dependencies; records scoped legal assessments; requires legal and owner approval for proposed text revisions; persists publication jobs and receipts; and supports reconciliation and separately approved rollback. Records and audit events commit atomically. Optimistic versions prevent conflicting local writes, while remote publication carries the expected target version and verifies retrieved content afterwards. These are prototype capabilities, not a completed production pilot.

### Run and verify

Use **Node 22.16 or later** with `node:sqlite`; development validation uses **22.23.2**. Install only the isolated module's dependencies:

```bash
npm ci --prefix resilience-core --ignore-scripts
npm test --prefix resilience-core
npm run demo --prefix resilience-core
npm run evaluate --prefix resilience-core
npm run evaluate --prefix resilience-core -- --mode hybrid
npm run demo:formats --prefix resilience-core
```

The [workflow demo](resilience-core/workflow-demo.mjs) creates fresh temporary ledger and destination databases. It exercises a synthetic source change across a template, checklist and playbook; candidate discovery; manual assessment; legal/owner approval; partial publication; a lost acknowledgement; restart/reconciliation; and backup/restore. It preserves the original versions. Printed timing, CPU and file-size measurements describe that run only; they are not pilot latency, total storage, energy or human-effort measurements. No network or model calls occur in this demo.

The earlier [evidence demo](resilience-core/demo.mjs) remains available with `node resilience-core/demo.mjs [new-database-path]`. It shows extraction gaps, approval invalidation and the distinct executed-agreement review route. Both demos use synthetic identities and rules, not Singapore law or client documents.

Validation: **80 tests pass**, covering evidence and scope, session/permission checks, ingestion gaps, discovery limits, signed-token validation, Microsoft error/redirect handling, cached-access revocation, coordinated approvals, interrupted publication, concurrent edits, bounded retries, rollback/restore, PDF/DOCX extraction, parser limits and citation/proximity retrieval. The isolated dependency audit reported zero known vulnerabilities on 6 September 2026; that is not a security certification. [CI](.github/workflows/resilience-core.yml) runs the tests, workflow demo and evaluation on pushes affecting the module. App lint/build were not run because the existing app and its dependencies were unchanged and its `node_modules`/Bun environment is absent.

### Domain API and review boundaries

| Operation | Implemented contract |
| --- | --- |
| `addSource`, `addArtefact`, `ingestText` | Append immutable versions with expected-version checks. Text ingestion preserves exact UTF-8, hashes original bytes, and records unsupported, invalid or oversized input as a visible extraction failure. |
| `ingestDocument` (service) | Extract plain text, PDF or DOCX in the generic service, rechecking identity and permissions after asynchronous parsing. Microsoft uses its verified SharePoint import path. |
| `addAssertion` | A reviewer records interpretation, applicability, exceptions and an exact source span. This is an attributed human decision, not automated verification that the interpretation is legally correct. |
| `discover`, `discoverLiteralCandidates` | Search current permitted artefacts using phrase or deterministic hybrid mode, or perform the original literal baseline. Candidates retain exact evidence; result/workload caps, unavailable segments and incomplete inventories are reported. No hit is not clearance. |
| `proposeDependency`, `reviewDependency` | Keep candidates separate from confirmed relationships. Invalid evidence stays blocked; corrections create a new version requiring review. |
| `proposeAssessment`, `reviewAssessment`, `getAssessment` | Store a manual finding for one assertion/segment, evidence, applicability, severity, limitations and current-review/readiness mode. Review revision conflicts are rejected; changed evidence invalidates current approval without erasing history. |
| `coverage`, `planSourceChange` | Report extraction and assertion-scoped findings, or compute tasks from confirmed known dependencies. Plans always require additional discovery; neither operation proves whole-document coverage. |
| `proposeChangeSet`, `getChangeSet` | Group up to 50 anchored text revisions within one matter. Require current approved actionable assessments, complete context, explicit owners, pinned target hashes/versions and a future review expiry. |
| `reviewChangeSet`, `reviewOwnership` | Record legal approval and an independent decision by each artefact's recorded owner. One person may hold both roles; the two decisions remain explicit. Roles and access are rechecked when work executes. |
| `audit`, `cacheIdentity` | Return scoped audit events or compute evidence/processing/ACL-sensitive cache identities. Global database sequence counts are not exposed by audit/decision views; no cached-result store is implemented. |

The [generic service boundary](resilience-core/service.mjs) exposes `createLedgerService({ ledger, verifySession, resolveAccess })` and `execute(credential, operation, ...args)`. Trusted startup adapters supply verified `{ subject, tenantId, expiresAt }` and current `{ active, subject, tenantId, userId, roles, matterIds, aclVersion }`; expiry uses Unix milliseconds. The permission adapter additionally receives `{ credential }` for delegated exchange. Request payloads cannot override the actor. Inputs are copied before asynchronous checks, and expired sessions, malformed scope, mismatched identities or provider failures deny access. The ledger and worker-only operations must remain private to the backend.

A no-impact assessment requires a complete supplied extraction inventory, available segments, explicitly complete context and no unresolved limitations. These checks cannot establish that an omitted attachment was never present. Approved `insufficient_evidence` findings acknowledge a gap; they do not clear it. Proposal/uncommenced sources require readiness assessments and cannot enter the current-remediation publication queue. Snapshot currency is the latest stored version, not a legal commencement or applicability calculation.

### Rich-document extraction and broader discovery

[Document extraction](resilience-core/document-extraction.mjs) retains the original byte hash, parser version and immutable extracted text. PDF evidence offsets refer to stored extracted page text, and DOCX offsets to stored package-part text; neither is a byte offset in the original binary or a guaranteed rendered-document position. The [format demo](resilience-core/format-demo.mjs) generates its own PDF/DOCX fixtures and demonstrates candidate retrieval with visible gaps.

PDF parsing uses pinned [PDF.js](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html) to extract text page by page. Empty/scan-like pages remain failed with an OCR/review reason. A retained review gap covers unexamined visual layout, graphics, forms, annotations and embedded attachments. DOCX parsing uses [yauzl](https://github.com/thejoshwolfe/yauzl) and [saxes](https://github.com/lddubeau/saxes) to read UTF-8 Word XML, including body/table text, standard-named headers, footers, footnotes, endnotes and comments. It preserves both inserted/deleted wording where present and flags unresolved revision meaning, fields, hidden text, unsupported parts and external relationships. It does not follow links or resolve XML entities/DTDs.

Both rich formats deliberately remain `inventoryComplete: false` pending review of non-text content and layout. Text extraction is useful evidence, but it does not clear a document or authorize binary publication. OCR, custom Word-part mappings, UTF-16 XML, visual table reconstruction and Word tracked-change editing remain unimplemented. The existing plain-text publication restrictions still apply.

Parsing runs in a worker with a 10-second deadline, a 128 MiB JavaScript old-generation limit and a 4 MiB stack limit. Raw inputs are capped at 1 MiB; DOCX at 256 package entries and 8 MiB declared expansion; extracted output at 2 MiB; PDF processing at 200 pages. Unprocessed page counts and parser failures stay visible. Duplicate/traversing ZIP paths, encrypted entries, invalid parsed-part CRCs and DTDs are rejected. Worker limits do not bound all native allocations or constitute an OS security sandbox; production parser isolation still needs deployment validation. Parser diagnostics are drained without copying document text into application logs.

`discover` accepts `mode: "phrases"` (default) or `mode: "hybrid"`. Hybrid mode combines whitespace-tolerant phrases, query terms within eight words, and instrument aliases near an explicit section reference. For example, a **synthetic** query is:

```json
{"mode":"hybrid","phrases":["incident owner"],"citations":[{"instrumentAliases":["Synthetic Act"],"provision":"24"}],"limit":100}
```

Candidates identify their matching strategies, exact evidence and nearby negation/exception signals. Scores only order deterministic matches; citation proximity does not establish applicability, and these signals are not legal findings. Search is bounded to 65,536 characters per segment and 2,097,152 characters per request. Oversized/unprocessed segments increment `unsearchedSegments` and set `truncated`; they are not counted as searched negatives. Semantic embeddings/model inference have not been introduced.

### Microsoft Entra ID and SharePoint integration

The team selected **Microsoft Entra ID and SharePoint** for the first real integration. [Microsoft adapters](resilience-core/microsoft.mjs), the [runtime](resilience-core/microsoft-runtime.mjs) and an [operator CLI](resilience-core/microsoft-cli.mjs) are implemented and tested against simulated responses. **No live tenant connection, consent grant or SharePoint publication has been performed.**

The runtime validates single-tenant v2 access tokens using `jose`: signature, issuer, API audience, tenant/object identity, allowed calling client, delegated scope and expiry. It exchanges the API token through Microsoft's [on-behalf-of flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-on-behalf-of-flow), then checks the delegated `/me` identity and paginates [current group memberships](https://learn.microsoft.com/en-us/graph/api/user-list-transitivememberof?view=graph-rest-1.0). API tokens are not forwarded to Graph. Group results are refreshed for each operation; Microsoft-side propagation and token revocation behaviour still require tenant testing.

Configuration maps Entra groups to **tenant-wide roles** and matter access. Role grants apply across all matters that user may access; this version does not support different reviewer/editor roles per matter. Use separate role and matter-access groups as illustrated in [the configuration template](resilience-core/microsoft.example.json). Shared legal sources/assertions are tenant-readable; artefacts and their derivatives are matter-scoped. The runtime also verifies SharePoint metadata access for retained artefacts, including historical versions. If any retained item is denied or moved outside its configured folder, it withholds that entire matter and its cached derivatives. This conservative policy can block otherwise readable documents; it is bounded to 500 distinct retained targets per operation and is not a scalable fine-grained ACL synchronizer.

SharePoint import is limited to direct children of explicitly configured drive/folder pairs. It rechecks access and version before storing extracted content. Preauthenticated transfer URLs must use exact configured HTTPS hosts; redirects are refused and bearer tokens are never attached to transfer URLs. Imported text has a **1 MiB** limit. The importer supports plain-text, PDF and DOCX extraction as described above. OCR and representative-corpus validation remain outstanding.

For a configured environment:

1. Register the single-tenant API for v2 access tokens and its delegated `access_as_user` scope; identify allowed frontend client IDs. See Microsoft's [access-token validation guidance](https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens).
2. Have the tenant administrator approve the OBO permissions needed for the selected pilot. Membership lookup uses delegated `User.Read`; the documented upload-session permission is delegated `Files.ReadWrite`. Confirm the actual SharePoint permission/consent design with the administrator before client-data use; application folder allowlists do not narrow OAuth consent itself.
3. Copy the configuration template to a private location, replace placeholders with tenant/app/group IDs, approved matter folders and exact transfer hosts, and set `LARP_MICROSOFT_CONFIG` to that path. Set `LARP_LEDGER_PATH` to a database in a protected directory. Keep credentials out of JSON configuration and Git.
4. Supply `LARP_ENTRA_CLIENT_SECRET` locally and a short-lived delegated API token as `LARP_ACCESS_TOKEN`. A browser sign-in UI, certificate credential flow, claims-challenge UX and secret-management deployment are not implemented. The CLI creates new files with a restrictive umask; protect the directory, existing files and backups as well.
5. Run `node resilience-core/microsoft-cli.mjs check-config` for a local configuration check. This does not test credentials or connectivity. Use `execute`, `import`, `publish` or `reconcile` with JSON on stdin only for the approved environment; these commands may perform live reads or writes.

CLI request shapes are:

| Command | JSON input |
| --- | --- |
| `execute` | `{ "operation": "list", "args": ["artefact"] }` or another public domain operation. Direct `addArtefact`/`ingestText`/`ingestDocument` is disabled in the Microsoft runtime; use verified import. |
| `import` | `{ "key": "stable-key", "expectedVersion": 0, "title": "Pilot template", "type": "template", "owner": "OWNER_ENTRA_OBJECT_ID", "attachmentsComplete": false, "target": { "matterId": "pilot-matter", "driveId": "DRIVE_ID", "folderId": "FOLDER_ID", "itemId": "ITEM_ID" } }` |
| `publish` | `{ "jobId": "QUEUED_PUBLICATION_RECORD_ID" }` after the assessment, change-set and owner decisions have been recorded. |
| `reconcile` | `{ "jobId": "INTERRUPTED_PUBLICATION_RECORD_ID", "reason": "Record the destination comparison and decision" }`; requires the recorded owner with reviewer authority. |

### Publication and recovery

The [publication worker](resilience-core/publication-worker.mjs) persists a claim before any external write, refreshes authorization, rechecks evidence and approvals, then invokes the selected adapter. Jobs have at most three attempts and respect exponential backoff and provider retry delays. Each target completes separately, so partial completion remains visible. Retrying a completed job returns its receipt without issuing another write.

The SharePoint adapter supports complete, single-segment plain-text artefacts only. It compares the imported eTag and content hash, creates an [upload session with `If-Match`](https://learn.microsoft.com/en-us/graph/api/driveitem-createuploadsession?view=graph-rest-1.0), uploads the reviewed bytes and re-reads the destination to verify the hash. Live SharePoint concurrency, sensitivity labels, checkout/versioning policies and mid-upload conflicts still need acceptance testing; simulated HTTP responses cannot establish server behaviour. DOCX formatting/tracked changes, executed agreements and automated-control releases are outside this writer.

A lost acknowledgement or error after upload begins requires reconciliation, not automatic overwrite. A running claim expires after 60 seconds but is never silently re-leased. The owner with reviewer authority compares destination content: observed desired content can be recorded with explicitly uncertain write attribution; an unchanged target can be requeued within the attempt limit; divergent content is blocked. Approvals revoked or evidence changed during publication produce `published_review_required` while preserving what happened. Rollback is a **new, separately assessed and approved change set** referencing the prior publication; original versions and receipts remain intact.

Database schema **2** retains the append-only records/decisions/events tables and upgrades schema 1 without dropping records. Older foundation code rejects schema 2. SQLite administrators can bypass triggers; this is not cryptographic tamper evidence or encrypted storage. [Recovery utilities](resilience-core/recovery.mjs) use Node's [SQLite backup API](https://nodejs.org/download/release/v22.23.2/docs/api/sqlite.html#sqlitebackupsourceDb-destination-options), validate database integrity, foreign keys and record-body hashes, and restore to a new path without replacing existing files. They are trusted operator APIs, not matter-user endpoints. Restored pending publications must be reconciled against SharePoint because restoring a ledger does not rewind external documents.

### Evaluation and remaining delivery gates

The [evaluation harness](resilience-core/evaluate.mjs) accepts labeled cases, rejects duplicate IDs and document-family leakage between train/test partitions, retains extraction abstentions in the recall denominator, and reports raw counts. Both phrase and hybrid modes on the unchanged [10-case synthetic corpus](resilience-core/evaluation-corpus.json) produce **4/6 dependency recall and 4/6 candidate precision**, with two severe misses: an implicit dependency and an unparsed scan. Candidate precision is not finding precision; legal finding precision and pilot gates remain unevaluated. The harness refuses to report metrics if a retrieval budget leaves search incomplete. These results expose the limitations of the current deterministic baselines. Do not tune on the future held-out corpus or present these synthetic labels as lawyer-adjudicated ground truth.

The team says a reviewer and approved pilot corpus are available; their identities, access location and scope have not yet been provided. The [draft review-pack template](resilience-core/review-pack.example.json) records the needed source versions/hashes, interpretation, applicability, exceptions and positive/negative/missing-context examples. Filling the template does not itself approve an assertion; the authenticated reviewer must record the decision through the ledger.

| Remaining gate | Work still required |
| --- | --- |
| Live Microsoft integration | Supply tenant/API/frontend IDs, group mappings, approved folder IDs and transfer hosts; configure secrets locally; complete administrator consent and exercise delegated access, revocation, conflicts and recovery in the approved tenant. |
| Legal rule pack and corpus | Identify the reviewer and corpus permission reference/location; select the recurring workflow; import approved evidence and record reviewed assertions with applicability and exceptions. No real legal rule pack has been approved by this work. |
| Broader discovery and extraction | Validate the implemented PDF/DOCX and citation/proximity baselines on representative permitted files; add approved OCR, richer layout handling and evaluated semantic discovery. Select any model/deployment after the partner's data-handling decision; no hosted model calls or embedding pipeline have been added. |
| Legal/source maintenance | Implement approved source feeds, terms/access-window controls, provision-level commencement/transition reasoning and recurring rediscovery after the source set and reviewer-approved rules are defined. Source snapshots can currently be entered manually. |
| Product integration | Connect the tested services to a chosen user-facing workflow, including sign-in, review/owner queues and accessible error states. The existing hackathon web app remains unchanged, so these services are not exposed there. |
| Production operations | Validate protection/retention/deletion, multi-user load, sustained worker scheduling, recovery objectives and deployment configuration. Current tests cover local SQLite and simulated Microsoft failures, not a production service. |
| Supervised pilot | Conduct the planned user interviews and baseline exercise, adjudicate held-out findings, measure reviewer effort/resource use and compare the firm's existing tools. The targets below are still proposed gates, not achieved results. |

## Proposed product and architecture

This section defines the full product direction; the implementation scope and outstanding gates above distinguish the working foundation from remaining design. Prove one maintained legal workflow before expanding instrument or jurisdiction coverage.

### Workflow and domain model

1. **Inventory permitted artefacts.** Import source versions and permissions from an approved repository. Identify each artefact’s type, owner, matter, status and relationships to attached policies or schedules. Record failed extraction explicitly.
2. **Maintain reviewed assertions.** A legal reviewer translates source changes into scoped, versioned assumptions or checks, including exceptions, factual prerequisites and effective periods. AI may propose candidates; unapproved rules must not silently become authoritative.
3. **Discover relationships.** Combine explicit citation parsing, lexical search, semantic retrieval and clause-pattern comparison. Store candidates separately from confirmed dependencies. New documents and newly introduced duties also need broad discovery, not only traversal of old links.
4. **Assess impact.** Compare the relevant legal versions and artefact facts. Show evidence spans, uncertainty, covered/uncovered scope and the distinction between present remediation and future preparation.
5. **Review a coordinated change set.** Assign legal and operational owners; propose tailored updates for every relevant artefact type. Preserve rejected findings and reasons without treating rejection as permanent immunity from later review.
6. **Publish and verify.** Apply only approved changes through version-aware adapters. Record publication acknowledgements and re-read the destination. Keep failed and partial propagation visible until resolved.
7. **Maintain continuously.** Re-evaluate on changes to legal sources, artefacts, permissions or factual prerequisites. Periodically rediscover links to catch omissions and record review expiry.

| Record | Minimum information |
| --- | --- |
| Source version | Instrument/publisher, jurisdiction, source type, provision, publication/effective dates, retrieved timestamp, content hash, source URL and authority status. |
| Assertion version | Reviewed interpretation, source references, applicability predicates, exceptions, valid period, owner, approval and test examples. |
| Artefact version | Stable identity, type, matter/tenant, ACL reference, source version/hash, location, extraction coverage, spans, owner and execution/publication state. |
| Dependency | Artefact span, assertion version, relationship type, evidence, inferred/confirmed status, reviewer and revalidation triggers. |
| Impact assessment | Change event, scoped inputs, finding, severity, coverage, uncertainty, evidence, model/prompt version and reviewer disposition. |
| Change set | Related proposed revisions, owners, approvals, source-version preconditions, target publication results and rollback references. |
| Audit event | Actor, time, action, evidence references and previous/new version, with tamper-evident retention appropriate to the deployment. |

A relational store with explicit relationship tables is a reasonable initial design; a graph database is an option only if measured traversal needs justify it. Store binary artefacts separately. Neither choice removes the work of legal interpretation, versioning or permission enforcement.

Derived-result cache identities should include artefact content, assertion/source versions, extraction version, model/prompt/schema versions and permission scope. Revoke or invalidate results when those inputs change; keep source freshness separate from the time a cached answer was served.

Use distinct fields for **legal lifecycle**, **finding** and **workflow disposition**. Suggested findings are `potential_conflict`, `potential_gap`, `stale_reference`, `no_material_impact_in_scope` and `insufficient_evidence`. Suggested workflow states are `unreviewed`, `in_review`, `approved`, `rejected`, `published` and `blocked`. Avoid global “compliant” badges. A no-impact result must identify its assessed scope and uncovered material; omitting a reassuring label does not eliminate false reassurance.

### What propagation means

| Artefact type | Permitted target workflow |
| --- | --- |
| Firm template or precedent | Owner approves a new version; retire or mark superseded versions; identify downstream drafts using the old version. |
| Draft agreement | Propose anchored revisions and surface unresolved issues before execution; reviewer decides the action. |
| Executed agreement | Preserve the signed original. Route assessment to the responsible lawyer, who decides whether notification, variation, consent, renewal action or no action is appropriate under the agreement and law. |
| Checklist, playbook or procedure | Update the relevant step, owner and exception logic; confirm publication and any operational handover. |
| Client advisory or training | Review audience and factual scope, approve revised content, and track delivery or acknowledgement when appropriate. |
| Automated compliance tool | Create a reviewed rule/configuration change with regression tests and an accountable release; a text edit alone is not completion. |

For example, a verified breach-escalation change should generate connected review tasks for a service-agreement template, the incident checklist, the staff playbook and related training. Each gets the appropriate owner and revision; closure records what was actually updated, what remains blocked and which versions were assessed. The synthetic workflow demo exercises the template/checklist/playbook portion; real legal validation, training delivery and live firm-system acceptance remain outstanding.

Repeated language may reveal an undocumented drafting habit. Cluster only material the reviewer is permitted to access, preserve context, and label the inferred relationship. Similarity does not prove common authorship, copying, legal applicability or permission to reuse wording across clients.

### Integrations and build priorities

Build source/version handling, the reviewed dependency model, coverage evaluation and coordinated publication as the product core. Reuse approved document repositories, identity systems and licensed legal research where practical. Select a document-system connector based on the first partner’s actual environment rather than implementing several speculative integrations.

Word integration is a justified later delivery surface. Microsoft documents change-tracking modes in [WordApi 1.4](https://learn.microsoft.com/en-us/javascript/api/word/word.changetrackingmode?view=word-js-preview) and tracked-change inspection/acceptance/rejection in [WordApi 1.6](https://learn.microsoft.com/en-us/javascript/api/word/word.trackedchange?view=word-js-preview), accessed 6 September 2026. A production add-in still needs client capability checks, stable anchors, protected-document handling, revision-conflict behaviour and formatting tests. The existing web diff is not that integration.

Defer broad multi-jurisdiction automation, extensive billing features and autonomous contract amendment until the core maintenance loop is validated. Keep jurisdiction and governing-law fields in the model now; later cross-border analysis must preserve conflicting obligations for legal review rather than choosing one silently.

## Confidentiality, reliability and sustainable operation

MinLaw’s final **Guide for Using Generative AI in the Legal Sector**, launched **6 March 2026**, emphasises professional responsibility, confidentiality and transparency. It applies to the use of AI in legal work and provides the relevant current guidance context; the older consultation draft is superseded for this purpose. See the [launch announcement](https://www.mlaw.gov.sg/launch-of-guide-for-using-generative-artificial-intelligence-in-the-legal-sector/) and [final guide](https://www.mlaw.gov.sg/files/Guide_for_using_Generative_AI_in_the_Legal_Sector__Published_on_6_Mar_2026_.pdf). These sources do not endorse L.A.R.P. or transfer a lawyer’s responsibility to the software.

Before a real-client pilot, choose a deployment with the partner’s legal, security and IT owners. Compare firm-hosted inference, private managed infrastructure and expressly approved hosted inference using the same evaluation corpus. Local hosting is not inherently private enough, greener or more accurate; assess access, outbound traffic, operational support, resource use and model performance.

Cloudflare’s [R2 data-location documentation](https://developers.cloudflare.com/r2/reference/data-location/), updated 19 August 2026, says location hints are best-effort; an `apac` hint is **not a Singapore residency guarantee**. Any residency assessment must cover application hosting, inference, extraction, embeddings, logs, caches and backups, not just the bucket. No complete residency or provider-retention configuration was verified for this project.

| Control area | Required design and verification |
| --- | --- |
| Matter confidentiality | Authenticate users and service identities; enforce tenant and matter permissions before retrieval, generation, caching, export and aggregation. Test ethical walls. Removing names or showing only counts does not by itself prevent information leakage. |
| Data handling | Minimise submitted content; disclose destinations before processing; apply partner-approved retention, deletion, backup and incident procedures. Treat extracted text, embeddings and review caches as sensitive derivatives. |
| Source and prompt integrity | Treat documents and web content as evidence, not executable instructions. Restrict tools and outbound destinations, isolate document parsing, limit archive expansion and preserve provenance. |
| Legal grounding | Validate that quoted spans exist in the exact cached versions, then separately review applicability and reasoning. Failed validation creates a visible blocked/evidence-gap record; silently dropping it could hide missing coverage. |
| Access to official sources | Use approved feeds, controlled fetches and cached public-law evidence. Enforce source terms on every relevant ingestion path, not just a sync-start check; pause or resume if a run reaches the allowed-window boundary. |
| Recovery | Use durable queues, idempotent jobs, bounded retries, checkpoints, tested restore and visibly stale read-only operation during outages. Define recovery-time and recovery-point targets with the partner and test them before rollout. |
| Concurrent edits | Verify expected source versions before publishing; reject conflicting writes; record partial completion and compensating/rollback action. Whole-object read–modify–write JSON is insufficient for shared approval history. |
| Resource use | Hash and reuse extraction, batch appropriately, route simple checks to deterministic code, select models by measured task quality, and retire unnecessary derived data subject to retention requirements. Track actual usage; do not convert token counts into unsupported carbon claims. |
| Reviewer workload | Group related findings, show uncertainty early, cap interruption volume, provide reassignment and avoid repetitive review of unchanged evidence. Evaluate rework and cognitive burden alongside speed. |
| Time and billing | Separate model processing, elapsed time and active human review. Any later billing integration needs validated activity records, correction and the firm’s billing policy; elapsed waiting time is not automatically billable work. |

The evaluation posture is consistent with NIST’s voluntary [Generative AI Profile, AI 600-1](https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence), published July 2024: assess reliability and risks through evidence rather than treating fluent output as validation. L.A.R.P.’s proposed thresholds below are team planning choices, not NIST standards.

## Validation and delivery plan

The recommended first milestone is **one complete, permission-aware maintenance cycle over a bounded corpus**, not a bigger alert feed. The timeline below is an illustrative 12-week sequence from an agreed start, conditional on partner availability, corpus permissions and staffing; it is not a delivery commitment.

| Stage | Work and owner role | Exit evidence |
| --- | --- | --- |
| Weeks 1–2: scope and baseline | Product lead and legal lead interview a proposed 5–8 users across knowledge, practice, risk and operations. Select one recurring maintenance task and obtain permission for a representative corpus. Engineering/security lead addresses the prototype boundaries identified above. | Written workflow, named legal owner, data-handling agreement, approved deployment approach, baseline review exercise and a prioritised blocker list. No real-client processing through unapproved paths. |
| Weeks 3–5: discover and explain | Legal lead reviews 12–20 initial assertions. Engineering builds versioned ingestion, extraction coverage and candidate/confirmed dependencies for a proposed 50–100 artefacts across at least three types. | Each finding is reproducible from stored evidence. Hold-out evaluation includes missing context, negatives, new obligations and parsing failures. These corpus sizes are targets, not existing inventory. |
| Weeks 6–8: propagate and recover | Engineering and knowledge owners implement one publication adapter, durable review and coordinated change sets; security lead exercises access and recovery. | Approved changes reach the expected versions; partial publication, concurrent edits and rollback are demonstrated; originals and audit evidence remain traceable. |
| Weeks 9–12: supervised pilot | Product and legal leads compare real maintenance work with the baseline and the firm’s existing tools. Engineering measures latency, resources and repeated-change behaviour. | Partner reviews quality, workload, deployment suitability and total cost; an explicit go/adjust/stop decision follows the agreed gates. |

A small team may combine roles, but legal rule approval, system operation and publication responsibility must remain explicit. Budget for legal annotation, quality adjudication, partner onboarding and operational support as well as engineering and model calls.

### Evaluation design and proposed gates

Have qualified reviewers independently label a held-out set and adjudicate disagreements. Split by document family or matter to avoid near-duplicate leakage. Evaluate finding quality before reviewer correction and the quality of the final published result separately. Compare: manual workflow, the firm’s existing legal AI where accessible, and L.A.R.P., using equivalent inputs and recording setup effort.

| Measure | Definition and proposed decision gate |
| --- | --- |
| Dependency recall | Correctly found relevant relationships divided by all relevant relationships in the annotated scope. Initial pilot target: at least 95%; report numerator, denominator and uncertainty. |
| Finding precision | Correctly supported actionable findings divided by all findings proposed for review. Initial target: at least 80%, with time spent rejecting false positives recorded. |
| Severe misses | Count and explain missed high-consequence impacts. Any observed unresolved severe miss blocks expansion, even if aggregate recall passes. Zero observed misses is not proof of zero risk. |
| Coverage integrity | Every artefact/span is accounted for as assessed, excluded with reason, or failed/unprocessed. No silent truncation. Exclusions remain visible in the denominator. |
| Evidence and publication | Every approved change has validated source/span references, reviewer attribution and a verified target version or explicit publication failure. |
| No-impact and uncertainty | Report correct and incorrect negative decisions separately from abstentions. Include unrelated amendments, dynamic references and missing attached policies. |
| Human effort | Measure active review, rework and total completion time. A proposed 30% median active-time reduction is useful only if quality gates pass; report variation and absolute times. |
| Incremental benefit | Compare first and subsequent legal changes on the same maintained corpus, including rediscovery, changed artefacts and legal review. Measure reused work rather than assuming savings. |
| Confidentiality and resilience | No unauthorised disclosure in the agreed tests; pass permission revocation, outage/resume, concurrent-write and restore scenarios against partner-defined targets. |
| Sustainable operation | Report processing calls/tokens, storage growth, compute time, cost per closed change set and reviewer queue age. Report energy only where measured; make no quantified environmental or burnout claim without evidence. |

Include difficult cases: scans, tables, footnotes, attachments, negation, exceptions, future commencement, guidance updates, conflicting jurisdictions, stale cache entries, malicious source instructions and newly introduced duties with no old dependency edge. The historical corpus is too small and correlated to validate production accuracy.

### Commercial validation

Start with a supervised design-partner engagement; no partner commitment is presently established. Ask the firm to supply a recent change-maintenance example, identify its owner and reconstruct the time spent finding, interpreting, reviewing and publishing updates. Establish which work was missed or repeated and what evidence the firm needs to close it.

A scoped pilot fee or later subscription based on maintained corpus/workflow scope is a pricing hypothesis. Model contribution economics as revenue less onboarding, legal-content maintenance, support, storage, extraction and inference costs. Measure implementation effort and procurement constraints before setting a price. Do not infer addressable market or willingness to pay from the hackathon result.

Proceed beyond the pilot only if the partner values the complete maintenance workflow, the quality/security gates pass and the cost of maintaining source and assertion packs is supportable. If users mainly value one-off drafting, existing tools may be a better solution; if the ledger requires excessive manual upkeep, narrow the scope or reconsider the design.

## Run and configure the prototype

The checked-in [package manifest](package.json) is the version reference. Install Bun separately if unavailable. This checkout did not contain `node_modules` during the documentation audit; dependencies were not installed and the application was not built or run as part of this documentation-only change.

```bash
bun install
cp .env.example .env.local
# Replace placeholders in .env.local before using connected features.
bun run dev
```

The development server normally uses `http://localhost:3000`.

```bash
bun run lint
bun run build
bun run start
```

Keep credentials server-only in `.env.local` or the approved deployment secret store, never in a `NEXT_PUBLIC_` variable or version control. [`.env.example`](.env.example) records the prototype configuration; its account endpoint and bucket are deployment-specific and must not be assumed appropriate for a new environment.

| Environment variable | Purpose / code default |
| --- | --- |
| `R2_ENDPOINT` | S3-compatible account endpoint for the approved R2 environment. |
| `R2_BUCKET_NAME` | Bucket name; the example uses `lit-hack`. |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Scoped server credentials. Reads serve source contracts; enabled regulatory/cache writes require corresponding permissions. |
| `R2_CONTRACT_PREFIX` | Source-contract prefix; default `Contracts/`, case-sensitive. |
| `R2_CONTRACT_MANIFEST` | Optional manifest; default `<contract prefix>index.json`. |
| `REGULATION_SYNC_SECRET` | Bearer secret required by the catalogue sync endpoint. |
| `OPENAI_API_KEY` | Enables hosted research, review and generated comparisons. |
| `OPENAI_MODEL` | Code default `gpt-5-mini`; actual deployment value and model access were not inspected. |
| `REVIEW_PARAGRAPH_LIMIT` | Opening review window; default `80`. Increasing this alone does not remove extraction, character or output limits. |
| `REVIEW_CACHE_HIT_MIN_MS`, `REVIEW_CACHE_HIT_MAX_MS` | Artificial cache-hit response timing; defaults `5000` and `10000`. Set both to `0` to avoid deliberate demo latency. These variables are read in code but absent from the example file. |

Read-only R2 credentials can serve contracts and cached information; some cache writes intentionally fail without failing the review response. Do not treat a successful response as proof of persistence. The code does not establish an object-prefix permission boundary merely by placing writes under a different prefix; verify what the storage credential actually permits, and separate sensitive storage where needed.

Deployment history names Vercel, but this checkout has no verified project link or production configuration. Before a future deployment, confirm the intended account/project, runtime duration limits, secrets, access controls, storage permissions and scheduled ingestion. Publishing this repository is separate from deploying the application; no deployment was performed for this milestone.

## Routes, APIs and storage

### User routes

| Route | Purpose |
| --- | --- |
| `/` | Shared regulatory workspace. |
| `/regulations/pdpa` | PDPA summary, lifecycle, selected historical comparison and memo download. |
| `/regulations/wfa` | Workplace fairness readiness view. |
| `/regulations/new` | Research and confirm an entered/uploaded legal-change draft. |
| `/contracts?regulation=PDPA2012` or `WFA2025` | R2 contract library and review queue for one of the two supported workspaces. |
| `/contracts/[...key]` | DOCX working-copy editor, PDF review/conversion workbench or source access depending on format. |
| `/resilience` | Dependency and history visualisation. |
| `/files`, `/review/[docId]`, `/review/[docId]/final` | Legacy eleven-document fixture explorer, clause decisions and final-document/signing demonstration. |

The legacy explorer supports `?obligation=` and `?similar=`. Its explicit back links, hydrated review state, unknown-ID handling and inline download failures are useful behaviours to preserve when revising that workflow. They do not establish equivalent persistence or coverage for the R2 editor.

### API contract

| Method and endpoint | Behaviour |
| --- | --- |
| `GET /api/contracts` | Lists `pdf`, `doc`, `docx`, `txt`, `md`, `json` objects, excluding the configured manifest; merges supplied or inferred metadata. Marks DOCX editable and PDF convertible. |
| `GET /api/contracts/[...key]` | Streams a source object after prefix/path checks, with encoded filenames and private short-lived cache headers. |
| `POST /api/contracts/review` | JSON `{ "key": "Contracts/example.docx", "regulationId": "PDPA2012" }`; PDF/DOCX only, 20 MiB file limit. Generates or retrieves a cached review. |
| `GET /api/regulations` | Catalogue and overlays; filters `query`, `kind`, `status`, `page`, `limit`; default limit 100, maximum 500. The response also spreads the catalogue, so the returned `instruments` field is not limited to the paginated `regulations` subset. |
| `PATCH /api/regulations` | Requires `regulationId` and string `internalNotes`; updates internal notes, tracking and tags only. |
| `POST /api/regulations/sync` | Requires `Authorization: Bearer <REGULATION_SYNC_SECRET>`; rejects outside the Singapore extraction window with 423 and missing/incorrect secret with 401. Fetches current, repealed/revoked and uncommenced Acts/SL categories. |
| `GET /api/regulations/PDPA2012/comparison` | Returns the stored or authored baseline comparison and snapshot-availability metadata. |
| `POST /api/regulations/PDPA2012/comparison` | Generates a comparison from cached texts or the authored change records; other IDs return 404. Its fixed dates are 2 January 2021 and 5 December 2025, not an automatically current comparison. |
| `POST /api/regulations/discover` | Multipart `prompt` and optional `file`; up to 8,000 prompt characters and 10 MiB PDF/DOCX/TXT/Markdown upload. Returns a research draft using allowed government domains. |
| `GET /api/regulations/intake` | Reads saved research records. |
| `POST /api/regulations/intake` | JSON containing `draft` and `confirmed: true`; sanitises and saves a record with a summary and allowed source. This client-provided flag is not authenticated reviewer identity. |

The access-control limitations in [Current implementation](#current-implementation) apply to these endpoints. No unauthenticated endpoint should be exposed to real confidential matter data merely because its storage credentials are server-only.

### R2 layout

```text
Contracts/
  index.json                         # optional metadata, not legal ground truth
  example.docx                       # source object
  example.pdf                        # source object
Regulations/
  catalog.json
  overlays.json
  intake.json
  sources/PDPA2012/                   # selected text snapshots
  comparisons/PDPA2012/               # baseline/generated comparisons
  review-cache/                      # contract text and generated review derivatives
```

A minimal manifest can be a list or an object containing `contracts`:

```json
{
  "contracts": [
    {
      "key": "Contracts/example.docx",
      "name": "Example service agreement",
      "section": "Pending extraction",
      "dependency": "Pending legal review",
      "currentAssumption": "Not assessed",
      "updatedRequirement": "Not assessed",
      "reason": "Metadata only; no legal finding has been confirmed.",
      "status": "Needs Review"
    }
  ]
}
```

The API accepts manifest statuses `Outdated`, `Needs Review`, `Still Valid` and `Validated`. These are existing metadata labels, not the proposed assessment model or proof of legal clearance. The former manifest example asserting a seven-to-fourteen-day statutory notice change was illustrative and has been retired.

## Research corpus and historical assets

There are three distinct data collections: the R2 environment’s source objects (contents and count not audited here), the eleven fictional/hand-authored review fixtures, and the five-source historical research corpus in [corpus.json](docs/demo-corpus/corpus.json). They must not be counted together or described as a tested production corpus.

The research corpus’s document-level records reconcile to:

| ID | Historical source description | Qualification |
| --- | --- | --- |
| `DOC-001` | Singapore legal-intern offer, dated 16 April 2026. | Recorded as electronically signed; identifying details redacted. |
| `DOC-002` | Singapore internship agreement, dated 18 June 2025. | An unsigned counterpart, despite older “all signed” summaries. |
| `DOC-003` | Singapore law-firm internship offer, dated 4 April 2025. | Employer pseudonymised as Silverbirch LLC; signing status not newly verified. |
| `DOC-004` | Singapore law-internship confirmation, dated 1 December 2025. | Recorded as signed 4 December; employer pseudonymised as Anson Chambers. |
| `DOC-005` | Student-drafted master agreement with fictional parties, covering memo and grader feedback. | A course assignment, neither an executed employment agreement nor a firm precedent. Later JSON records contain extracted clauses, superseding the earlier “unreadable fifth document” note. |

Source provenance is inherited from the original team's notes and the later clause records; private Drive originals were not re-accessed. The corpus’s top-level “five real signed documents” statement and some legal annotations remain historical inaccuracies. The JSON is retained as research data, not adopted as current legal ground truth or cleared for new publication by this README.

The prior redaction process used a consistent individual pseudonym (`TAN Wei Ling` / `[CANDIDATE]`), removed identification numbers, personal addresses and contacts, emergency-contact details, signature/audit metadata and student identifiers, substituted roles for personnel names, and banded financial amounts. Two multinational employer names remained in the original corpus; small-firm names were replaced. Clause wording and selected dates were retained for analysis. This reduces exposure but does not establish anonymisation, consent, copyright permission or freedom from re-identification.

Keep unredacted personal documents out of the repository, public demonstrations and third-party model requests. Use synthetic material by default for new public examples. Before any further use of the retained corpus, obtain appropriate permission, recheck redaction and current legal interpretations, and resolve its `unverified_claims`. A statement in an old document that material was “demo-safe” is not continuing authorisation.

Historical non-Markdown assets remain:

- [Prototype pitch deck](docs/demo/pitch-deck.html) and [ledger console](docs/demo/ledger-console.html): illustrative hackathon artefacts, not current product or legal evidence.
- [Archived critique PDF](docs/strategy/critique-and-usp.pdf): preserves the old research presentation and may contain claims superseded here.
- [Whiteboard frames](docs/video-analysis/frames/): seven retained images from the early design discussion. The recording was described as `IMG_9132.MOV`, approximately 3 minutes 51 seconds; the original video and raw transcript are not in this checkout.

The whiteboard established the initial concept of a private corpus, AI-assisted impact review, lawyer acceptance and future Word integration. Its hypothetical generative-AI rule, `100+` notation, undeveloped client segments and ambiguous handwritten labels are not enacted law, measured scale or adopted architecture. Its lasting open questions—retrieval, coverage, source provenance, artefact types and downstream ownership—are addressed by the target design and validation plan above.

## Engineering and documentation conventions

This root README is the single maintained Markdown document for the project. Extend its relevant section for domain vocabulary, decisions and operational documentation; do not recreate separate context/ADR files or duplicate instructions unless the team changes this convention. Deleting `AGENTS.md` and `CLAUDE.md` also removes their tool-specific automatic discovery; contributors must consult this README explicitly.

Before writing Next.js code, read the relevant guide in `node_modules/next/dist/docs/` for the installed version. Do not assume older APIs apply. The inherited development guidance calls out asynchronous `params`/`searchParams`, non-async client components, `next/link` navigation and App Router navigation APIs. Preserve shared state APIs where callers depend on them; verify the current source before refactoring.

| Code area | Responsibility |
| --- | --- |
| `app/`, `components/` | Routes, shared layout, library and review surfaces. |
| `lib/r2.ts`, `lib/contract-metadata.ts` | Storage access and metadata inference. |
| `lib/singapore-regulations.ts`, `lib/pdpa-comparison.ts`, `lib/regulation-intake.ts` | Catalogue, selected comparisons and saved research drafts. |
| `lib/regulatory-workspace.ts`, `lib/regulatory-journey.ts` | Two-workspace definitions and lifecycle presentation. |
| `lib/contract-review-model.ts`, review-cache modules | AI result shapes and cache handling. |
| `lib/docx-working-copy.ts`, `lib/docx.ts`, `lib/docx-model.ts`, `lib/download.ts` | Word working-copy/export representation and downloads. |
| `lib/pdpa/data.ts`, `lib/review/` | Legacy fixture data, state and review provider. |
| `app/globals.css`, `app/layout.tsx` | Shared visual tokens and fonts; reuse the navy/gold/cream system rather than forking it. |

For code changes, run the declared lint and build checks and appropriate focused tests. Exercise invalid IDs/keys, failed extraction, empty selections, unavailable storage, hydration, source and model errors, download failures and keyboard interaction where touched. The original one-off Agent A/B ownership split, personal-machine import paths and timed demo run sequence are obsolete and are not ongoing contributor restrictions.

**Repository and issue tracking:** Development continues in the `larp-Ric` directory, including the additive resilience foundation. The team has selected `https://github.com/ch0002ic-cell/larp-draft`, branch `main`, as the publishing destination, using the local `draft` remote. The local `origin` retains `https://github.com/Kaleb-Nim/lit_hack.git` for provenance. Before publishing, inspect the destination's history and reconcile any differences without overwriting its work. The existing GitHub Issues conventions describe the original repository; confirm the tracker destination when migrating publication.

Use `gh` for authorised issue work, resolving the repository from the actual remote. The existing triage labels are:

| Label | Meaning |
| --- | --- |
| `needs-triage` | Maintainer assessment needed. |
| `needs-info` | Missing information blocks specification. |
| `ready-for-agent` | Fully specified for agent implementation. |
| `ready-for-human` | Human implementation or judgment needed. |
| `wontfix` | Will not be actioned. |

Issues, rather than PRs, are the established request surface. GitHub issues and PRs share a number space; resolve the object type before acting. Read tickets and comments before implementation. For multiline issue/PR text, use a body file. Tracker conventions do not themselves authorise external messages or publication.

If the existing wayfinding workflow is used, its map is a `wayfinder:map` issue with linked child tickets labelled `wayfinder:research`, `wayfinder:prototype`, `wayfinder:grilling` or `wayfinder:task`. Use native sub-issues/dependencies where available, otherwise explicit task-list and blocked-by links. Native dependency APIs use database issue IDs rather than display numbers. Choose an unblocked, unassigned child in map order; track claim, resolution and decision context in the authorised issue workflow. No issue or PR was created or modified during this consolidation.

### Consolidation provenance

All 13 project Markdown files found in this checkout were reviewed. Their non-redundant, relevant content is consolidated as follows; only this README remains. Former paths below are provenance labels, not links to surviving files.

| Former document(s) | Disposition in this README |
| --- | --- |
| Root `README.md`, `docs/r2-contracts.md` | Reconciled setup, storage, routes and API behaviour against current code. |
| `notes.md` | Retained identity, team-reported result, submission/prototype pointers, product intent and proposed repository destination; separated aspiration from implementation. |
| `docs/strategy/critique-and-usp.md` | Replaced pitch tactics and unsupported absolutes with current sourced competition, product direction, legal qualifications and measurable pilot gates. |
| `docs/sources/pdpc-guide-on-data-protection-clauses.md` | Preserved guide purpose, assertion topics, reproduction constraints and explicit re-verification gaps. |
| `docs/demo-corpus/README.md` | Consolidated privacy/provenance; reconciled source types against later JSON records. |
| `docs/video-analysis/whiteboard-explanation.md` | Preserved substantive concept, uncertainty and surviving asset pointers; retired repetitive transcript, frame-reading disputes and obsolete pitch instructions. |
| `docs/agents/flow-contract.md` | Retained relevant legacy flow and integration constraints; retired migration paths and task-specific ownership. |
| `AGENTS.md`, `CLAUDE.md`, `docs/agents/domain.md` | Moved current contributor guidance here and replaced the former multi-file documentation convention with the requested single README. |
| `docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md` | Consolidated repository, tracker, wayfinding and label conventions. |

## Research method and remaining uncertainties

Research combined a complete project Markdown inventory, targeted inspection of application/API/storage/export code and the corpus records, first-party Singapore legal/public-policy sources, current vendor descriptions and official technical documentation. Initial discovery covered the challenge, source governance, regulatory examples, market overlap and implementation claims. Follow-up searches tested the consequential assumptions: employment-notice context, NRIC authentication versus masking, commencement dates, 2026 subsidiary legislation, persistent competitor workflows, Word revision support and residency guarantees.

Sources are linked beside their supported claims with dates where available. Web access was uneven: some SSO and PDPC pages were available only through indexed official text, while some PDFs and Devpost/Instagram pages were inaccessible. Unretrieved source contents are not treated as newly verified. The exact organiser brief, track result and prototype status rely on team-supplied context where stated. No private-source originals, deployment secrets, live R2 corpus, customer interviews or competitor installations were inspected.

The principal remaining evidence gaps are the exact original brief, the currently published PDPC model-guide content, provision-complete legal updates beyond the selected scenarios, partner requirements, source/licensing arrangements, benchmark quality, actual deployment controls and commercial demand. These are scoped limitations, not claims that no further evidence exists. Research stopped after the architecture and product recommendation had primary-source support and material conflicting claims were corrected or bounded; further source collection should now target these decisions rather than repeat a broad vendor sweep.

Recheck legal status and provider terms before enabling a source pack or pilot. Update an existing claim in place with its evidence and date; remove superseded claims rather than append competing versions. Historical assets and generated application text do not override the current reviewed documentation.
