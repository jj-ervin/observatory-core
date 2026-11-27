# Observatory Core — release criteria (current)
 
Approved strategy (2026-11-27): **private testing, then separately authorized public release**. Product authority: Osprey Strategic Holdings LLC. Scope: OC-A01 SDK and OC-A02 CLI, Node 24, trusted local Linux/Windows. A03–A05 are separate deliverables. Governance Commons adoption is optional; compatibility with explicitly implemented contracts is tested, not a blanket conformance requirement.

## OC-M06 — private-testing acceptance

| Gate | Evidence and disposition |
| --- | --- |
| Function and compatibility | RC1 main 7d0de5ffc88f31679137e0b509476111480d1fb9: CI 45965494276 and 45965494348 passed, Linux 116/116, Windows 113 pass/3 skip, 13 schema tests per OS. Re-run on versioned candidate. |
| Build, installation and recovery | RC1 same-commit tarballs built, installed, exercised, reproduced per runner; name migration, rollback and restoration passed. Re-run on 1.0.0; check actual installed CLI shim and preserve artifact digest. |
| Rights and identity | Owner-approved proprietary license, standalone name, private flag and included notices. No third-party rights clearance or public registry namespace reservation is implied. Use synthetic or properly authorized data only. |
| CRA | RC1 exact-commit adjudication: 31 Pass, 2 Risk, 1 Gap, 3 N/A; no Unknown. Report validated in private CRA run 45978921895. Findings: delivery channel, security, maintenance. This is historical evidence; new candidate needs its own execution/assessment. |
| Security and ZTA | OC-SEC-001 conditional independent review; #52 POSIX mitigation confirmed in merged RC1 Linux CI. Component ZTA negative tests pass on Linux/Windows. Independent confirmation of remediation remains outstanding; no deployment/enterprise ZTA certification. Restrict candidate to the private testing boundary below. |
| Private delivery | Retain exact tested artifact and SHA-256 in an access-controlled channel, verify acquisition/installation, record recipient scope. Public-repository CI must not upload the private package. |
| Acceptance | Owner approval of private testing is recorded; candidate handoff is distinct from declaring final release approval. Complete testing feedback and record material defects before public distribution. |

## Private testing boundary

Authorized owner/developers only, on trusted local single-user systems in owner-controlled directories, with synthetic or authorized non-sensitive test data. Windows ACLs must be set and checked by the operator; POSIX legacy migration requires quiescent stores and trusted ancestors. Do not expose the CLI/SDK directly to untrusted callers, host shared/multi-tenant services, autonomously poll, or process production/sensitive data. Network-dependent provider tests require explicit authorization and appropriate host egress controls; use offline fixtures otherwise. External audit anchoring and full host identity/security are not supplied by the SDK. The original independent security confirmation requirement is not declared passed; this candidate is for restricted testing, not a production-approved release. See [private testing](PRIVATE-TESTING.md).

## Public release gate (later)

Complete private testing feedback and material fixes, independent remediation/security confirmation and applicable ZTA disposition for actual intended deployment, third-party rights and public licensing/channel decisions, retained artifact acquisition through the chosen public channel in a clean external environment, support/update/recovery instructions and explicit owner release approval. Do not publish or remove the private flag by inference. Production egress and hosted-service assurance apply only if that use is offered. Prior release criteria and baseline evidence remain in Git history at 7d0de5f; historical draft PRs #3 and #40 are superseded by merged #45, not independent release evidence.
