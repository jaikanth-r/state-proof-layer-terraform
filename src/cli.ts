#!/usr/bin/env node

type TerraformArgs = {
  command?: string;
  runCommand?: "plan" | "apply";
  workspace?: string;
  root?: string;
};

function printHelp(): void {
  console.log(`
SPL Terraform

Usage:
  spl terraform <command> [options]

Commands:
  init          Register the Terraform state resource
  protect       Protect the current Terraform state
  verify        Verify the current Terraform state
  status        Show Terraform integrity status
  history       Show protected Terraform history
  merkle        Build and verify a Merkle batch from evidence
  anchor        Anchor the latest Merkle batch to Hyperledger Fabric
  run plan      Run terraform plan without creating protection
  run apply     Run terraform apply and protect the resulting state

Options:
  --workspace <name>   Terraform workspace
  --root <path>        Terraform project root

Examples:
  spl terraform init
  spl terraform init --root ./infra
  spl terraform protect --workspace production
  spl terraform verify --root ./infra
  spl terraform anchor --root ./infra
  spl terraform run plan --root ./infra
  spl terraform run apply --root ./infra
`);
}

function parseTerraformArgs(args: string[]): TerraformArgs {
  const parsed: TerraformArgs = {};
  const remaining: string[] = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "--workspace") {
      const value = args[++i];

      if (!value) {
        throw new Error("--workspace requires a value");
      }

      parsed.workspace = value;
      continue;
    }

    if (arg === "--root") {
      const value = args[++i];

      if (!value) {
        throw new Error("--root requires a value");
      }

      parsed.root = value;
      continue;
    }

    remaining.push(arg);
  }

  if (remaining[0] === "run") {
    parsed.command = "run";

    if (
      remaining[1] === "plan" ||
      remaining[1] === "apply"
    ) {
      parsed.runCommand = remaining[1];
    }

    return parsed;
  }

  parsed.command = remaining[0];

  return parsed;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (
    args.length === 0 ||
    args[0] === "--help" ||
    args[0] === "-h"
  ) {
    printHelp();
    return;
  }

  if (args[0] !== "terraform") {
    throw new Error(
      `Unknown command: ${args[0]}. Use "spl terraform --help".`
    );
  }

  const terraformArgs = args.slice(1);

  if (
    terraformArgs.length === 0 ||
    terraformArgs[0] === "--help" ||
    terraformArgs[0] === "-h"
  ) {
    printHelp();
    return;
  }

  const parsed = parseTerraformArgs(terraformArgs);

  if (!parsed.command) {
    printHelp();
    return;
  }

  if (parsed.root) {
    process.env.TF_ROOT = parsed.root;
  }

  if (parsed.workspace) {
    process.env.TF_WORKSPACE = parsed.workspace;
  }

  switch (parsed.command) {
    case "init": {
      const { run } = await import("./init.js");
      await run();
      return;
    }

    case "protect": {
      const { run } = await import("./protect.js");
      await run();
      return;
    }

    case "verify": {
      const { run } = await import("./verify.js");
      await run();
      return;
    }

    case "status": {
      const { run } = await import("./status.js");
      await run();
      return;
    }

    case "history": {
      const { run } = await import("./history.js");
      await run();
      return;
    }

    case "merkle": {
      const { run } = await import("./merkle-batch-run.js");
      run();
      return;
    }

    case "anchor": {
      const { run } = await import("./anchor.js");
      await run();
      return;
    }

    case "run": {
      if (!parsed.runCommand) {
        throw new Error(
          'Usage: spl terraform run <plan|apply>'
        );
      }

      const { run } = await import("./run.js");
      await run(parsed.runCommand);
      return;
    }

    default:
      throw new Error(
        `Unknown Terraform command: ${parsed.command}. ` +
        'Use "spl terraform --help".'
      );
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error
      ? error.message
      : String(error)
  );

  process.exit(1);
});
