import test from "node:test";
import assert from "node:assert/strict";
import { preparePublication } from "../src/publish.mjs";
import { sha256, validatePublication } from "../src/contract.mjs";

// Synthetic contract fixture. Metadata strings alone do not prove human authorization.
const approvedRecord = {
  id: "obs-1", subjectId: "example-system", subjectVersion: "1.0.0",
  claim: "Synthetic documented claim", evaluator: "fixture-only",
  method: "fixture", methodVersion: "1.0.0",
  limitations: "Not real evidence or an authorized release",
  evidenceClass: "documentation", sourceUrl: "https://example.org/source",
  capturedAt: "2026-10-21T12:00:00Z", publicationStatus: "approved",
  approvalRecordId: "approval-1",
  classification: {
    specVersion: "1.0.0", assetId: "obs-1", impact: "low",
    access: "open", quadrant: "Q3", dataLabels: [],
    publication: { status: "approved", approvedBy: "fixture-reviewer", approvalRecordId: "approval-1" }
  }
};
const metadata = {
  publicationId: "publication-1", generatedAt: "2026-10-21T12:30:00Z",
  recordsUrl: "https://example.org/records.json", approvedBy: "fixture-reviewer",
  approvalRecordId: "approval-1", sourceCommit: "a".repeat(40),
  methodologyVersion: "1.0.0"
};
test("OC-001: deterministic v1 export pins exact records bytes", () => {
  const release = preparePublication({ records: [approvedRecord], ...metadata });
  assert.equal(release.manifest.schemaVersion, "1.0.0");
  assert.equal(release.manifest.recordCount, 1);
  assert.equal(release.manifest.recordsSha256, sha256(release.recordsBytes));
  assert.ok(release.recordsBytes.toString("utf8").endsWith("\n"));
  assert.deepEqual(validatePublication(release.manifest, release.recordsBytes), []);
  const changed = Buffer.from(release.recordsBytes.toString("utf8").trimEnd());
  assert.notEqual(sha256(changed), release.manifest.recordsSha256);
  assert.match(validatePublication(release.manifest, changed).join(" "), /checksum mismatch/);
});
test("OC-001: release approval reference must bind records", () => {
  assert.throws(() => preparePublication({
    records: [approvedRecord], ...metadata, approvalRecordId: "different-approval"
  }), /approval reference mismatch/);
});
test("OC-001: classification approval must bind each record", () => {
  const changed = {
    ...approvedRecord,
    classification: {
      ...approvedRecord.classification,
      publication: { ...approvedRecord.classification.publication, approvalRecordId: "different-approval" }
    }
  };
  assert.throws(() => preparePublication({ records: [changed], ...metadata }), /approval reference mismatch/);
});
