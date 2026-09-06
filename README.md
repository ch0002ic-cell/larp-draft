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

**Implemented as an additive module in `larp-Ric`, 6 September 2026.** The existing Next.js application remains the preserved baseline. The new [resilience core](resilience-core/ledger.mjs) has no imports into its routes, components or runtime configuration. It uses local SQLite and Node built-ins, with no network calls, credentials, hosted inference or writes to source contracts.

The foundation provides immutable source, assertion and artefact versions; reviewer-approved assertion evidence; candidate dependencies; durable, scoped impact assessments with append-only review decisions; explicit extraction gaps; review-task planning after source changes; and a cache-identity function covering evidence, processing versions and permission scope. Records and audit events commit in one SQLite transaction. Optimistic version/review checks reject conflicting writes. Corrected dependency evidence creates a new version and requires a new review, preserving the previous record.

### Try the foundation

Use Node 22.13 or later with `node:sqlite` support; the tests were run on Node **22.23.2**. Node's SQLite API is still experimental in that tested release; see the [version-specific SQLite documentation](https://nodejs.org/download/release/latest-jod/docs/api/sqlite.html). No package installation or change to the app's package scripts is needed.

```bash
node --test resilience-core/*.test.mjs
node resilience-core/demo.mjs
# Optional: select a NEW database file; the demo refuses an existing file.
node resilience-core/demo.mjs /tmp/larp-example.sqlite
```

The [demo](resilience-core/demo.mjs) uses [synthetic fixtures](resilience-core/fixtures.mjs), not actual Singapore law or private contracts. By default it creates a persistent database in a new operating-system temporary directory and prints its path. It demonstrates source versioning, literal candidate discovery, human-confirmed relationships, a scoped no-impact review, acknowledged missing evidence, invalidation after a source update and three review tasks. Executed agreements receive a legal-variation assessment task; nothing is published or amended.

### API and boundaries

| Operation | Contract |
| --- | --- |
| `addSource`, `addArtefact` | Editors/reviewers append records using the expected previous version (`0` for a new logical key). Artefacts require an explicit segment inventory and matter scope. |
| `addAssertion` | A reviewer records an interpretation, applicability, exceptions and an exact evidence span in the latest source snapshot. |
| `discoverLiteralCandidates` | Pure, case-sensitive literal matching over an already authorised artefact; returns one occurrence per matching segment. This is a retrieval baseline, not semantic discovery or legal interpretation. |
| `proposeDependency` | Records candidate evidence and rationale. Invalid artefact evidence is retained with a blocker. An optional `expectedVersion` allows an evidence correction. |
| `reviewDependency` | A scoped reviewer confirms or rejects a relationship with a reason and expected decision revision. Confirmation checks evidence and snapshot currency. |
| `proposeAssessment` | Records a manual finding for one assertion and artefact segment, including applicability reasoning, evidence, severity, context limitations and current-review/readiness mode. Unsupported evidence and incomplete no-impact proposals remain blocked. |
| `reviewAssessment`, `getAssessment` | A scoped reviewer approves or rejects with an expected decision revision. Reads distinguish current workflow status from the preserved historical decision; superseded evidence requires re-review. |
| `coverage` | Reports extraction and dependency status plus each assertion-scoped finding and its review status. Segments without findings remain `not_assessed`; the presence of findings never establishes whole-document clearance. |
| `planSourceChange` | Returns review tasks from confirmed known dependencies, preserving source/artefact references and flagging relocated text. Always states that further discovery is required, even with no matches. |
| `cacheIdentity` | Derives a hash from required evidence, processing and actor/ACL-version fields. It does not itself implement cache storage or external permission revocation. |
| `audit` | Returns events scoped to the actor; global database sequence numbers are not exposed. |

The ledger itself accepts **trusted actor inputs**, not credentials or a safe HTTP request schema. The new [service boundary](resilience-core/service.mjs) provides `createLedgerService({ ledger, verifySession, resolveAccess })` and `execute(credential, operation, ...args)`. It obtains identity and current permissions from server-configured adapters on every operation; payload actor/role fields cannot override them. Only named domain operations are exposed; database lifecycle methods remain internal. A local database administrator can bypass the SQL immutability triggers; this is neither cryptographic tamper proofing nor encrypted storage. Protect the database and its WAL/backups, and use synthetic data until a deployment is approved.

The session adapter must verify credentials and return `{ subject, tenantId, expiresAt }`, where `expiresAt` is an integer Unix timestamp in milliseconds. The permission adapter receives `{ subject, tenantId }` and must return `{ active, subject, tenantId, userId, roles, matterIds, aclVersion }` from an authoritative access store. Supported roles are `reader`, `editor` and `reviewer`; tenant membership permits reading shared sources/assertions, while artefacts remain matter-scoped. Identity mismatches, inactive membership, malformed scope, expired sessions and adapter failures deny access. Session expiry is checked again after permission resolution. Inputs are copied before asynchronous checks, and audit attribution uses the resolved user.

These adapters are injection points, not an implemented identity provider or login flow. Integrators must supply real session verification and current membership lookup, keep the ledger private to the service, and enforce transport security and request limits in their application boundary. The service does not cache permissions; provider-side consistency still determines when revocation becomes visible. `aclVersion` is required from the resolver but the service currently exposes no cached-result operation. Test adapters use synthetic identities only; the existing web app has not gained authentication through this addition.

A no-impact finding can be approved only when the recorded extraction inventory is complete, every inventoried segment is available, the proposer explicitly marks context complete and there are no unresolved limitations. These checks validate the supplied inventory; an ingestion adapter must still establish whether pages or attachments are missing. An approved `insufficient_evidence` finding acknowledges an unresolved gap and does not clear the artefact. New assessment versions require fresh review, and source/assertion/artefact revisions invalidate previous approval for current use without deleting its history.

Snapshot currency means the latest stored version, not legally operative-at-date reasoning. Proposal and uncommenced source labels require readiness mode, while reviewer approval remains a separate workflow state. There is no commencement/applicability solver, source fetcher, OCR, semantic model, automated legal assessment, durable publication queue or document-system write adapter. Findings and applicability reasoning are supplied manually; review-task plans are computed views and publication remains future work. The synchronous SQLite implementation is for a local prototype, not a distributed production service.

Validation: **41 focused tests pass**, covering evidence failures, no-impact approval gates, scope and lifecycle separation, assessment review/invalidation, access boundaries, cache invalidation inputs, revision conflicts, restart persistence, future-schema rejection, corrected evidence, executed-document routing, forged sessions/roles, access revocation, session expiry, provider failures and input mutation during asynchronous authentication. The synthetic demo also completed. App lint/build were not run for this standalone module because application code and dependencies were unchanged and Bun/node_modules were unavailable. Next integration work should connect the service boundary to a selected identity provider and authoritative permission store, and obtain a legally reviewed assertion pack, followed by measured retrieval and evaluation of the manually reviewed assessment workflow.

## Proposed product and architecture

Everything in this section is a target design. Begin with one maintained legal workflow and prove the full lifecycle before expanding instrument or jurisdiction coverage.

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

For example, a verified breach-escalation change should generate connected review tasks for a service-agreement template, the incident checklist, the staff playbook and related training. Each gets the appropriate owner and revision; closure records what was actually updated, what remains blocked and which versions were assessed. This is a proposed acceptance scenario, not a claim that the current prototype performs it.

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
