import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync
} from "node:fs";

import { config } from "./config.js";

export interface LocalProtection {
  eventId: string;
  version: number;
  stateHash: string;
  localHash: string;
  protectionStatus: string;
  batchId: string | null;
  sealedAt: string;
}

function ensureDirectory(): void {
  mkdirSync(
    config.splDirectory,
    { recursive: true }
  );
}

export function getResourceId(): string {
  if (!existsSync(config.resourceFile)) {
    throw new Error(
      "SPL Terraform is not initialized. Run `npm run init` first."
    );
  }

  const resources = JSON.parse(
    readFileSync(
      config.resourceFile,
      "utf8"
    )
  );

  const resourceId =
    resources[config.workspace];

  if (!resourceId) {
    throw new Error(
      `No SPL resource configured for workspace "${config.workspace}".`
    );
  }

  return resourceId;
}

export function saveResourceId(
  resourceId: string
): void {
  ensureDirectory();

  const resources =
    existsSync(config.resourceFile)
      ? JSON.parse(
          readFileSync(
            config.resourceFile,
            "utf8"
          )
        )
      : {};

  resources[config.workspace] =
    resourceId;

  writeFileSync(
    config.resourceFile,
    JSON.stringify(
      resources,
      null,
      2
    )
  );
}

export function getProtection(): LocalProtection | null {
  if (!existsSync(config.protectionFile)) {
    return null;
  }

  const seals = JSON.parse(
    readFileSync(
      config.protectionFile,
      "utf8"
    )
  );

  return seals[config.workspace] ?? null;
}

export function requireProtection(): LocalProtection {
  const seal = getProtection();

  if (!seal) {
    throw new Error(
      `No SPL protection exists for workspace "${config.workspace}". Run spl terraform protect first.`
    );
  }

  return seal;
}

export function saveProtection(
  seal: LocalProtection
): void {
  ensureDirectory();

  const seals =
    existsSync(config.protectionFile)
      ? JSON.parse(
          readFileSync(
            config.protectionFile,
            "utf8"
          )
        )
      : {};

  seals[config.workspace] =
    seal;

  writeFileSync(
    config.protectionFile,
    JSON.stringify(
      seals,
      null,
      2
    )
  );
}
