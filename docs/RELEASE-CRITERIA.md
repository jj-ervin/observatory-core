# Observatory Core release criteria and v1 gap assessment

Baseline: merged `origin/main` `2f3974d6123087f8ad69ec76705d76c773b61f7e`, reviewed 2026-11-26. Target: **private** OC-A01 SDK and OC-A02 CLI v1.0.0. This is an assessment, not release approval.

| Gate | Required evidence | Baseline finding |
| --- | --- | --- |
| Function and compatibility | Node/schema suites, source-to-candidate and independent non-GC package fixture; GC publication v1, `gc.discovery/1` and `oc.research.v1` regressions | Source tests and local Portal-style fixture exist; package fixture/full matrix absent |
| Contracts/distribution | Supported SDK exports, errors and versions; pinned private install; reproducible integrity-checked artifact | Private `0.1.4`, files `src`; no top-level stable exports or v1 artifact |
| CLI | SDK-backed commands, help/errors, parity and clean install | Only legacy GC publication scripts |
| Security/operations | Independent egress/access review; hostile input and failure tests; backup/restore/migration proof; supported OS/Node matrix | `OC-08C-EGRESS-SECURITY-GATE.md` says not production approved; `OC-06-assurance-gates.md` lists open gates; CI uses Ubuntu/Node 24/Python 3.12 |
| Rights/identity | Maintainer-approved owner, license, source/data rights, private distribution and namespace decision | Public repository has no license file or GitHub license metadata; private package uses GC namespace; no authorization to infer OSS or publisher rights |
| Governance/assurance | CRA report for candidate, applicable GC conformance evidence, optional time.loc contract checks where used, recorded risks/release decision | No candidate-specific CRA or GC conformance evidence in this repo; WFQ facility adoption is not a release prerequisite |
| Release | Pinned SDK/CLI v1.0.0 artifacts, checksums, changelog, install/rollback proof and authorized private record | No v1 artifacts or release record |

No gate closes merely because a module or test exists. Open [PR #40](https://github.com/jj-ervin/observatory-core/pull/40) is an earlier readiness proposal with stale `0.1.0` text. Open [PR #3](https://github.com/jj-ervin/observatory-core/pull/3) has publication invariant tests to evaluate against current main. Neither is merged evidence.

Every applicable gate must pass on one pinned candidate, with independent review where specified and an authorized release decision. A03–A05 have later acceptance in the asset register and roadmap and are outside this v1 target.
