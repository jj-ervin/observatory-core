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

## Independent consumer acceptance (carried forward from PR #40)

Install a pinned SDK artifact in an isolated non-GC consumer outside the source tree; create and retrieve synthetic evidence with provenance intact and exercise deterministic publication candidate output. No GC Portal, Portal Kit, LASSO, model credentials or runtime network dependency is allowed in this fixture. Separately verify GC Portal's stricter importer with pinned exact-byte artifacts. Preserve existing package name/private status until ownership and distribution are authorized. These are open gates, not passed checks.

## Release preparation update — 2026-11-26

Verified baseline `986a883804162aae3dc12228fe75354def8f34b6`: PR #48 merged, both CI workflows successful. SDK root imports, independent offline install, Linux/Windows matrix and CLI parity are now verified at the merged PR baselines (#46–#48); the historical table above is not current status. This increment adds a pinned previous-checkout package comparison, same-runner byte reproducibility and integrity checks, offline replacement/rollback preserving consumer data, and closed-store backup restoration. Results must be verified in CI. Both snapshots are still 0.1.4: this is an artifact replacement rehearsal, not proof of a semver upgrade or migration. No release is authorized. Independent egress/access review, comprehensive storage assurance, ownership/license/namespace, CRA/GC evidence, clean-machine and final pinned v1 artifact remain open.

## Security and recovery follow-up

PR #49 merged at `c3db1c416bd6c8948f13e2cccbc3b567bab198df`; both CI workflows passed. Same-version replacement/rollback, backup restoration and reproducibility rehearsal verified. This follow-up addresses deadline enforcement and stream cleanup plus asynchronous or explicitly rejected audit receipts failing closed. These are maintainer-side code review findings, not independent security certification. Host audit durability, production network controls, rights and distribution authorization, CRA/GC and a distinct versioned candidate remain open.

## OC-SEC-002 remediation candidate

Independent AI-assisted OC-SEC-001 review merged in #51 (conditional pass). Finding 1 is addressed by owner-only POSIX database creation, existing-file hardening and sidecar checks across evidence, research, audit and legacy audit migration. New regression tests replace the vulnerability reproduction with secure expectations. CI and reviewer confirmation required. Quiesce legacy stores before remediation; previous exposure cannot be undone. Use owner-controlled directories with trusted ancestor paths. Windows ACLs, deployment egress, external audit anchors and independent production assurance remain outside this fix. Finding 2 (action pinning) remains nonblocking.

## 1.0.0-rc.1 candidate preparation

Pinned pre-candidate main `cdb77310216744eeac38a676d16ea5f3d85b6af1` incorporates #52; both CI workflows passed including Linux concurrency and POSIX permissions. OC-SEC-001 remains a conditional pass pending independent confirmation of remediation. RC1 changes package version only, retains private package identity and existing schema/contract versions, and tests actual npm in-place replacement and rollback between distinct versions against that pinned 0.1.4 baseline. Candidate CI is pending. This is not registry publication or permission to distribute. Owner/license/namespace/source rights, CRA and applicable GC evidence, deployed egress and access controls, Windows ACLs, external audit anchoring, independent remediation confirmation and authorized final release remain outstanding. API/MCP/container remain outside the candidate.

## Ownership and release assurance update

Maintainer approved Osprey Strategic Holdings LLC ownership and proprietary licensing for private SDK/CLI distribution on 2026-11-27. Root LICENSE/COPYRIGHT and package UNLICENSED metadata implement this decision; package inclusion is tested. No change to repository visibility or release version. The package identity is now standalone observatory-core; legacy imports require migration. Third-party rights, exact distribution channel and final release authorization remain separately open. Combined RC1 main `1cda76b2502327e9f29185d12cc89370602ecac3` passed both CI workflows (45959139614, 45959139643): Linux 116/116, Windows 113 passed/3 skipped, Python 13/13 per platform, offline package and versioned replacement/recovery passed. CRA remote pilot ran at that baseline (jj-ervin/cra run 45961823768): validated audit blocked, build/artifact and ownership findings plus manual assessment gaps. Do not treat that historical report as a pass or evidence for a changed candidate. Independent security/ZTA and applicable GC review remain open.

## CRA build and identity remediation

CRA invokes npm run build and expects an artifact in dist/. The prior package had no build script; the new build produces and integrity-checks a private npm tarball, and CI installs the exact bytes. CRA's Node manifest version recognition is a separate scanner issue, not absence of a version. The private standalone name observatory-core replaces the historical GC scope; existing GC contract IDs and persisted records are unchanged. The release fixture tests uninstall/install migration and rollback across package names. General GC governance is not required; only explicitly claimed GC integration contracts need conformance evidence. CI and updated CRA results pending. No npm registry name reservation or publication is claimed.
