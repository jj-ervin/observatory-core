# OC-PD-001 — Product charter

Status: approved product direction; delivery gates remain open. Baseline: merged `origin/main` at `2f3974d6123087f8ad69ec76705d76c773b61f7e` (2026-11-26 review).

## Goal and users

Observatory Core supplies reusable research and evidence infrastructure for applications needing traceable discovery, capture, retrieval, verification records and integrity-checkable publication candidates. The approved strategy is private testing of SDK and CLI v1.0.0, followed by a separately approved public release. Project Portal and Gen-B are downstream consumers and validation environments, not product authorities.

## Assets and authority

OC-A01 SDK is the canonical engine. OC-A02 CLI, OC-A03 API, OC-A04 MCP and OC-A05 Container consume SDK capabilities without duplicating validation, storage, provenance or publication logic. Core owns records, provenance, retrieval, verification procedure results, change records and candidate preparation. Hosts own authentication, authorization, editorial review, source rights, tenant isolation, publication and deployment. Evidence does not establish truth; a digest proves exact bytes, not approval or source authenticity.

Preserve GC publication v1, `gc.discovery/1` and existing research contracts while adding versioned neutral contracts. Do not infer redistribution rights from a public repository or package name. This charter is a product baseline, not a new GC PASS or authorization system. Governance Commons is an optional integration specification source; adoption of its governance framework or WFQ is not a prerequisite. See [architecture](ARCHITECTURE.md).

## Ownership decision

Maintainer approved Osprey Strategic Holdings LLC as owner and proprietary licensing for private SDK/CLI distribution on 2026-11-27 (conversation approval). The package remains `private: true`, `UNLICENSED`, with the standalone private package name `observatory-core`. Distribution is restricted to separately authorized recipients; repository visibility, source/data rights and final release approval remain separate matters. This notice records the decision, not an independently verified IP assignment or third-party rights clearance.
