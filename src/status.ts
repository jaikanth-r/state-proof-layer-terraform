import { config } from "./config.js";

import {
  getWorkspaceEvidence
} from "./evidence.js";

import {
  getProtection,
  getResourceId
} from "./state.js";

import {
  captureTerraformState
} from "./terraform.js";

import {
  hashTerraformState
} from "./hash.js";

export async function run(): Promise<void> {
  const resourceId =
    getResourceId();

  const protection =
    getProtection();



  if (!protection) {
    console.log(
      "Protection:      NOT PROTECTED"
    );

    console.log(
      "Evidence:        NOT AVAILABLE"
    );

    console.log(
      "Terraform state: NOT PROTECTED"
    );

    console.log(
      "Blockchain:      NOT ANCHORED"
    );

    console.log(
      "\nRun: spl terraform protect"
    );

    return;
  }

  const evidence =
    getWorkspaceEvidence();

  const currentState =
    captureTerraformState();

  const currentHash =
    hashTerraformState(currentState);

  const stateMatches =
    currentHash === protection.stateHash;

  const protectedEvidence =
    evidence.find(
      (event) =>
        event.eventId === protection.eventId
    );

  const evidenceMatches =
    protectedEvidence !== undefined &&
    protectedEvidence.workspace === config.workspace &&
    protectedEvidence.version === protection.version &&
    protectedEvidence.stateHash === protection.stateHash;

  console.log(
    "\nSPL Terraform Status"
  );

  console.log(
    "────────────────────────────────"
  );

  console.log(
    `Workspace:       ${config.workspace}`
  );

  console.log(
    `Resource:        ${resourceId}`
  );

  console.log(
    `Latest version:  ${protection.version}`
  );

  console.log(
    `Latest event:    ${protection.eventId}`
  );

  console.log(
    `Batch:           ${protection.batchId ?? "-"}`
  );

  console.log(
    `Evidence:        ${
      evidenceMatches
        ? "VALID ✓"
        : "INVALID ✗"
    }`
  );

  console.log(
    `Terraform state: ${
      stateMatches
        ? "MATCH ✓"
        : "MODIFIED ✗"
    }`
  );

  console.log(
    `Protected hash:  ${protection.stateHash}`
  );

  console.log(
    `Current hash:    ${currentHash}`
  );

  console.log(
    `Sealed at:       ${protection.sealedAt}`
  );

  console.log(
    `Blockchain:      ${
      protection.batchId
        ? "ANCHORED ✓"
        : "NOT ANCHORED"
    }`
  );

  if (!stateMatches || !evidenceMatches) {
    process.exitCode = 1;
  }
}
