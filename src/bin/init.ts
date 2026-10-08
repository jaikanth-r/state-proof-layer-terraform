import { run } from "../init.js";

run().catch((err) => {
  console.error(
    err instanceof Error
      ? err.message
      : String(err)
  );

  process.exit(1);
});
