# Observatory API — OC-A03 private testing candidate

Node 24; independently runnable via installed `observatory-api` executable or repository `npm run api`. The API uses the canonical SDK; no duplicate engine or external npm dependency. Version 1.1.0 is a new candidate; the prior SDK/CLI 1.0.0 artifact is unchanged.

## Configuration

Set OBSERVATORY_API_CONFIG to an absolute path to an owner-controlled JSON file, POSIX 0600 or restrictive Windows ACL. Generate each token using Node crypto randomBytes(32).toString('base64url'). Never commit tokens or sensitive records. Example (replace token and paths):
```json
{"port":8787,"archive":"private/archive.sqlite","audit":"private/research-audit.sqlite","workspace":{"evidence":"private/evidence.sqlite","discovery":"private/news.json","operationAudit":"private/api-audit.sqlite","collectProviders":[]},"principals":[{"subject":"local-tester","token":"REPLACE_WITH_RANDOM_BASE64URL_TOKEN","documentIds":[],"actions":["search","read","verify"],"permissions":["discovery:read","discovery:write","evidence:read","evidence:write","archive:write","publication:validate"]}]}
```

Use one service process as the exclusive discovery writer. Paths are host-owned and distinct; no user-supplied store paths. Each workspace permission grants access to that whole resource category in this single trusted workspace, not tenant isolation. Research reads separately require explicitly configured document IDs and actions. New archive document IDs are not automatically granted to anyone; update host config and restart. Never grant workspace reads to clients that must be isolated from each other. Separate service instances and OS isolation are needed for separate trust domains. Revocation is immediate in the embedded host, restart for config updates.

## HTTP contract

All endpoints except GET /healthz accept POST JSON with Authorization: Bearer TOKEN. Request max 16 KiB; response max 256 KiB. See schemas/api/v1/openapi.json.

| Path under /v1 | Required permission | Purpose |
| --- | --- | --- |
| research/invoke | document actions and IDs | Existing oc.research.v1 searchEvidence/getDocument/verifyCitation |
| discovery/providers, discovery/list | discovery:read | Provider metadata, paginated discoveries |
| discovery/ingest, discovery/triage, discovery/import-briefing | discovery:write | Offline intake and review |
| discovery/collect | discovery:collect | Explicit host-allowlisted enabled OpenAlex provider only; disabled by default |
| evidence/append | evidence:write | SDK schema and provenance validated record |
| evidence/get, evidence/list | evidence:read | Retrieve and paginate records |
| archive/ingest | archive:write | Check source/capture linkage, exact UTF-8 SHA-256 and media type before SDK archive write |
| publication/validate | publication:validate | Validate exact UTF-8 recordsText and manifest; never publish |

RSS/Brave live collection and remote provider configuration are intentionally excluded from HTTP: owner controls provider configuration offline, and production egress assurance is not established. OpenAlex uses fixed SDK endpoint, requires explicit opt-in, and is not live-tested in CI. No autonomous collection. Use synthetic or authorized nonsensitive data only. No public/remote deployment, CORS, TLS, proxy trust or tenant authentication. Loopback only. Local same-user compromise is outside boundary.

Workspace requests use a separate persistent hash-linked authorization-decision audit before operations, including denied operations; audit failure stops access. It records decisions, not successful mutation receipts; external anchors and outcome reconciliation are not supplied. Research audit stays separate and per document. No credentials or body logged. Invalid requests, missing data, write conflicts and audit failure return bounded errors. 200 with null means missing evidence; publication invalid returns valid:false. Request timeout bounds body receipt, not an in-flight SDK network operation. SDK persistence semantics apply; no cross-store transaction. Back up closed stores before updates. See PRIVATE-TESTING.md.

## Verification

npm test exercises actual HTTP, permission separation, offline discovery, evidence persistence, capture integrity, publication validation, audit failure, revocation and restart. npm run test:package starts the installed API process and executes a client request against it. The new HTTP surface has not received independent security review; this is not a production approval.
