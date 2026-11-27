# Observatory Core v1.0.0 — private testing

This is an owner-authorized private testing candidate, not a public or production release. Proprietary; Osprey Strategic Holdings LLC. Intended users: owner and explicitly authorized developers/consuming applications. Node.js 24, Windows or Linux. Private testing precedes any public distribution decision.

## Install and verify

Obtain the tarball and its recorded SHA-256 from an owner-controlled private channel; do not install a similarly named registry package. Compare the SHA-256 with the trusted release evidence before installation. On Windows use `Get-FileHash -Algorithm SHA256 <artifact>`; on Linux use `sha256sum <artifact>`.

In a consumer project, back up existing data with all writers stopped. If replacing the historical package name, uninstall `@governancecommons/observatory-core` first and migrate imports to `observatory-core`. Keep the prior tarball for rollback.

```sh
npm install --offline --ignore-scripts /absolute/path/to/observatory-core-1.0.0.tgz
npm exec --offline -- observatory --version
npm exec --offline -- observatory --help
npm exec --offline -- observatory discovery list --store test-news.json
```

The version must be 1.0.0. See [SDK usage](SDK-PACKAGE.md) and [CLI usage](CLI.md). Use synthetic or authorized non-sensitive data in owner-controlled directories. On Windows verify inherited ACLs restrict access; on POSIX use trusted parent directories. Avoid untrusted callers, shared/hosted operation, autonomous polling and unauthorized network access. Do not use for production or sensitive data. No general GC governance dependency.

## Maintenance and testing feedback

The owner/maintainer (Osprey Strategic Holdings LLC) controls support, issue triage, package updates and recovery. Report reproducible defects to the maintainer through an authorized private channel; do not place sensitive records or credentials in public GitHub issues. Include package version, digest, OS/Node version, command, expected/actual behavior and sanitized logs. For rollback, stop writers, preserve a closed-store backup, uninstall the new package and install the retained prior tarball offline. Restore the backup if necessary and verify a representative task and integrity. Treat an upgrade or migration failure as a blocker for that consumer; do not delete original data.

Public release requires a separate decision after testing. The independent security confirmation and deployment-level controls remain open; this is deliberately bounded testing, not a waiver or a security certification.
