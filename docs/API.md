# Observatory API — OC-M07 / A03 initial private slice

Node 24, loopback HTTP only. This is a separately runnable SDK-backed research API, not a production remote service. No new npm dependency. Initial slice exposes the already validated `oc.research.v1` research operations. Discovery mutation/collection, evidence writes, archive ingestion and publication validation are intentionally not exposed yet; each requires its own write authorization and audit contract. Provision archive contents through the trusted SDK. Do not grant clients direct filesystem access.

## Run

Create a private JSON config outside source control in an owner-controlled directory (POSIX mode 0600, Windows restrictive ACL). Generate independent high-entropy bearer tokens with Node crypto randomBytes(32).toString('base64url'); never commit or log them. Set OBSERVATORY_API_CONFIG to the absolute config path; run `npm run api`. Example shape (replace placeholder token and document ID with actual values):

```json
{"port":8787,"archive":"private/archive.sqlite","audit":"private/audit.sqlite","principals":[{"subject":"local-client","token":"REPLACE_WITH_RANDOM_BASE64URL_TOKEN","documentIds":[],"actions":["search","read","verify"]}]}
```

Archive and audit paths are host-owned; no request can set them. The server binds 127.0.0.1 only. Each principal has explicit document IDs (max 100) and actions. Empty scope grants no documents. Restart to apply configuration changes; embedded host can revoke a principal immediately. No browser CORS, proxy trust, cookie auth, token issuance, remote TLS or multi-tenancy is supplied. Local malicious code or same-user compromise is outside this boundary. Authentication failures are not document-access audit records; durable per-document authorization decisions are recorded before reads. Audit outage denies access. Do not use sensitive data or expose via tunnels/reverse proxies. The existing conditional security review does not cover this new HTTP interface.

## Contract

GET /healthz: minimal liveness, no protected data.
POST /v1/research/invoke: Authorization: Bearer TOKEN, Content-Type: application/json. Body follows the SDK integration contract:

```json
{"version":"oc.research.v1","operation":"searchEvidence","arguments":{"query":"basketball","limit":10}}
```

Other operations: getDocument(documentId), verifyCitation(documentId,start,end,quotedText). Responses preserve SDK envelopes. 400 malformed/invalid request, 401 unauthenticated, 403 denied or unavailable operation, 404 unknown path, 405 wrong method, 408 deadline, 413 request exceeds 16 KiB, 415 wrong media type, 503 integration unavailable. No detailed internal errors. Maximum response payload is bounded by SDK. Connections and request lifetime bounded; no production rate-limit or load assurance. Search is literal within explicitly authorized candidate documents, not unrestricted archive search.

Run npm test for actual HTTP, scope separation, negative requests, audit outage, revocation and persisted audit verification. See schemas/api/v1/openapi.json for the versioned interface.
