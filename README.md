# Governance Commons Observatory Core

Independent, evidence-first publication contracts for the Governance Commons Observatory.

**Status:** bootstrap; no benchmark execution or live publication pipeline yet.

## Architecture
Core owns validated evidence and approved, checksum-pinned publication exports. The Astro website is a read-only consumer. Agent Matrix, Agent Dossier, Agent Roster and Registry retain independent normative/editorial authority.

## Commands
- `npm test` — positive and negative contract tests (Node.js 24)
- `npm run validate:export -- manifest.json records.json` — validate an approved publication

## Newsroom discovery intake

`src/discovery/newsroom.mjs` provides the independent `gc.discovery/1` intake contract. It stores normalized articles, a separate history of provider discoveries, triage decisions, configuration and provider health in an atomic local JSON file. It does not change the publication evidence store or authorize publication. RSS and Atom use the existing bounded parser and DNS-pinned HTTPS transport. The default feed is NIST news; OpenAlex search is configurable. Brave web search requires `BRAVE_SEARCH_API_KEY`. GC Daily AI News is imported only from a supplied `gc.daily-ai-news/1` JSON object with an `items` array; there is no automation access.

ProPro packages this module as a pinned local tarball. Other clients may call `NewsroomDiscovery.open(file)`, then `providers`, `configure`, `collect`, `list`, `triage`, or `importBriefing` without ProPro. A saved pull is a provider with `kind: 'saved-pull'`, a name, an optional `context` for a topic, research effort, or client, and an RSS feed list, OpenAlex query, or Brave query list. ObCore validates and persists it; repeat sightings retain the article's original discovery date.

The publication manifest contract is specified in [GC–OBS.02 architecture](https://github.com/governancecommons/governance-commons-www/blob/main/docs/gc-obs-02-architecture-separation.md) (pending website PR #3). No claims of independent verification, certifications or rankings are implied.

## Safety
Only publish records with explicit human approval and sufficient provenance. Do not commit private Dossier or Roster source data. Documentation-only records must not be promoted to benchmark evidence.
