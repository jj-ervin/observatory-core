# OC-REL-01 — Independent-engine release readiness (2026-11-06)

Status: **audit and acceptance plan**, not a release announcement. GitHub default branch audited at `cd6f7dc` (2026-10-22 UTC). Local workspace and external consumer deployments were not audited.

## Verified implementation inventory

| Area | Code and tests present | Readiness caveat |
| --- | --- | --- |
| Domain-neutral record schemas | `schemas/core/`, `tests/test_core_schema.py` | Versioning and external consumer interoperability still need proof |
| Storage | `src/core/{store,file-store,sqlite-store}.mjs` and corresponding tests | File storage is experimental; operational durability needs evaluation |
| Ingestion | `src/ingestion/`, feed and secure-HTTP tests | Transport review does not establish permission for unattended polling |
| Research | `src/research/sqlite-archive.mjs`, references, search and citation tests | Production data access, licensing and retention remain consumer concerns |
| Governed tools and audit | scoped/governed research tools, SQLite access audit, hash-chain and checkpoint tests | Host supplies trusted identity, authorization policy and audit configuration |
| Integration | versioned research contract, response validation, JSON transport and Portal-style fixture | Synthetic local fixture is **not** a deployed GC Portal integration |
| Publication | `src/{contract,classification,publish}.mjs`, CLI and tests | Existing v1 export is GC-specific; approval fields are not authenticated authority |

## Package and scope decisions required

- Repository mission: reusable, domain-neutral evidence/research engine, independently useful to non-GC consumers.
- Current `package.json` advertises `@governancecommons/observatory-core` version `0.1.0`, `private: true`. Do **not** rename or publish without a compatibility and distribution decision.
- Preserve current GC-specific `validatePublication` and `preparePublication` v1 behavior. A neutral publication-candidate interface must be versioned and introduced separately.
- Do not conflate the CLI's approved-field checks with authentication, publication permission or live deployment.
- Do not add a dashboard, agent runtime, scheduler, model provider or domain-specific verdicts to Core to satisfy release criteria.

## Existing open work: PR #3

Draft [OC-001 publication boundary PR](https://github.com/jj-ervin/observatory-core/pull/3) introduces three synthetic contract tests: byte-exact SHA-256 pinning, manifest-to-record approval linkage, and classification-to-record approval linkage. Evaluate these tests against current `main`; avoid re-implementing them. Its documentation was written before the storage/ingestion/research integration work now in `main` and must not be merged without refreshing its capability claims. The draft has not been merged or closed by this milestone.

## Acceptance gates

1. **Baseline:** run `npm test`, schema tests and relevant security/integration suites against a clean checkout of the pinned candidate commit; capture CI evidence.
2. **Compatibility:** preserve GC v1 publication byte/validation behavior and evaluate PR #3 invariant coverage.
3. **Neutral consumer:** create a separate fixture outside the core repository or package-boundary sandbox that installs/imports a pinned build, creates and retrieves synthetic evidence with intact provenance, then exercises deterministic candidate output. It must not require GC Portal, Portal Kit, LASSO, model credentials or external network access.
4. **Contracts:** document stable export paths and distinguish internal implementation modules from supported APIs. Test the consumer against those documented imports.
5. **Security:** complete ingestion/egress review and verify read-only tool scope, audit failure behavior and untrusted-source isolation. No autonomous polling approval is implied.
6. **Distribution:** decide independent package identity, license, semver and migration plan before removing `private: true` or tagging a release.
7. **Consumer integration:** cross-repository GC Portal import of exact pinned Core fixture remains a **separate** acceptance gate; a local Portal-like test is not sufficient.
8. **Documentation:** update the top-level README and historical roadmaps to differentiate implemented modules, tested prototypes, proposed work and live operations.

## Deferred intentionally

An Observatory dashboard, Cockpit GUI integration, provider-neutral model gateway, LASSO orchestration, scheduled polling, and production publication are separate future workstreams. Keep UI, user policy, editorial approval and domain decisions outside the engine.

## Exit criteria

A pinned independent candidate passes tests, has a published supported API boundary, demonstrates one non-GC consumer fixture, and documents known security/operational limitations. Only then evaluate release tagging; no release is authorized by this document.
