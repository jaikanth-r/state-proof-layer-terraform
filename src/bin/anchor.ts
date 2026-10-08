import { run } from "../anchor.js";

run().catch((error: unknown) => {
  console.error(
    error instanceof Error
      ? error.message
      : String(error)
  );

  process.exit(1);
});
