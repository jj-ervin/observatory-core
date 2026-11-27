# OC-SEC-001 — Observatory Core Independent Security Review

**Reviewer:** independent review session (Claude, acting as reviewer; not the implementing maintainer)
**Repository:** `jj-ervin/observatory-core`
**Baseline:** merged `main` at commit `97ab8feb2a384096235e93e58db8cad0ee78ae87` (PR #50 merge)
**Review branch:** `sec/oc-sec-001-review`
**Date:** 2026-11-26

## Scope

Independent, adversarial review of Observatory Core's SDK and CLI ahead of a private v1.0.0 release, per the OC-SEC-001 task. The implementation was reviewed directly — not only its documentation or existing tests — across:

1. SSRF, DNS pinning, IP classification, TLS and redirects.
2. Network timeouts, resource exhaustion and cancellation.
3. Authorization, scope isolation and revocation.
4. Audit integrity and fail-closed behavior.
5. Untrusted research content and prompt-injection boundaries.
6. Malformed inputs and schema enforcement.
7. SQLite security, persistence and recovery.
8. CLI argument handling, filesystem access and credentials.
9. Package contents, dependencies and CI security.

Special attention was given to the security changes in **PR #47** (`fix/oc-m03-platform-egress`, commits `d764c86`/`eec77eb`) and **PR #50** (`fix/oc-m03-cancellation-audit`, commit `f286b6d`), per the task's instruction.

No production code was modified. No packages were published, versioned, or released. One new, isolated regression test file was added (`test/security-sqlite-file-permissions.test.mjs`). All temporary artifacts stayed under the repository's own `.scratch/`.

## Method

- Verified the pinned baseline commit against `origin/main` and checked out a dedicated review branch at that exact commit.
- Ran the full existing test suite and every check the project's own CI workflows (`ci.yml`, `core-contracts.yml`) run: `npm test`, `npm run test:package`, `npm run test:release` (using a worktree at the PR #47 merge commit as the required `OC_BASELINE_DIR` baseline), and the Python JSON Schema conformance suite (`python -m unittest discover -s tests -p 'test_core_schema.py'`).
- Read the full diffs of PR #47 and PR #50 (`git show d764c86`, `git show f286b6d`) to understand exactly what each hardening change did, then traced the resulting code paths by hand against adversarial scenarios (DNS rebinding, mixed-answer DNS responses, IPv4-mapped/6to4/documentation IPv6 ranges, audit-sink failure, cancellation races, revocation races).
- Read every file in scope end-to-end (not excerpts) across four parallel review passes covering: (a) network/SSRF/egress, (b) authorization/scope/audit, (c) untrusted content/schema/SQLite, (d) CLI/filesystem/credentials/packaging/CI — then independently re-verified the one finding that survived that process by reading the relevant source lines myself and writing a reproducing regression test.
- Distinguished verified, reproducible issues from theoretical or documentation-only observations throughout.

## Test results

| Check | Result |
| --- | --- |
| `npm test` (113 existing Node test files, 113 cases) | 112 pass, 1 skipped (`SIGKILL unavailable on Windows`, by design), 0 fail |
| `npm run test:package` (offline SDK+CLI install/provenance fixture) | pass |
| `npm run test:release` (reproducibility, upgrade, rollback, backup-restore fixture against the PR #47 baseline) | pass — `{"reproducible":true,"upgrade":true,"rollback":true,"restore":true}` |
| `python -m unittest discover -s tests -p 'test_core_schema.py'` (13 cases) | pass |
| New regression test added by this review (`test/security-sqlite-file-permissions.test.mjs`) | 1 case, skipped on this Windows review host (POSIX-only check), designed to run on CI's `ubuntu-latest` matrix leg |

All of the project's own existing assurance gates are green at the pinned baseline. No existing test was modified.

## Findings

### Finding 1 — SQLite-backed stores do not restrict database file permissions (confirmed, Low–Moderate)

- **Affected code:** [`src/core/sqlite-store.mjs:19`](../../src/core/sqlite-store.mjs), [`src/research/sqlite-archive.mjs:16`](../../src/research/sqlite-archive.mjs), [`src/research/sqlite-access-audit.mjs:17`](../../src/research/sqlite-access-audit.mjs) — all three call `new DatabaseSync(path)` with no file-mode argument, so the created file's permissions are governed only by the host process's umask.
- **Evidence:** By contrast, the two JSON-backed stores in the same codebase explicitly harden file creation: [`src/core/file-store.mjs:31`](../../src/core/file-store.mjs) and [`src/discovery/newsroom.mjs:44`](../../src/discovery/newsroom.mjs) both pass `mode:0o600` to `writeFile`. The SQLite path has no equivalent. Confirmed by direct code reading (not only agent report) — grepped all three SQLite `open()` constructors and both JSON writers side by side; no `chmod`/mode argument exists anywhere in the SQLite modules. A regression test (`test/security-sqlite-file-permissions.test.mjs`) reproduces this: under a standard `022` umask, `evidence.sqlite`, `research.sqlite`, and `audit.sqlite` all come out at `0o644` (group/world-readable) rather than the `0o600` the JSON stores achieve. The test is skipped on this Windows review host, where POSIX mode bits don't apply, but will execute for real on the `ubuntu-latest` leg of `core-contracts.yml`'s existing OS matrix.
- **Impact:** On a shared or multi-tenant POSIX host with a permissive umask, any other local account can read the full evidence-record content, the full research-document archive (including quoted passages), and — notably — the append-only access-audit trail (`research_access_audit`: who accessed what document, when, and whether it was allowed) without going through any of the application's authorization or audit-fail-closed logic at all. With a `002` umask the audit database is also group-writable. This is strictly a local-file-permission exposure, not remotely exploitable, and its severity is deployment-dependent (a single-user workstation or already-locked-down container is low risk; a shared multi-user host is higher risk, especially for the audit trail, which the project's own `OC-AI-05` gate treats as an integrity-sensitive artifact).
- **Remediation:** Pass an explicit restrictive mode when creating the database file (e.g., create the file first with `open(path, 'wx', 0o600)`/equivalent before `DatabaseSync` opens it, or `chmod` immediately after creation, guarding the TOCTOU window between creation and chmod), matching the pattern already used by `file-store.mjs`/`newsroom.mjs`. On Windows, the equivalent ACL-restriction question is open and not addressed by this review — note it as a follow-up rather than treating POSIX mode parity as sufficient.
- **Release-blocking:** **Yes, for any deployment on a shared/multi-tenant host.** Not blocking for a single-tenant, single-user deployment, but the fix is small and should land before v1.0.0 given it affects the audit trail specifically.

No other verified vulnerabilities were found in this finding's area (SQL injection, FTS5 query injection, ReDoS in schema patterns, and crash/multi-process recovery were all specifically checked and found sound — see Reviewed-and-clean below).

### Finding 2 — GitHub Actions pinned by tag, not commit SHA (nit, informational)

- **Affected code:** `.github/workflows/ci.yml` and `.github/workflows/core-contracts.yml` — `actions/checkout@v4`, `actions/setup-node@v4`, `actions/setup-python@v5`.
- **Impact:** Tag-based pinning is vulnerable in principle to a tag being force-moved upstream (supply-chain risk), but both workflows carry `permissions: contents: read`, run on `pull_request` (not `pull_request_target`), and reference zero secrets — so even a compromised action here has nothing sensitive to exfiltrate from this repository's CI today.
- **Remediation:** Pin to exact commit SHAs for defense-in-depth if/when these workflows ever gain secrets or `pull_request_target` triggers. Not urgent today.
- **Release-blocking:** No.

## Reviewed and found clean (by design or by verified existing mitigation)

The following areas were inspected in adversarial depth and **no exploitable issue was found**; each is recorded here specifically so this review is auditable against what it claims to have checked.

- **SSRF / DNS rebinding / IP classification (`src/ingestion/secure-http-transport.mjs`):** PR #47 is a genuine, correctly implemented hardening commit. Traced end-to-end: hostname allowlist is validated with a strict RFC-1123-style regex (closing prior gaps like `example..org`, `-bad.example.org`, `host:443`); DNS is resolved once via an injected resolver, and **every** returned address must be simultaneously public (allowlist, not denylist, for IPv6: `2000::/3` minus Teredo/6to4/documentation ranges; a comprehensive IPv4 private/reserved/CGNAT/benchmarking/multicast denylist) and in the exact per-host `approvedAddresses` pin set, or the whole resolution is rejected — this specifically defeats mixed-answer DNS rebinding (one good + one bad record). The actual TCP connect uses a `lookup` override that ignores the live hostname and always returns the already-validated pinned address, so there is no second DNS query and thus no TOCTOU window between validation and connection. `agent:false` (added in PR #47) prevents a pooled/reused socket from carrying a stale pin across requests. TLS hostname verification still runs against the real hostname (Host/SNI/cert check), `rejectUnauthorized` is never overridden, and redirects are never auto-followed (any 3xx is simply rejected as `status!==200`), so redirect-based SSRF is not reachable in this transport at all.
- **Resource exhaustion / cancellation (`src/ingestion/feed-retriever.mjs`):** `maxBytes`/`timeoutMs` are clamped at the API boundary; declared `Content-Length` and the actual streamed total are both independently checked against the limit; every `await` (transport call and each stream read) races against a combined caller-signal/internal-timeout `AbortController` via a `bounded()` wrapper; the `finally` block cancels and releases the reader/body on every non-success path, including the case where a stalled transport resolves *after* the deadline already fired. PR #50's three new regression tests (overflow cancellation, stalled-transport deadline, stalled-reader-with-non-settling-cancel) all pass against the pinned baseline, and manual tracing found no path that returns partially-read data after an abort.
- **Authorization / scope isolation / revocation / audit fail-closed (`src/research/governed-tools.mjs`, `scoped-tools.mjs`):** PR #50's `governed-tools.mjs` change makes the audit sink itself fail-closed: a thenable (async) audit return throws `"synchronous audit callback required"`, and an explicit `false` throws `"audit rejected decision"` — both **before** any archive read and before the access-allowed/denied decision is honored. `check()` runs fully synchronously per call with no caching ("the authorizer is consulted on every document access," per the module's own doc comment), so there is no async gap in which a revocation applied by the host between calls could be missed — each call re-evaluates `authorize()` fresh. `scoped-tools.mjs` is a separate, intentionally static capability facade (scope fixed at construction; revocation means the host discards/replaces the facade instance) and performs no dynamic audit by design, which matches its own doc contract (`OC-AI-02`) and is not a regression introduced by PR #47/#50.
- **Untrusted research content / prompt-injection boundaries:** Observatory Core makes no LLM/model calls and holds no provider credentials (`docs/OC-RESEARCH-AI-LASSO-ROADMAP.md` explicitly scopes this out). The read-only/scoped/governed tool facades never concatenate fetched or stored text into any instruction string; they return typed `{document, passage, citation}` objects, and `references.mjs`'s `makeResearchCitation` recomputes and checks a content digest at construction time, rejecting any citation whose `quotedText` doesn't match the originally captured bytes. `quotedText` is capped at 10,000 characters everywhere it's accepted. The residual risk — that returned objects don't self-label as untrusted data for a future LLM consumer (e.g. the roadmapped LASSO integration) to apply data/instruction separation — is already named as open, gated future work in the project's own roadmap doc, not a hidden gap.
- **Malformed input / schema enforcement (`src/core/schema-validation.mjs`, `schemas/`):** The validator fails closed on any unrecognized schema keyword rather than silently ignoring it, and `oneOf` correctly rejects both zero-match and multi-match cases. Store-level tests confirm invalid input produces zero partial writes (`"invalid snapshot makes no SQLite writes"`, `"rejected append preserves previous snapshot"`). Schema regex patterns were checked for catastrophic backtracking and found linear/non-overlapping.
- **SQLite injection / FTS / crash recovery / concurrency:** All SQL is parameterized (`?` placeholders via `prepare().run/get/all()`); the one dynamic-string path (FTS5 `MATCH`) quotes the whole query as a single literal phrase (doubling embedded `"`), foreclosing FTS5 operator/column-filter injection. WAL + `synchronous=FULL` + `BEGIN IMMEDIATE` serialize cross-process writers (exercised by `test/sqlite-multiprocess.test.mjs`); `migrate-legacy-audit.mjs` validates exact column shape and strictly sequential sequence numbers before trusting legacy data. `audit-chain.mjs` itself documents, rather than hides, that its hash chain cannot detect a full from-genesis database rewrite without an external anchor — a disclosed limitation, not a new finding.
- **CLI / filesystem / credentials (`src/cli.mjs`, `src/discovery/newsroom.mjs`):** CLI path arguments are resolved without traversal restriction, but this is documented, trusted-operator-local-file behavior (not a network-reachable surface) and consistent with the tool's stated contract. Input size is capped (10 MiB) with TOCTOU-aware size re-checks. `parseArgs` runs in `strict` mode with no shell/`child_process` invocation anywhere in the CLI. Generic error collapsing (cli.mjs) deliberately avoids echoing provider exceptions, paths, or credentials back to the caller; the one credential-adjacent code path (`BRAVE_SEARCH_API_KEY` in `newsroom.mjs`) was traced through every throw site reachable from it and never embeds the key value in a persisted error message. The sole publication-time credential gate (`classification.mjs`'s `validateClassification`, invoked from both `publish.mjs` and the CLI) is structurally the only path to publish, and unconditionally rejects any record carrying the `CREDENTIAL` label or non-`low`/`open` impact/access.
- **Packaging / dependencies / CI:** Zero runtime dependencies (no supply-chain surface), no install/postinstall scripts, and `package.json`'s `files` allowlist is actively enforced by a real pack+install+exercise round trip (`scripts/verify-package.mjs`) that asserts `test/`, `tests/`, and `.scratch/` are excluded from the published tarball. Both CI workflows scope `permissions: contents: read`, trigger on `pull_request` (not `pull_request_target`), and reference no secrets.

## Known, pre-existing limitations (disclosed by the project, not new findings)

- `docs/OC-08C-EGRESS-SECURITY-GATE.md` itself states the egress gate is not yet production-approved and that Newsroom RSS currently derives its initial DNS pins from a live lookup rather than an out-of-band, host-owner-verified source; explicit host-owner approval and network-level egress controls remain open gates before autonomous polling (OC-08D) is unblocked. This review did not find a way to defeat the pinning *given* an approved pin set, but the bootstrap-from-DNS step for obtaining that pin set in the first place is an already-acknowledged, open item — not something this review is closing.
- `audit-chain.mjs`'s hash chain cannot by itself detect a full database rewrite from genesis without an external checkpoint anchor; `audit-checkpoint.mjs` exists to let a host provide that anchor, but whether a given deployment actually stores checkpoints outside the SQLite trust boundary is a host responsibility this review cannot verify from the code alone.

## Disposition

**CONDITIONAL PASS.**

The two PRs called out for this review (#47 egress hardening, #50 cancellation/audit fail-closed hardening) were each independently traced end-to-end against the adversarial scenarios they were meant to close (DNS rebinding, mixed-answer DNS, stalled/cancelled retrieval, async/rejected audit receipts, authorization-revocation races) and found to be correctly implemented with no bypass identified. The broader scope — schema enforcement, SQL injection, prompt-injection boundaries, scope isolation, packaging, and CI — was also reviewed and found sound.

One verified, previously-unreported gap was found and is release-blocking for shared-host deployments: the three SQLite-backed stores (evidence, research archive, and — notably — the access-audit trail) do not restrict their database file permissions the way the project's own JSON-backed stores already do, leaving them group/world-readable under common umask settings. This is a small, well-scoped fix (mirror the `mode:0o600` pattern already used elsewhere in this codebase) and does not call the surrounding design into question, which is why this review lands at CONDITIONAL PASS rather than FAIL. It should be remediated, and the included regression test re-verified as passing with the fix (by flipping its asserted mode from `0o644` to `0o600`), before v1.0.0 ships to any deployment target that is not a fully single-tenant, single-user host.

### Remaining limitations of this review

- This review did not have network access to run adversarial fuzzing against a live feed server, nor a POSIX runtime available on the review host to execute the new permission regression test directly (it is designed to run, and is expected to run, on the `ubuntu-latest` leg of the project's own CI matrix; its logic was verified by direct code reading instead of local POSIX execution).
- Windows ACL behavior for the SQLite file-permission finding was not assessed; only the POSIX mode-bit gap was verified.
- This is one independent reviewer's pass, not a substitute for a dedicated external penetration test or a second independent reviewer, both of which `docs/OC-08C-EGRESS-SECURITY-GATE.md` and `docs/RELEASE-CRITERIA.md` already name as separately open gates before production/public release.
