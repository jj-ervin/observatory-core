# OC-PD-001 — Deliverable asset register

**Implemented** means source exists; **verified** means a named check passed on a pinned commit; **planned** means no qualifying implementation; **released** requires all release gates. An implemented prototype is not a released asset.

| Asset | Baseline status | Measurable acceptance | Evidence and gap |
| --- | --- | --- | --- |
| OC-A01 Observatory Core SDK | Implemented modules; v1 not released | Supported imports/versioned contracts; clean install of pinned private artifact in independent non-GC fixture; provenance and GC v1 compatibility tests; M01–M04 gates | `src/core/`, `src/research/`, `src/discovery/`, `schemas/core/`, `test/`; private `0.1.4` root imports and independent package fixture passed in #46/#47; final stability/release gates open |
| OC-A02 Observatory CLI | Candidate implemented; CI pending | Pinned private CLI install; SDK-backed research/evidence commands with stable help/errors; offline fixture and SDK parity tests | `src/cli.mjs`, `test/cli.test.mjs`, `docs/CLI.md`; legacy scripts retained |
| OC-A03 Observatory API | Workspace HTTP candidate; CI pending | Authenticated host context; bounded versioned SDK-backed operations; denial, audit, integration and threat tests | src/api/; schemas/api/v1/openapi.json; docs/API.md; private testing and production gates remain |
| OC-A04 Observatory MCP | Local stdio candidate; CI pending | Versioned least-privilege SDK-backed tools; host auth/scope/audit; protocol and prompt-injection tests | src/mcp/; docs/MCP.md; installed subprocess fixture; host interoperability and independent review remain |
| OC-A05 Observatory Container | Offline Linux candidate; CI pending | Reproducible pinned image; non-root runtime; external secrets; health checks, scan and rollback proof; SDK-backed service | Dockerfile; compose.yaml; scripts/verify-container.sh; docs/CONTAINER.md; image retention and review pending |

All assets require documented ownership, rights and distribution decisions before release. Each asset has a candidate implementation; verification and release decisions remain separate.
