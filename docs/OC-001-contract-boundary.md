# OC-001 — Observatory publication contract boundary (2026-10-22)

Status: **audit baseline**. This document records inspected default-branch implementations; it does not claim a deployed or independently authorized publication pipeline.

## Repositories and ownership

| Repository | Existing role | Verified implementation |
| --- | --- | --- |
| `jj-ervin/observatory-core` | Publication producer | `src/contract.mjs`, `src/classification.mjs`, `src/publish.mjs`; tests and Node 24 CI |
| `governancecommons/governance-commons-portal` (private) | Editorial consumer and human authority | `src/intelligence/observatory-import.mjs`, `src/storage/editorial-store.mjs`, `src/workflows/approval-inbox.mjs`; import and editorial transition tests |
| `governancecommons/governance-commons-www` | Public read-only presentation | `site/src/data/observatoryCatalog.ts`, Observatory pages, `scripts/verify-observatory.mjs`, evidence checks |

Core must not import private Portal modules, depend on GC membership or UI, or acquire publication approval authority. GC-specific review and release policy belongs to the consuming application and its protected release gate.

## Existing artifact contract (do not silently change)

Producer `preparePublication` outputs UTF-8 `records.json` and `manifest.json` using `schemaVersion: "1.0.0"`, stable record-ID ordering, newline-terminated pretty JSON, and a SHA-256 hash of **exact records bytes**. Manifest contains publication ID, approval linkage, source commit, methodology version, release timestamp, records URL, digest and count.

Records require source URL, capture time, subject/version, evidence class, evaluator/method/limitations, approval link and a GC–ICQ.01 classification. Only low-impact/open/Q3 records with zero sensitive labels can pass existing public-export validation; measurement classes require extra provenance. Existing fixtures are synthetic, never production approvals.

The private Portal importer **independently validates** the same v1 publication shape but adds tighter boundaries: max manifest 64 KiB, records 10 MiB, 10,000 records, restricted identifiers and bounded fields. Its authenticated local-pilot HTTP import permits only server-configured HTTPS URLs pinned to digests and rejects redirects; accepted records become immutable workspace-scoped `unverified_candidate` records, **not** approved GC articles.

**Important contract discrepancy:** Core currently accepts some identifiers or payload sizes that Portal refuses. A successful Core validation does not guarantee Portal import. Treat the Portal policy as stricter defense in depth; do not weaken it to achieve compatibility. No claim of bidirectional schema equivalence is made.

## Authority and Zero Trust boundary

- A self-reported `approvedBy`, `approvalRecordId`, `publicationStatus` or `releaseVerified` field is data, **not** proof of an authenticated approval.
- Core prepares and validates candidate release bytes; it does not authenticate approvers or publish to live hosting.
- The Portal owns trusted membership, independent revision-bound editorial review, approval decisions and private audit evidence.
- The website release gate must independently verify protected CI, approval authority, immutable artifact digest and public allowlisting before deployment.
- Public Observatory catalog entries remain documentation-only and should not be upgraded to verified/conformance/benchmark claims without source review.

## OC-001 acceptance gates

1. Retain the existing Core valid/invalid publication tests and record bytes determinism.
2. Add explicit boundary tests for exact-byte digests and approval-reference consistency.
3. Before introducing new fields, record Portal's stricter limits as contract tests and prove canonical Core-produced bytes import as candidates into the Portal.
4. Keep Node 24 Core CI, Node 22 Portal tests, website Observatory checks and protected deployment verification independent.
5. Do not change schema v1, package scope, Git history, release workflow, authentication, or production content in this audit PR.

## Prioritized follow-up PRs

- **OC-001B (Portal):** check in a version-pinned Core-produced synthetic artifact fixture and verify acceptance plus rejection cases under Portal's stricter importer; include digest and source commit in fixture provenance.
- **OC-001C (CI):** establish an explicit version-pinned cross-repository compatibility check, without runtime network dependency on mutable `main` branches.
- **OC-002 (Core):** draft optional domain-neutral extension/version contract; preserve v1 consumers and forbid extension fields from overriding core security rules.
- **OC-003 (Portal/WWW):** add authenticated editorial HTTP/UI transitions and protected website release handoff in separately reviewable PRs.
- **OC-004 onward (Core):** add append-only source snapshots, observation/change history and bounded retrieval before broader adapters.

No ingestion pipeline, scheduler, search index, automatic approval, live publication integration or benchmark execution is claimed to exist in Core today.
