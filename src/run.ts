import { runTerraform } from "./terraform.js";
import { run as protect } from "./protect.js";

export async function run(
  command: "plan" | "apply",
  args: string[] = []
): Promise<void> {
  console.log(`Running terraform ${command}...`);

  runTerraform([command, ...args]);

  if (command === "plan") {
    console.log(
      "\nTerraform plan completed. No SPL protection was created."
    );
    return;
  }

  console.log(
    "\nTerraform apply completed successfully."
  );

  console.log(
    "Protecting resulting Terraform state with SPL...\n"
  );

  await protect();
}
