import { config } from "./config.js";

import {
  getWorkspaceEvidence
} from "./evidence.js";

import {
  requireProtection
} from "./state.js";

import {
  captureTerraformState
} from "./terraform.js";

import {
  hashTerraformState
} from "./hash.js";

import {
  findEventInMerkleBatch,
  loadLatestMerkleBatch,
  loadMerkleBatch,
  validateMerkleBatch
} from "./merkle-batch.js";

import {
  getFabricAnchor
} from "./fabric.js";

export async function run(): Promise<void> {
  console.log(
    `Verifying Terraform workspace "${config.workspace}"...`
  );

  console.log(
    `Terraform root: ${config.terraformRoot}`
  );

  const protection =
    requireProtection();

  const currentState =
    captureTerraformState();

  const currentHash =
    hashTerraformState(
      currentState
    );

  const evidence =
    getWorkspaceEvidence();

  const protectedEvidence =
    evidence.find(
      (event) =>
        event.eventId ===
        protection.eventId
    );

  const stateMatches =
    currentHash ===
    protection.stateHash;

  const evidenceMatches =
    protectedEvidence !== undefined &&
    protectedEvidence.workspace ===
      config.workspace &&
    protectedEvidence.version ===
      protection.version &&
    protectedEvidence.stateHash ===
      protection.stateHash;

  let batchValid = false;
  let eventInBatch = false;
  let batchId: string | null = null;
  let merkleRoot: string | null = null;
  let fabricValid = false;

  try {
    const batch =
      protection.batchId
        ? loadMerkleBatch(protection.batchId)
        : loadLatestMerkleBatch();

    if (!batch) {
      throw new Error(
        "No Merkle batch exists."
      );
    }

    validateMerkleBatch(
      batch
    );

    batchValid = true;
    batchId = batch.batchId;
    merkleRoot = batch.root;

    const protectedEvent =
      findEventInMerkleBatch(
        batch,
        protection.eventId
      );

    eventInBatch =
      protectedEvent !== null &&
      protectedEvent.stateHash ===
        protection.stateHash;

    if (eventInBatch) {
      const anchorId =
        `spl-${batch.batchId}`;

      const fabricAnchor =
        await getFabricAnchor(
          anchorId
        );

      if (fabricAnchor) {
        fabricValid =
          fabricAnchor.anchorId ===
            anchorId &&
          fabricAnchor.batchId ===
            batch.batchId &&
          fabricAnchor.merkleRoot ===
            batch.root &&
          fabricAnchor.algorithm ===
            batch.algorithm &&
          fabricAnchor.leafCount ===
            batch.leafCount &&
          fabricAnchor.workspace ===
            config.workspace;
      }
    }
  } catch (error) {
    batchValid = false;

    if (
      error instanceof Error
    ) {
      console.log(
        `\nVerification detail: ${error.message}`
      );
    }
  }

  console.log();
  console.log(
    "SPL End-to-End Verification"
  );
  console.log(
    "────────────────────────────────────────────"
  );

  console.log(
    `Workspace:       ${config.workspace}`
  );

  console.log(
    `Version:         ${protection.version}`
  );

  console.log(
    `Protected event: ${protection.eventId}`
  );

  console.log(
    `Protected hash:  ${protection.stateHash}`
  );

  console.log(
    `Current hash:    ${currentHash}`
  );

  console.log();
  console.log(
    "Integrity chain:"
  );

  console.log(
    `  Terraform state: ${
      stateMatches
        ? "VALID ✓"
        : "MODIFIED ✗"
    }`
  );

  console.log(
    `  Evidence:        ${
      evidenceMatches
        ? "VALID ✓"
        : "INVALID ✗"
    }`
  );

  console.log(
    `  Merkle batch:    ${
      batchValid
        ? "VALID ✓"
        : "MISSING/INVALID ✗"
    }`
  );

  console.log(
    `  Protected event: ${
      eventInBatch
        ? "IN BATCH ✓"
        : "NOT IN BATCH ✗"
    }`
  );

  console.log(
    `  Fabric anchor:   ${
      fabricValid
        ? "MATCH ✓"
        : "MISSING/MISMATCH ✗"
    }`
  );

  if (batchId) {
    console.log();
    console.log(
      `Merkle batch:     ${batchId}`
    );
    console.log(
      `Merkle root:      ${merkleRoot}`
    );
    console.log(
      `Fabric anchor:    spl-${batchId}`
    );
  }

  const success =
    stateMatches &&
    evidenceMatches &&
    batchValid &&
    eventInBatch &&
    fabricValid;

  console.log();
  console.log(
    "════════════════════════════════════════════"
  );

  console.log(
    `Result: ${
      success
        ? "END-TO-END INTEGRITY VALID ✓"
        : "INTEGRITY VERIFICATION FAILED ✗"
    }`
  );

  console.log(
    "════════════════════════════════════════════"
  );

  if (!success) {
    process.exitCode = 1;
  }
}
