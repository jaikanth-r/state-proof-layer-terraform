import { config } from "./config.js";

import {
  getWorkspaceEvidence
} from "./evidence.js";

import {
  getResourceId
} from "./state.js";

export async function run(): Promise<void> {
  const resourceId =
    getResourceId();

  const history =
    getWorkspaceEvidence();

  console.log(
    "\nSPL Terraform History"
  );

  console.log(
    "────────────────────────────────────────────────────────────────────────"
  );

  console.log(
    `Workspace: ${config.workspace}`
  );

  console.log(
    `Resource:  ${resourceId}\n`
  );

  console.log(
    "VERSION  EVENT                  STATE HASH         CREATED"
  );

  console.log(
    "───────  ─────────────────────  ─────────────────  ────────────────────"
  );

  for (const event of history) {
    const stateHash =
      event.stateHash.slice(0, 16) + "...";

    console.log(
      `${String(event.version).padEnd(9)}` +
      `${event.eventId.slice(0, 20).padEnd(23)}` +
      `${stateHash.padEnd(19)}` +
      `${event.createdAt}`
    );
  }

  console.log(
    `\nTotal versions: ${history.length}`
  );
}
