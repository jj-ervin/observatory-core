# OC-SM-001 — Optional scholarly metadata

Asset OC-A01 / milestone OC-M01. Issue #42. No schema-version bump: existing gc.discovery/1 records and newsroom stores remain readable; all legacy fields and IDs are retained.

Optional `scholarly` object on article records and discovery events:
- `doi`: lowercase bare DOI, validated and normalized from resolver URLs or DOI prefixes.
- `openAlexId`: provider work identifier.
- `authors`: ordered array of objects with optional `name`, `openAlexId`, `orcid`; unknown author fields omitted; order preserved.
- `publicationDate`: YYYY, YYYY-MM or YYYY-MM-DD, with corresponding `publicationDatePrecision` year/month/day; no fabricated full date.
- `venue`, `publicationType`, `abstract`, `openAccessStatus`: provider strings; inverted abstract index reconstructed only when complete.
- `isOpenAccess`, `isRetracted`: explicit booleans only; absence means unknown, never false.

No citation counts are added. Metadata is bounded and provider-supplied, not independently verified. Legacy publishedAt is unchanged. DOI/OpenAlex aliases supplement URL identity where the match is unique and identifiers do not conflict. Existing article IDs, original discovery dates and triage survive enrichment. Metadata fills missing fields; compatible date precision can improve; conflicting known values are not silently overwritten. Author lists are atomic. Discovery events retain provider metadata and provenance; repeated identical event identities enrich missing fields without increasing event count. Existing historical duplicates are not destructively consolidated. Conflicting values and changing retraction/access statuses require independent source review; the article snapshot is not a current-status guarantee.

ProPro and Gen-B should carry the optional object through exports/imports, preserve provenance and distinguish unknown values. This change does not modify those repositories or grant redistribution rights to abstracts.

Validation: npm test; targeted test/scholarly.test.mjs. CI evidence required before merge.
