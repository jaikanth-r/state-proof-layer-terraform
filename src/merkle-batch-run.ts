import {
  getWorkspaceEvidence
} from "./evidence.js";

import {
  createMerkleBatch,
  saveMerkleBatch,
  validateMerkleBatch,
  loadLatestMerkleBatch,
  loadMerkleBatch
} from "./merkle-batch.js";

import { config } from "./config.js";
import { getProtection } from "./state.js";

export async function run(): Promise<void> {
  const evidence =
    getWorkspaceEvidence();

  if (evidence.length === 0) {
    console.error(
      `No evidence exists for workspace "${config.workspace}". ` +
      `Run "spl terraform protect" first.`
    );

    process.exitCode = 1;
    return;
  }

  const evidenceEvents =
    evidence.map(
      (event) => ({
        eventId: event.eventId,
        stateHash: event.stateHash
      })
    );

  /*
   * Lifecycle binding:
   *
   * If the current protection already has a batchId,
   * that exact batch is authoritative.
   *
   * We must NOT silently skip a corrupted active batch
   * and create/use another batch.
   *
   * If batchId is null, this is the pre-anchor state and
   * the latest batch may be reused when it exactly matches
   * the current evidence set.
   */
  const protection =
    getProtection();

  const existingBatch =
    protection?.batchId
      ? loadMerkleBatch(protection.batchId)
      : loadLatestMerkleBatch();

  if (existingBatch) {
    validateMerkleBatch(existingBatch);

    const sameEvidence =
      existingBatch.events.length ===
        evidenceEvents.length &&
      existingBatch.events.every(
        (batchEvent, index) =>
          batchEvent.eventId ===
            evidenceEvents[index].eventId &&
          batchEvent.stateHash ===
            evidenceEvents[index].stateHash
      );

    if (sameEvidence) {
      console.log(
        "\nSPL Merkle Batch"
      );

      console.log(
        "────────────────────────────────"
      );

      console.log(
        `Workspace:  ${config.workspace}`
      );

      console.log(
        `Batch ID:   ${existingBatch.batchId}`
      );

      console.log(
        `Algorithm:  ${existingBatch.algorithm}`
      );

      console.log(
        `Leaf count: ${existingBatch.leafCount}`
      );

      console.log(
        `Root:       ${existingBatch.root}`
      );

      console.log(
        `Saved:      ${config.splDirectory}/merkle-batches/batch-${existingBatch.batchId}.json`
      );

      console.log(
        "\nMerkle batch already represents the current evidence set."
      );

      console.log(
        "Merkle batch integrity: VALID ✓"
      );

      return;
    }
  }

  const batch =
    createMerkleBatch(
      evidenceEvents
    );

  validateMerkleBatch(batch);

  saveMerkleBatch(batch);

  console.log(
    "\nSPL Merkle Batch"
  );

  console.log(
    "────────────────────────────────"
  );

  console.log(
    `Workspace:  ${config.workspace}`
  );

  console.log(
    `Batch ID:   ${batch.batchId}`
  );

  console.log(
    `Algorithm:  ${batch.algorithm}`
  );

  console.log(
    `Leaf count: ${batch.leafCount}`
  );

  console.log(
    `Root:       ${batch.root}`
  );

  console.log(
    `Saved:      ${config.splDirectory}/merkle-batches/batch-${batch.batchId}.json`
  );

  console.log(
    "\nMerkle batch integrity: VALID ✓"
  );
}
