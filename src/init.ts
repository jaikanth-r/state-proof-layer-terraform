import {
  existsSync,
  mkdirSync
} from "node:fs";
import { randomUUID } from "node:crypto";

import {
  getResourceId,
  saveResourceId
} from "./state.js";

import { config } from "./config.js";

export async function run(): Promise<void> {
  mkdirSync(
    config.splDirectory,
    { recursive: true }
  );

  if (existsSync(config.resourceFile)) {
    try {
      const resourceId = getResourceId();

      console.log(
        `Already initialized: ${config.workspace} -> ${resourceId}`
      );

      console.log(
        `Terraform root: ${config.terraformRoot}`
      );

      return;
    } catch {
      // Continue and repair an incomplete local registration.
    }
  }

  const resourceId =
    `local-${randomUUID()}`;

  saveResourceId(resourceId);

  console.log(
    `Initialized SPL Terraform workspace "${config.workspace}".`
  );

  console.log(
    `Resource ID: ${resourceId}`
  );

  console.log(
    `Terraform root: ${config.terraformRoot}`
  );

  console.log(
    `Storage: ${config.splDirectory}`
  );
}
