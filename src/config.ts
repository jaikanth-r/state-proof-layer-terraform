import { resolve } from "node:path";

export interface TerraformConfig {
  workspace: string;
  terraformRoot: string;
  splBaseUrl: string;
  splToken: string;
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

  splBaseUrl:
    process.env.SPL_BASE_URL ??
    "https://127.0.0.1:3000",

  splToken:
    process.env.SPL_TOKEN ??
    "dev-token",

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
