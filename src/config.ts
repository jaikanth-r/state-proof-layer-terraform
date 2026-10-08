import { resolve } from "node:path";

export interface TerraformConfig {
  workspace: string;
  terraformRoot: string;
  splDirectory: string;
  resourceFile: string;
  protectionFile: string;
}

const workspace =
  process.env.TF_WORKSPACE ?? "default";

const terraformRoot =
  resolve(
    process.env.TF_ROOT ?? process.cwd()
  );

const splDirectory =
  resolve(
    terraformRoot,
    ".spl",
    "terraform"
  );

export const config: TerraformConfig = {
  workspace,

  terraformRoot,

  splDirectory,

  resourceFile:
    resolve(
      splDirectory,
      "resources.json"
    ),

  protectionFile:
    resolve(
      splDirectory,
      "protection.json"
    )
};
