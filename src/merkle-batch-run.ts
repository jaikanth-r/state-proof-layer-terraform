import {
  getWorkspaceEvidence
} from "./evidence.js";

import {
  createMerkleBatch,
  saveMerkleBatch,
  validateMerkleBatch
} from "./merkle-batch.js";

import { config } from "./config.js";

export async function run(): Promise<void> {
  const evidence =
    getWorkspaceEvidence();

  if (evidence.length === 0) {
    throw new Error(
      `No evidence exists for workspace "${config.workspace}". ` +
      `Run "spl terraform protect" first.`
    );
  }

  const batch =
    createMerkleBatch(
      evidence.map(
        (event) => ({
          eventId: event.eventId,
          stateHash: event.stateHash
        })
      )
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
