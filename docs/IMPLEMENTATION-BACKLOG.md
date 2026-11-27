# OC-PD-001 — Implementation backlog

These product work items map to approved milestones. Existing issues and historical OC notes retain execution detail. Status does not imply release.

| Work item | Status | Milestone/asset | Done when |
| --- | --- | --- | --- |
| OC-SM-001 structured scholarly metadata, [issue #42](https://github.com/jj-ervin/observatory-core/issues/42) | merged; PR CI passed ([#44](https://github.com/jj-ervin/observatory-core/pull/44)) | M01/A01 | Supplied DOI, ordered authors/IDs, date/precision, venue, abstract, type, access and retraction metadata retained; unknowns remain unknown; duplicate merge, persistence and backward compatibility tests pass; ProPro/Gen-B field contract documented |
| Publication invariants originally proposed in [PR #3](https://github.com/jj-ervin/observatory-core/pull/3) | superseded by merged #45; CI passed | M01–M02/A01 | Evaluate on current main; preserve GC v1; merge or supersede through review |
| Readiness overlap in [PR #40](https://github.com/jj-ervin/observatory-core/pull/40) | superseded in merged #45; old draft retained | M02/A01 | Canonical README and release criteria from #43 plus retained external-consumer acceptance details; close old draft only after review |
| Stable SDK imports and non-GC package fixture | merged #46/#47; Linux/Windows package CI passed | M02–M04/A01 | Document/test public paths, errors, pinned private install and provenance round trip |
| Egress, access, storage and recovery assurance | #50–#52 merged; independent remediation confirmation and deployment gates open | M03/A01 | OC-08C and OC-06 gates, threat/retention/rights review, failure evidence and environment matrix |
| License, ownership, package identity and distribution | owner/proprietary/private audience approved; standalone name and notice candidate; remaining rights/channel review open | M04/A01 | Maintainer records rights/publisher/namespace authorization; artifact verified without premature version change |
| SDK-backed CLI | merged #48; Linux/Windows CI passed | M05/A02 | Commands, help/errors, parity, offline fixture and install tests pass |
| Private SDK/CLI release assurance | RC1 merged #53/#54; combined CI passed; CRA pilot blocked pending adjudication | M06/A01–A02 | CRA, applicable GC conformance, pinned artifacts, release criteria and authorization complete |
| Research API | planned | M07/A03 | Asset register API criteria met in separate scope |
| MCP server | planned | M08/A04 | Asset register MCP criteria met in separate scope |
| Container | planned | M09/A05 | Asset register container criteria met in separate scope |

Merged baselines verified by GitHub PR state: Observatory Core [#41](https://github.com/jj-ervin/observatory-core/pull/41), Project Portal [#11](https://github.com/jj-ervin/project-portal/pull/11), Gen-B [#4](https://github.com/jj-ervin/gen-b/pull/4) and [#5](https://github.com/jj-ervin/gen-b/pull/5). Downstream merges are integration activity, not release readiness. Separate local OpenAlex commit `82668ac` is not in merged main and is excluded here.
