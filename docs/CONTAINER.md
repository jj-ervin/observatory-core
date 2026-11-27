# OC-M09 — Observatory Container

Private local Linux container candidate, wrapping the existing SDK, CLI, API and MCP without duplicating research logic. No registry publication. API remains bound to 127.0.0.1 **inside** the container. Default network is none; no host port publishing or remote production service. Use docker exec for the isolated API smoke/client, or the MCP stdio mode for a trusted host. This is not a remote API deployment.

## Build and identity

Resolve an approved Node 24 Debian slim base to an immutable digest, record it, and build with that digest. CI records the resolved base and compares filesystem layer digests across two builds. Image ID equality is separately reported; this is same-runner evidence, not cross-platform reproducibility. Reuse the recorded base digest when rebuilding; the floating tag is only a discovery input.

```sh
docker pull node:24-bookworm-slim
BASE=$(docker image inspect node:24-bookworm-slim --format '{{index .RepoDigests 0}}')
docker build --build-arg NODE_BASE="$BASE" -t observatory-private:1.2.0 .
```

## Local operation

Use owner-controlled paths, UID/GID 1000, private config mode 0600 and data directory mode 0700. Configure API as documented in API.md with port 8787, all stores under /data, no collection providers. Mount the config file read-only; do not embed secrets in the image or environment values. Set OBSERVATORY_IMAGE to the verified local image, OBSERVATORY_DATA to absolute data directory and OBSERVATORY_CONFIG to absolute API config file, then run docker compose up -d. The compose definition disables networking, drops capabilities, uses non-root identity, read-only root, bounded tmpfs, memory, CPU and processes. Use docker compose ps for liveness. There is deliberately no ports mapping.

For CLI or MCP use docker run --rm with the same hardened flags and mounted data; MCP requires -i, a read-only private /run/observatory/mcp.json mount, and --no-healthcheck. CLI likewise does not use API health check. No concurrent discovery writers; stop API before running a second writer. Docker access itself is privileged; host owns isolation and identity.

## Recovery and acceptance

Stop writers cleanly before backup; preserve all data files and sidecars. Retain exact previous image ID and config, and a quiescent backup; restore into a separate owner-controlled directory before rollback. Start the retained image against restored data and run an authenticated smoke request. CI tests restart and restoration with the same candidate, not cross-version container rollback. The SDK package fixture separately verifies versioned package rollback.

Container CI builds the pinned-base image, checks non-root/read-only/offline operation, auth denial, persistence and restoration, CLI smoke and scans HIGH/CRITICAL vulnerabilities (including unfixed). A failing scan is a release blocker requiring documented disposition, not an ignored warning. No image is uploaded from public repository CI. Private image retention, independent security review, actual host interoperability and production deployment remain separate. Windows Docker Desktop Linux containers and ARM64 have not been verified. Use authorized nonsensitive fixtures only.
