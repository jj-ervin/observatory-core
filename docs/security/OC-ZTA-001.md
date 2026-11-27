# OC-ZTA-001 — Zero Trust Architecture alignment

Status: component assessment candidate, not certification or deployment approval.
Baseline: cdb77310216744eeac38a676d16ea5f3d85b6af1 (merged #52). RC1 #53 is separate.
Reference: NIST SP 800-207 (August 2020), sections 2.1 and 3, https://csrc.nist.gov/pubs/sp/800/207/final .
Use this evidence in CRA and applicable GC assessment; a reusable external ZTA audit skill may independently assess it without becoming a runtime dependency.

## Boundary and responsibility

- Trusted host authenticates subjects, verifies device/workload posture where applicable, derives candidate scope and evaluates dynamic policy. It owns policy engine/administrator functions, session lifecycle, network and OS isolation.
- Governed research facade is a resource-level enforcement component, not a complete enterprise PEP. It checks each document operation and synchronously audits before access. The JSON adapter validates shape but does not authenticate context or establish that a supplied facade is governed.
- Raw SDK stores, static scopes, read-only facades and local CLI are trusted-operator primitives, not security boundaries against arbitrary code in the same process. Never expose them directly to untrusted callers; isolate storage and privileged execution in the host. A client must not select its own subject, scope, authorization callback, audit sink or store path.
- External data and provider responses are untrusted. Feed authorization and TLS pinning controls are conditional on approved pins; initial RSS pin bootstrap and other provider egress need host controls. No autonomous polling or externally exposed API/MCP is approved.
- Audit decisions are not proof of human identity or durable external anchoring; host owns subject binding, retention, checkpoint storage and monitoring.

## SP 800-207 section 2.1 mapping

Status means component evidence only; PARTIAL/HOST/OPEN are not PASS. Paths below are inspectable source and test evidence, not claims about a deployed tenant.

| ID | Tenet (paraphrased) | Component evidence | Status / remaining proof |
| --- | --- | --- | --- |
| ZT-01 | Treat data and services as resources | src/core/store.mjs; src/research/sqlite-archive.mjs; src/research/governed-tools.mjs | PARTIAL: document IDs and scoped operations; host inventory and enforcement for other stores, discovery, writes and publication |
| ZT-02 | Protect communications regardless of network | src/ingestion/secure-http-transport.mjs; test/secure-http-transport.test.mjs | PARTIAL: bounded pinned HTTPS feed transport; host-approved pins, live TLS/egress and secure host channels not established |
| ZT-03 | Grant resource access for a specific session | src/research/governed-tools.mjs; test/research-portal-integration-fixture.test.mjs; test/zero-trust-boundary.test.mjs | PARTIAL: per-operation document checks; host session binding, termination and prevention of raw-store bypass |
| ZT-04 | Make access decisions from dynamic policy and context | src/research/governed-tools.mjs; test/research-governed-tools.test.mjs | PARTIAL: synchronous per-document/action policy callback; host identity, posture, risk signals and policy version |
| ZT-05 | Monitor resource integrity and posture | src/core/sqlite-store.mjs; src/research/audit-chain.mjs; src/research/audit-checkpoint.mjs; test/security-sqlite-file-permissions.test.mjs | PARTIAL: integrity and POSIX file protection; host posture, ACL, external anchors and ongoing monitoring |
| ZT-06 | Authenticate and authorize before access, reassess dynamically | src/research/json-transport.mjs; src/research/governed-tools.mjs; test/zero-trust-boundary.test.mjs | PARTIAL: operation authorization, denial and revocation; host authenticates before invoking integration, no identity from body |
| ZT-07 | Collect security telemetry to improve policy | src/research/sqlite-access-audit.mjs; src/research/audit-chain.mjs | PARTIAL: decision audit and integrity primitives; host correlation, alerting, feedback, retention and external anchor |

## Acceptance and handoff

Run npm test, npm run test:package and the version-appropriate release fixture on a pinned candidate, then CRA and applicable GC controls. Record commit, platform, commands, results, each control's evidence, residual risk and responsible owner. An independent reviewer should verify the #52 remediation and ZTA mapping, including negative tests. A future generic ZTA skill should consume this mapping as project evidence and independently verify it; no assumed skill schema or score.

The local trusted-operator SDK/CLI candidate may be prepared without implementing identity infrastructure. Final release authorization requires explicit disposition of each applicable control and documented deployment restrictions. Shared-host, remote multi-tenant or autonomous operation remains unapproved until host-side bypass prevention, authentication, network/OS isolation and telemetry evidence exist. Do not claim enterprise ZTA compliance from this component review.
