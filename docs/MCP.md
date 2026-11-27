# Observatory MCP — OC-A04 private testing candidate

Local stdio server for MCP protocol revision **2025-11-25**, intentionally pinned to the lifecycle-based revision for initial client compatibility. See https://modelcontextprotocol.io/specification/2025-11-25 . Newer stateless revisions, remote Streamable HTTP, and official-client interoperability certification are outside this candidate. No new runtime dependency.

## Launch

Install the pinned private package offline, then configure a compatible MCP host to spawn the installed `observatory-mcp` executable with OBSERVATORY_MCP_CONFIG set to an absolute private JSON config path. On Windows a host may instead launch node with the absolute installed src/mcp/start.mjs path. Example host configuration (adapt path and format to your host):

```json
{"command":"node","args":["/absolute/consumer/node_modules/observatory-core/src/mcp/start.mjs"],"env":{"OBSERVATORY_MCP_CONFIG":"/absolute/private/mcp.json"}}
```

Private config example:

```json
{"subject":"local-research-client","archive":"private/archive.sqlite","audit":"private/research-audit.sqlite","documentIds":[],"actions":["search","read","verify"],"workspace":{"evidence":"private/evidence.sqlite","discovery":"private/news.json","operationAudit":"private/mcp-audit.sqlite"},"permissions":["discovery:read","evidence:read","publication:validate"]}
```

Use owner-controlled directories and config mode 0600 on POSIX or restrictive ACL on Windows. Paths are host-owned. The trusted host establishes identity by launching the process with private configuration; no identity, scope, file path, network target or credential is accepted from model arguments. Empty document scope grants no documents. Workspace read grants cover the selected store, not tenant isolation. Run a separate process for each trust domain. Restart to change policy; embedded session revocation prevents subsequent requests. Do not expose stdio through a remote bridge or to untrusted local code.

## Tools

| Tool | Permission |
| --- | --- |
| research_search | search + configured document scope |
| research_document | read + configured document scope |
| research_verify_citation | verify + configured document scope |
| discovery_list | discovery:read |
| evidence_get, evidence_list | evidence:read |
| publication_validate | publication:validate |

Only granted tools are advertised. Research uses existing validated SDK integration and document authorization audit; workspace tools reuse the API's SDK operation adapters and durable decision audit. No mutation, live network collection, provider configuration, arbitrary filesystem, shell execution or publishing tools. Model-generated calls cannot expand scope. Source text is untrusted data, not instructions; results carry an explicit trust marker. Tool descriptions and annotations are not a substitute for the consuming host's prompt-injection defenses.

## Protocol and verification

Newline-delimited UTF-8 JSON-RPC 2.0 over stdio; initialize, notifications/initialized, ping, tools/list and tools/call. Notifications do not execute tools; batches rejected; unsupported methods return bounded errors. Tool failures use isError; no internal exception text or stdout diagnostic logging. Input frame 16 KiB, structured result 96 KiB before JSON encoding; sequential processing with output backpressure. No cancellation of an already running synchronous SDK operation or production resource assurance claimed.

Run npm test and npm run test:package. Tests include lifecycle, malformed/oversized frames, scope denial, audit outage, spoofing, revocation, untrusted-source marking and actual installed subprocess exchange. These are protocol fixtures, not proof of interoperability with every MCP host. Independent security review and public/production release remain separate. Use synthetic or authorized nonsensitive private test data.
