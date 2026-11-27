# Observatory CLI — OC-A02 candidate

The private SDK tarball now also installs an executable named `observatory`. The CLI is a thin local operator interface to the SDK, not a second engine, service, scheduler or approval authority.

## Install and use

Node 24; from the repository run `npm pack`, then install the resulting pinned tarball in an independent directory with `npm install --offline /path/to/artifact.tgz`. Run the local executable through npm exec --offline -- observatory --help, or the installed node_modules/.bin shim. No registry publication or v1 release is implied.

Example:
```sh
observatory discovery providers --store news.json
observatory discovery configure --store news.json --input provider.json
observatory discovery collect --store news.json --provider openalex
observatory discovery list --store news.json
observatory discovery triage --store news.json --id article-ID --decision accept
observatory evidence append --store evidence.sqlite --input record.json
observatory evidence list --store evidence.sqlite
observatory research search --store archive.sqlite --query basketball
observatory publication validate --manifest manifest.json --records records.json
```

Provider configuration uses the existing SDK provider shape, for example {"id":"openalex","type":"openalex","enabled":true,"query":"basketball"}. Explicit collect may access the network; offline ingest accepts an array of discovery records including optional scholarly metadata. Briefing imports use gc.daily-ai-news/1. Brave credentials come from BRAVE_SEARCH_API_KEY, not arguments. The existing experimental egress limitations apply. Do not run automated polling or expose this local CLI to untrusted users.

Discovery stores use single-writer JSON persistence: do not invoke overlapping writers. SQLite operations use existing SDK semantics. Search reads an existing research archive or creates an empty one if missing; archive ingestion is not exposed by this increment. Evidence append accepts one versioned record; provenance references must already exist. Local files and rights remain the operator's responsibility. No publication authority is inferred from validation.

Successful commands emit JSON except help/version. Exit codes: 0 success, 1 operation failure, 2 usage error. Input files are bounded to 10 MiB, discovery ingest to 1000 records. Errors do not print arbitrary provider exceptions. Redirect list output to export records; no new export schema is introduced.

Run npm test and npm run test:package. Tests exercise local CLI/SDK parity, failures, persistence, exact-byte validation and installed executable presence. Windows and Linux CI must pass before merge. Live provider tests, independent security review, clean-machine release and ownership/distribution gates remain open.
