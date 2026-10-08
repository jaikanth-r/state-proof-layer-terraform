import { anchorLatestBatch } from "./fabric.js";

export async function run(): Promise<void> {
  await anchorLatestBatch();
}
