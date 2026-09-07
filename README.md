# L.A.R.P. — Localised Amendment Resilience Platform

L.A.R.P. helps law firms identify legal assumptions affected by regulatory change, understand their consequences and coordinate lawyer-approved updates across the documents and processes that depend on them.

Team L.A.R.P. achieved **Top 2 under Rajah & Tann Asia’s problem statement at SMU LIT Hackathon 2026**. The platform’s development now focuses on sustainable, resilient legal operations: maintaining institutional knowledge, preserving professional judgment and delivering traceable updates.

[Project submission](https://devpost.com/software/l-a-r-p-oc08f9) · [Development repository](https://github.com/ch0002ic-cell/larp-draft)

## Purpose and challenge alignment

The team’s account of Rajah & Tann Asia’s challenge, **“Designing a Sustainable and Resilient LegalTech,”** centres on three connected outcomes:

1. **Identify affected work.** Discover citations and underlying legal dependencies across permitted firm materials.
2. **Explain the effect.** Connect the relevant legal source, applicability, document evidence and proposed action.
3. **Propagate approved updates.** Coordinate revisions across templates, drafts, checklists, playbooks, advisories, training and controls, with accountable owners and publication records.

Operational resilience, efficient resource use, sustainable legal work and ethical technology governance guide each stage. Legal approval remains a professional decision; publication requires explicit authority and verified evidence.

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

## Legal research programme

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

SSO also lists **S 580/2026, Personal Data Protection (Amendment No. 2) Regulations 2026**, under 31 August 2026 in its [2026 supplement index](https://sso.agc.gov.sg/Browse/sl-supp/published/2026?PageSize=20&SortBy=number&SortOrder=DESC). Include its operative text and commencement in the reviewer-approved source pack before adding corresponding obligations.

## Platform architecture

| Component | Responsibility |
| --- | --- |
| Web application | Regulatory workspaces, document library, research intake and document review. Built with Next.js, React and TypeScript. |
| Evidence ledger | Versioned sources, assertions, artefacts, dependencies, assessments, decisions and audit events. Implemented in `resilience-core/` with Node.js and SQLite. |
| Document processing | UTF-8 text, PDF page text, DOCX package text and opt-in English OCR for PNG images and PDF pages. |
| Dependency discovery | Phrase matching, proximity matching and instrument/section-reference retrieval with exact evidence spans. |
| Identity and access | Microsoft Entra ID token validation, delegated Graph access and configured role/matter memberships. |
| Document integration | SharePoint imports from approved folders, version checks, reviewed text publication and destination verification. |
| Review console | Evidence selection, scoped assessment authoring, reviewer decisions, proposed revisions, owner decisions, publication and reconciliation. |
| Recovery | Durable publication records, bounded retries, destination reconciliation and verified database backup/restore. |

The maintenance service and its review console are separate from the web application. Microsoft integration is implemented and covered by simulated-provider tests; tenant acceptance forms a delivery milestone.

### Evidence and approval model

Each source carries its jurisdiction, provision, lifecycle, effective date, retrieval time and content hash. A reviewer records an assertion’s interpretation, applicability, exceptions and exact supporting source span. Artefacts retain immutable versions and an explicit extraction inventory.

Candidate dependencies require review before confirmation. Assessments are scoped to an assertion and artefact segment. The review console supports passage selection, findings, applicability reasoning, evidence investigations and explicit context confirmation; each saved version requires its own reviewer decision. A no-impact decision requires complete supplied evidence and context; extraction failures require investigation. New source or artefact versions trigger renewed review while preserving decision history.

Change sets pin assessment decisions, document versions, owners and publication targets. Both legal and owner approval are required. Publication supports complete single-segment text artefacts; executed agreements follow a legal variation process, and automated controls require their own release process.

Every destination write checks the expected version and content hash. Publication receipts record the resulting version. Interrupted acknowledgements require destination reconciliation. Rollback is a separately assessed and approved change set.

### Document processing and discovery

[Document extraction](resilience-core/document-extraction.mjs) records the original byte hash and processor version. Evidence offsets refer to stored extracted text. PDF processing uses [PDF.js](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html); DOCX processing uses [yauzl](https://github.com/thejoshwolfe/yauzl) and [saxes](https://github.com/lddubeau/saxes). Reviewers inspect layout, annotations, embedded material and revision meaning before approving conclusions.

Set `ocr: true` on an import to enable English [Tesseract.js](https://github.com/naptha/tesseract.js) transcription. OCR provenance includes the engine version, model hash, dimensions and recognition confidence. Transcription and legal assessment are separate review stages.

Processing budgets are 1 MiB input, 2 MiB extracted output, 200 PDF pages, 256 DOCX package entries and 8 MiB package expansion. OCR processes up to three images/pages with five million pixels per image. The parser deadline is 10 seconds, or 30 seconds with OCR enabled. Exceeding a budget records an extraction failure for reviewer action.

Discovery supports `mode: "phrases"` and `mode: "hybrid"`. Hybrid retrieval combines whitespace-tolerant phrases, query terms within eight words and instrument aliases near explicit section references. Results include exact evidence and matching strategies. Search budgets and extraction inventories accompany results so reviewers can assess coverage.

## Configuration and development

### Web application

Install the declared dependencies, configure the environment using [the template](.env.example), then start the application:

```bash
bun install
bun run dev
```

| Setting | Purpose |
| --- | --- |
| `R2_ENDPOINT`, `R2_BUCKET_NAME` | Approved document-storage endpoint and bucket. |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Server credentials with the required read/write permissions. |
| `R2_CONTRACT_PREFIX` | Contract-object prefix; default `Contracts/`. |
| `R2_CONTRACT_MANIFEST` | Optional contract metadata manifest. |
| `REGULATION_SYNC_SECRET` | Authorises catalogue synchronisation. |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | Configures hosted research and review. |
| `REVIEW_PARAGRAPH_LIMIT` | Configures the contract-analysis window. |
| `REVIEW_CACHE_HIT_MIN_MS`, `REVIEW_CACHE_HIT_MAX_MS` | Review-response timing controls; use `0` for both in operational environments. |

Store credentials in the approved secret store or an untracked environment file. Configure storage permissions for both reads and persisted review results. Catalogue synchronisation obtains records from Singapore Statutes Online and observes the configured 03:00–07:00 Singapore-time access window. Detailed comparisons require both official source snapshots and successful result persistence.

```bash
bun run lint
bun run build
bun run start
```

### Maintenance service and review console

Use Node.js 22.16 or later; validation uses Node.js 22.23.2.

```bash
npm ci --prefix resilience-core --ignore-scripts
npm test --prefix resilience-core
```

Configure Microsoft integration using [the configuration template](resilience-core/microsoft.example.json):

1. Register the single-tenant API and its delegated scope, and specify permitted calling applications.
2. Obtain administrator consent for the approved Graph permissions and establish role and matter-access groups.
3. Configure approved SharePoint drive/folder pairs and exact HTTPS transfer hosts.
4. Set `LARP_MICROSOFT_CONFIG`, `LARP_LEDGER_PATH`, `LARP_ENTRA_CLIENT_SECRET` and a short-lived delegated API token in `LARP_ACCESS_TOKEN`.
5. Validate configuration and start the review console:

```bash
node resilience-core/microsoft-cli.mjs check-config
npm run review --prefix resilience-core
```

The console listens on `http://127.0.0.1:4173` and operates as the configured token holder. Select **Assess document evidence** to prepare and review an assessment, then create a proposed text revision from an approved actionable finding. Use a protected operator session. Microsoft access is rechecked for each operation, and credentials remain on the server. Browser sign-in and multi-user deployment are planned delivery milestones.

The [operator CLI](resilience-core/microsoft-cli.mjs) accepts JSON on standard input:

| Command | Input |
| --- | --- |
| `execute` | `{ "operation": "list", "args": ["artefact"] }`, or another authorised domain operation. |
| `import` | Artefact metadata, expected version and an approved SharePoint target containing matter, drive, folder and item identifiers. |
| `publish` | `{ "jobId": "PUBLICATION_RECORD_ID" }` following legal and owner approval. |
| `reconcile` | `{ "jobId": "PUBLICATION_RECORD_ID", "reason": "Documented destination review" }`. |

Microsoft integration uses [on-behalf-of delegation](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-on-behalf-of-flow), [token validation](https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens), [group membership](https://learn.microsoft.com/en-us/graph/api/user-list-transitivememberof?view=graph-rest-1.0) and [version-conditional upload sessions](https://learn.microsoft.com/en-us/graph/api/driveitem-createuploadsession?view=graph-rest-1.0).

## Routes and services

| Surface | Purpose |
| --- | --- |
| `/` | Regulatory workspace and reviewed research intake. |
| `/regulations/pdpa`, `/regulations/wfa` | Selected legal research workspaces. |
| `/regulations/new` | Legal-change research and confirmation. |
| `/contracts`, `/contracts/[...key]` | Document library and review workbench. |
| `/resilience` | Dependency and history visualisation. |
| `/files`, `/review/[docId]`, `/review/[docId]/final` | Historical demonstration workflow. |
| `/api/contracts`, `/api/contracts/[...key]` | Document listing and source access. |
| `/api/contracts/review` | Hosted document review and persisted results. |
| `/api/regulations` | Catalogue retrieval and annotations. |
| `/api/regulations/sync` | Authorised source synchronisation. |
| `/api/regulations/[id]/comparison` | Saved and generated source comparisons. |
| `/api/regulations/discover`, `/api/regulations/intake` | Research generation and saved intake. |

The maintenance service exposes versioned ingestion, source/assertion registration, discovery, dependency review, assessments, coverage, change sets and approval operations. Worker-only publication functions remain behind the authenticated integration boundary.

## Governance and sustainable operation

- **Professional accountability:** Attribute interpretations, approvals and ownership decisions to authorised people.
- **Confidentiality:** Apply matter access, least-privilege credentials, approved processing destinations and protected storage.
- **Source governance:** Record authoritative provenance, permitted acquisition methods, jurisdiction, commencement and review dates.
- **Reliability:** Preserve immutable evidence, transactionally record decisions and verify publication acknowledgements.
- **Resource efficiency:** Use bounded extraction and deterministic retrieval; measure compute, storage and reviewer effort before selecting additional model services.
- **Release assurance:** Validate retention, deletion, concurrent access, recovery objectives and operational monitoring before a client-data pilot.

Entra roles currently apply across a user’s permitted matters. SharePoint access verification includes retained document versions. Access changes can withhold the associated matter pending authorised review. Database schema 2 uses append-only records, decisions and audit events; backup and restore verify integrity, foreign keys and record hashes.

## Validation and delivery programme

Automated assurance covers evidence anchoring, access boundaries, document processing, publication approvals, revision conflicts, recovery and browser interaction. The [CI workflow](.github/workflows/resilience-core.yml) runs the maintenance tests and synthetic workflow evaluations.

```bash
npx --prefix resilience-core playwright install chromium
npm run test:browser --prefix resilience-core
npm run demo --prefix resilience-core
npm run demo:formats --prefix resilience-core
npm run evaluate --prefix resilience-core
npm run evaluate --prefix resilience-core -- --mode hybrid
```

Test fixtures are isolated from the operational console. The ten-case synthetic retrieval benchmark reports 4/6 dependency recall and 4/6 candidate precision for both phrase and hybrid modes. Pilot acceptance will use a separately adjudicated corpus with document-family separation, severe-miss analysis, reviewer-effort measurements and recorded processing coverage.

| Milestone | Acceptance evidence |
| --- | --- |
| Microsoft tenant integration | Approved application configuration, consent, group mappings and tested access/revocation behaviour. |
| Legal rule pack | Named reviewer, approved corpus, source versions, applicability, exceptions and recorded assertions. |
| Extraction and retrieval | Representative-format evaluation, reviewed OCR output and comparative semantic-retrieval assessment. |
| Source maintenance | Approved feeds, provision-level commencement/transition reasoning and recurring discovery. |
| Product integration | Browser sign-in, document-import authoring, multi-item change preparation and accessibility validation; assessment authoring and single-document change preparation are implemented. |
| Production operations | Approved deployment, protected data lifecycle, load testing, monitoring and recovery exercises. |
| Supervised pilot | Measured finding quality, reviewer effort, propagation completeness and resource use against the firm’s baseline. |

The team has selected Entra ID and SharePoint and will provide reviewer and corpus details. Use [the review-pack template](resilience-core/review-pack.example.json) to prepare the pilot evidence. Tenant configuration, reviewer validation and production acceptance remain prerequisites for client-data operation.

## Research corpus and historical assets

Historical PDFs, corpus JSON and whiteboard assets preserve the platform’s research and design provenance. Treat legal examples as research material requiring source verification and qualified review before operational use. Corpus permissions, redaction and permitted processing destinations must be established before ingestion. Keep unredacted personal documents and confidential matter material out of public repositories and demonstrations.

The research programme evaluates source maintenance, knowledge-management integration, document comparison, legal interpretation and reviewed propagation as distinct capabilities. Reassess legal status and provider terms when approving a rule pack. Link supporting evidence to each material product or legal assertion and update the relevant entry when the evidence changes.

## Engineering conventions

The root README is the project’s single maintained Markdown document. Maintain product direction, architecture, configuration and delivery milestones here. Keep executable fixtures in the test harness and runtime configuration outside version control.

Development takes place in `larp-Ric`. Publish reviewed, tested changes to `ch0002ic-cell/larp-draft` on `main`, using the `draft` remote. Preserve repository history and review the destination before publishing. Run appropriate tests, lint and build checks for changed components.
