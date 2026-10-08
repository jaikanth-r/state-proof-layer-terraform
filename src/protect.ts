import { randomUUID } from "node:crypto";
import { config } from "./config.js";
import { getProtection, saveProtection } from "./state.js";
import { captureTerraformState } from "./terraform.js";
import { hashTerraformState } from "./hash.js";
import { recordEvidenceEvent } from "./evidence.js";

export async function run(): Promise<void> {
  console.log(`Protecting Terraform workspace "${config.workspace}"...`);
  console.log(`Terraform root: ${config.terraformRoot}`);

  const terraformState = captureTerraformState();
  const stateHash = hashTerraformState(terraformState);

  const existing = getProtection();

  if (existing && existing.stateHash === stateHash) {
    const evidence = recordEvidenceEvent({
      eventId: existing.eventId,
      version: existing.version,
      stateHash: existing.stateHash,
      createdAt: existing.sealedAt
    });

    console.log("\nTerraform state is already protected.");
    console.log(`  workspace: ${config.workspace}`);
    console.log(`  stateHash: ${stateHash}`);
    console.log(`  version:   ${existing.version}`);
    console.log(`  protected: ${existing.sealedAt}`);
    console.log(`  evidence:  ${evidence.eventId}`);
    return;
  }

  const version = existing ? existing.version + 1 : 1;
  const eventId = `local-${randomUUID()}`;
  const sealedAt = new Date().toISOString();

  const protection = {
    eventId,
    version,
    stateHash,
    localHash: stateHash,
    protectionStatus: "protected",
    batchId: null,
    sealedAt
  };

  const evidence = recordEvidenceEvent({
    eventId,
    version,
    stateHash,
    createdAt: sealedAt
  });

  saveProtection(protection);

  console.log("\nSPL Local Protection");
  console.log("────────────────────────────────");
  console.log(`Workspace:  ${config.workspace}`);
  console.log(`Version:    ${version}`);
  console.log(`State hash: ${stateHash}`);
  console.log(`Event:      ${eventId}`);
  console.log(`Evidence:   ${evidence.eventId}`);
  console.log(`Protected:  ${sealedAt}`);
  console.log("\nProtection saved locally.");
  console.log(`Protection: ${config.protectionFile}`);
  console.log(`Evidence:   ${config.splDirectory}/evidence/events.json`);
}
