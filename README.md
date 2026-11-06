# Observatory Core

Independent, evidence-first research, observation and provenance infrastructure. Governance Commons is an initial consumer, **not** the engine's architectural owner.

**Current status:** research, ingestion, storage, access-audit and integration modules exist with automated tests. The most recent `main` CI run passed at commit `cd6f7dc` (2026-10-22 UTC). This is **not** a claim of production readiness, live Portal integration, autonomous polling, or a published package.

## What exists

- Versioned domain-neutral core schemas; in-memory, experimental file-backed and SQLite storage.
- Feed parsing/retrieval and bounded HTTPS transport; egress security and unattended operation remain release gates.
- SQLite research archive, references, search and citation verification.
- Scoped read-only research tools, governed access callbacks and auditable SQLite access records.
- Versioned research integration contracts, validated JSON transport and a synthetic Portal-style end-to-end fixture.
- Legacy Governance Commons v1 publication validation and deterministic, SHA-256-pinned export preparation.

See [OC-REL-01 readiness and acceptance gates](docs/OC-REL-01-readiness.md) for verified paths, limits and the external-consumer milestone. Historical roadmap documents describe proposals from earlier development stages and are not the current implementation inventory.

## Commands

Requires Node.js 24 for the current CI baseline. Python 3.12 is used for core schema tests.

- `npm test` — Node contract, integration and security regression tests
- `python -m pip install -r requirements-schema-test.txt` — schema test dependency
- `python -m unittest discover -s tests -p 'test_core_schema.py'` — schema conformance
- `npm run validate:export -- manifest.json records.json` — validate legacy GC publication v1 artifact
- `npm run prepare:publication` — legacy GC publication preparation CLI (see `scripts/prepare-publication.mjs` for arguments)

## Boundaries and safety

Core owns evidence, provenance, observations, retrieval and **publication candidates**. Host applications own identities, permissions, source policy, human approval, model credentials, distribution and UI. The GC publication contract's approval fields are metadata, **not authenticated proof** of approval. Do not commit private source material or promote documentation-only fixtures to verified benchmark evidence.

Package metadata currently remains `@governancecommons/observatory-core`, version `0.1.0`, `private: true` for compatibility pending an explicit distribution and package-name decision. No independent release has been declared.
