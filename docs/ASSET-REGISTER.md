# OC-PD-001 — Deliverable asset register

**Implemented** means source exists; **verified** means a named check passed on a pinned commit; **planned** means no qualifying implementation; **released** requires all release gates. An implemented prototype is not a released asset.

| Asset | Baseline status | Measurable acceptance | Evidence and gap |
| --- | --- | --- | --- |
| OC-A01 Observatory Core SDK | Implemented modules; v1 not released | Supported imports/versioned contracts; clean install of pinned private artifact in independent non-GC fixture; provenance and GC v1 compatibility tests; M01–M04 gates | `src/core/`, `src/research/`, `src/discovery/`, `schemas/core/`, `test/`; private `0.1.4` root imports and independent package fixture passed in #46/#47; final stability/release gates open |
| OC-A02 Observatory CLI | Candidate implemented; CI pending | Pinned private CLI install; SDK-backed research/evidence commands with stable help/errors; offline fixture and SDK parity tests | `src/cli.mjs`, `test/cli.test.mjs`, `docs/CLI.md`; legacy scripts retained |
| OC-A03 Observatory API | Planned | Authenticated host context; bounded versioned SDK-backed operations; denial, audit, integration and threat tests | JSON transport is in-process, not an HTTP service |
| OC-A04 Observatory MCP | Planned | Versioned least-privilege SDK-backed tools; host auth/scope/audit; protocol and prompt-injection tests | Research integration contract is in-process, not an MCP server |
| OC-A05 Observatory Container | Planned | Reproducible pinned image; non-root runtime; external secrets; health checks, scan and rollback proof; SDK-backed service | No Dockerfile or image evidence |

All assets require documented ownership, rights and distribution decisions before release. A03–A05 are outside this objective's implementation scope.
