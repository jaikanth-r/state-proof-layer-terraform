import { execFileSync } from "node:child_process";

import { config } from "./config.js";

export function captureTerraformState(): unknown {
  const terraformBin =
    process.env.TERRAFORM_BIN ?? "terraform";

  const rawState = execFileSync(
    terraformBin,
    ["show", "-json"],
    {
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 50,
      cwd: config.terraformRoot
    }
  );

  return JSON.parse(rawState);
}

export function runTerraform(
  args: string[]
): void {
  const terraformBin =
    process.env.TERRAFORM_BIN ?? "terraform";

  execFileSync(terraformBin, args, {
    stdio: "inherit",
    cwd: config.terraformRoot
  });
}
