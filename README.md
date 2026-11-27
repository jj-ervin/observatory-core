# Observatory Core

Asset-oriented research and evidence infrastructure. The Observatory Core SDK is the canonical engine; CLI candidate and planned API, MCP and container assets consume it. Governance Commons is an optional specification source and consumer, not a governing authority or application dependency.

**Status:** private Node ESM package `observatory-core` at `1.2.0` (private-testing candidate; no public or production release claimed). API, MCP and container assets are planned. Existing GC publication scripts remain legacy utilities. The SDK-backed Observatory CLI candidate is documented below.

## Ownership and distribution

Copyright (c) 2026 Osprey Strategic Holdings LLC. All rights reserved. Proprietary software; see [LICENSE](LICENSE). The approved strategy is private testing followed by a separately authorized public release. Public source visibility does not grant an open-source license. No registry publication or public release is authorized by this notice. See [private testing instructions](docs/PRIVATE-TESTING.md).

## Product baseline

- [Charter](docs/PRODUCT-CHARTER.md), [asset register](docs/ASSET-REGISTER.md), [architecture](docs/ARCHITECTURE.md), [roadmap](docs/ROADMAP.md)
- [Release criteria and v1 gaps](docs/RELEASE-CRITERIA.md), [implementation backlog](docs/IMPLEMENTATION-BACKLOG.md), [changelog](CHANGELOG.md)

Historical `docs/OC-*` notes retain their proposal and experiment status; the current baseline governs asset and milestone mapping.

## Implemented modules

- Domain-neutral records and in-memory, file and SQLite stores (`schemas/core/`, `src/core/`). Operational assurance remains open.
- Feed ingestion, bounded transport, and `gc.discovery/1` newsroom intake (`src/ingestion/`, `src/discovery/newsroom.mjs`). Egress and unattended polling are not production approved. Newsroom supports RSS/Atom, OpenAlex, Brave and supplied briefing JSON; saved pulls retain the first discovery date.
- SQLite research archive, references, search, scoped and governed read-only tools, access audit, and in-process/JSON integration (`src/research/`). A local Portal-style fixture does not prove deployed tenant authorization.
- Legacy GC publication validation and deterministic candidate preparation (`src/contract.mjs`, `src/publish.mjs`, `scripts/`). Approval fields do not authenticate an approver.

## SDK package candidate

See [SDK package candidate](docs/SDK-PACKAGE.md) for root imports and independent offline installation. The candidate is intended for controlled private testing only.

## Observatory CLI candidate

See [CLI usage](docs/CLI.md) for installed commands, local discovery, evidence, research search and publication validation.

## Development checks

Use Node.js 24 and Python 3.12, matching CI:

```text
npm test
npm run build
npm run test:package
python -m pip install -r requirements-schema-test.txt
python -m unittest discover -s tests -p test_core_schema.py
```

`npm run validate:export -- manifest.json records.json` validates a legacy GC export. `npm run prepare:publication` runs its legacy candidate utility. Neither grants release authority.

Consumers own identity, access policy, editorial approval, source rights, model credentials, deployment and public release. Core preserves evidence, provenance and exact candidate bytes without asserting truth or authorization. Never commit private Dossier or Roster data or treat documentation-only records as benchmark evidence.

## Observatory API candidate

See [API usage](docs/API.md) for the authenticated loopback research and evidence service. Private testing only; no remote or production deployment approval.

## Observatory MCP candidate

See [MCP usage](docs/MCP.md) for the local, read-only, host-scoped stdio server. Private testing only.
