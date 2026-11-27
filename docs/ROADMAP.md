# Observatory Core roadmap

Milestones are product delivery gates, not GC PASS identities. **Open** means full acceptance has not been met even when components exist. Closure needs pinned evidence under [release criteria](RELEASE-CRITERIA.md).

| Milestone | State | Measurable exit criteria | Assets |
| --- | --- | --- | --- |
| OC-M01 Core stabilization | Verified for private-testing scope | Close OC-SM-001; clean-baseline discovery, provenance, neutral record and legacy GC regression tests; resolve or explicitly gate correctness defects | A01 |
| OC-M02 Contract stabilization | Verified for private-testing scope | Supported SDK imports/errors/versions; package-boundary non-GC fixture; compatibility matrix for GC publication v1, `gc.discovery/1`, `oc.research.v1` | A01, A02 |
| OC-M03 Operational and security assurance | Open | Scoped component security review, failure/recovery and audit tests, environment matrix, rights/retention boundaries; independent deployment assurance before production use | A01, A02 |
| OC-M04 SDK packaging and distribution readiness | RC1 verified; v1 candidate pending CI | Owner/license/private distribution decisions; reproducible pinned artifact, integrity and clean-machine install proof; correct semver | A01 |
| OC-M05 CLI development | Implemented; CI verified #48 | SDK-backed commands, help/errors, offline fixture, parity and install tests | A02 |
| OC-M06 SDK and CLI v1.0 private testing | Candidate preparation | Verified private SDK/CLI 1.0.0 artifact, bounded testing restrictions, authorized handoff and recorded test feedback | A01, A02 |
| OC-M07 Research API development | Workspace API candidate; verification pending | Authenticated SDK-backed endpoints, denial/audit/integration tests and operations contract | A03 |
| OC-M08 MCP server development | Local stdio candidate; verification pending | Versioned least-privilege SDK-backed tools, protocol/adversarial tests, host auth/audit proof | A04 |
| OC-M09 Container deployment | Planned | Reproducible hardened image, environment/rollback checks and scan | A05 |

OC-SM-001 ([issue #42](https://github.com/jj-ervin/observatory-core/issues/42)) is an M01 work item: preserve structured scholarly metadata, DOI normalization, provenance, duplicate behavior, persistence and `gc.discovery/1` compatibility. Earlier OC-00/01/02 etc. document increment history, not competing milestone numbers.

Public SDK/CLI distribution is a separate release decision after private testing. No requirement to build A03–A05 before private testing or public SDK/CLI release unless the owner changes scope.
