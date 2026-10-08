import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

import {
  buildMerkleProof,
  buildMerkleRoot,
  merkleLeaf,
  verifyMerkleProof
} from "./merkle.js";

import { config } from "./config.js";

export interface MerkleBatchEvent {
  eventId: string;
  stateHash: string;
  leaf: string;
  proof: {
    position: "left" | "right";
    hash: string;
  }[];
}

export interface MerkleBatch {
  batchId: string;
  algorithm: "SHA-256";
  createdAt: string;
  leafCount: number;
  root: string;
  events: MerkleBatchEvent[];
}

const BATCH_DIRECTORY =
  join(
    config.splDirectory,
    "merkle-batches"
  );

function isSha256(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[a-f0-9]{64}$/.test(value)
  );
}

function fail(message: string): never {
  throw new Error(
    `Invalid Merkle batch: ${message}`
  );
}

/**
 * Performs complete cryptographic and structural
 * validation of a Merkle batch.
 *
 * This is the authoritative validator used by:
 *   - merkle
 *   - anchor
 *   - verify
 */
export function validateMerkleBatch(
  batch: MerkleBatch
): void {
  if (!batch || typeof batch !== "object") {
    fail("batch is not an object.");
  }

  if (typeof batch.batchId !== "string" || !batch.batchId) {
    fail("missing batchId.");
  }

  if (batch.algorithm !== "SHA-256") {
    fail("unsupported algorithm.");
  }

  if (
    typeof batch.createdAt !== "string" ||
    !batch.createdAt
  ) {
    fail("missing createdAt.");
  }

  if (
    !Number.isInteger(batch.leafCount) ||
    batch.leafCount <= 0
  ) {
    fail("leafCount must be a positive integer.");
  }

  if (!isSha256(batch.root)) {
    fail("root must be a lowercase SHA-256 hex string.");
  }

  if (!Array.isArray(batch.events)) {
    fail("events must be an array.");
  }

  if (batch.events.length !== batch.leafCount) {
    fail(
      `leafCount ${batch.leafCount} does not match ` +
      `event count ${batch.events.length}.`
    );
  }

  if (batch.events.length === 0) {
    fail("batch contains no events.");
  }

  const eventIds = new Set<string>();
  const leaves: string[] = [];

  for (let index = 0; index < batch.events.length; index++) {
    const event = batch.events[index];

    if (
      !event ||
      typeof event !== "object"
    ) {
      fail(`event ${index} is invalid.`);
    }

    if (
      typeof event.eventId !== "string" ||
      !event.eventId
    ) {
      fail(`event ${index} is missing eventId.`);
    }

    if (eventIds.has(event.eventId)) {
      fail(
        `duplicate eventId: ${event.eventId}.`
      );
    }

    eventIds.add(event.eventId);

    if (!isSha256(event.stateHash)) {
      fail(
        `event ${event.eventId} has an invalid stateHash.`
      );
    }

    const expectedLeaf =
      merkleLeaf(event.stateHash);

    if (event.leaf !== expectedLeaf) {
      fail(
        `event ${event.eventId} has an invalid leaf.`
      );
    }

    if (!Array.isArray(event.proof)) {
      fail(
        `event ${event.eventId} has an invalid proof.`
      );
    }

    for (
      let proofIndex = 0;
      proofIndex < event.proof.length;
      proofIndex++
    ) {
      const step =
        event.proof[proofIndex];

      if (
        !step ||
        (
          step.position !== "left" &&
          step.position !== "right"
        )
      ) {
        fail(
          `event ${event.eventId} has an invalid ` +
          `proof position at step ${proofIndex}.`
        );
      }

      if (!isSha256(step.hash)) {
        fail(
          `event ${event.eventId} has an invalid ` +
          `proof hash at step ${proofIndex}.`
        );
      }
    }

    leaves.push(expectedLeaf);
  }

  const reconstructedRoot =
    buildMerkleRoot(leaves);

  if (reconstructedRoot !== batch.root) {
    fail(
      `stored root does not match reconstructed root. ` +
      `stored=${batch.root} ` +
      `reconstructed=${reconstructedRoot}`
    );
  }

  for (
    let index = 0;
    index < batch.events.length;
    index++
  ) {
    const event = batch.events[index];

    const expectedProof =
      buildMerkleProof(
        leaves,
        index
      );

    if (
      JSON.stringify(event.proof) !==
      JSON.stringify(expectedProof)
    ) {
      fail(
        `event ${event.eventId} contains an invalid ` +
        `Merkle proof structure.`
      );
    }

    const proofValid =
      verifyMerkleProof(
        event.leaf,
        event.proof,
        batch.root
      );

    if (!proofValid) {
      fail(
        `event ${event.eventId} proof does not ` +
        `reconstruct the batch root.`
      );
    }
  }
}

export function createMerkleBatch(
  events: {
    eventId: string;
    stateHash: string;
  }[]
): MerkleBatch {
  if (events.length === 0) {
    throw new Error(
      "Cannot create a Merkle batch from no evidence events."
    );
  }

  const leaves =
    events.map(
      (event) => merkleLeaf(event.stateHash)
    );

  const root =
    buildMerkleRoot(leaves);

  const batch: MerkleBatch = {
    batchId: randomUUID(),
    algorithm: "SHA-256",
    createdAt: new Date().toISOString(),
    leafCount: events.length,
    root,
    events: events.map(
      (event, index) => ({
        eventId: event.eventId,
        stateHash: event.stateHash,
        leaf: leaves[index],
        proof: buildMerkleProof(
          leaves,
          index
        )
      })
    )
  };

  validateMerkleBatch(batch);

  return batch;
}

export function saveMerkleBatch(
  batch: MerkleBatch
): void {
  validateMerkleBatch(batch);

  mkdirSync(
    BATCH_DIRECTORY,
    { recursive: true }
  );

  const file =
    join(
      BATCH_DIRECTORY,
      `batch-${batch.batchId}.json`
    );

  writeFileSync(
    file,
    JSON.stringify(batch, null, 2) + "\n",
    "utf8"
  );
}

export function loadMerkleBatch(
  batchId: string
): MerkleBatch {
  const file =
    join(
      BATCH_DIRECTORY,
      `batch-${batchId}.json`
    );

  if (!existsSync(file)) {
    throw new Error(
      `Merkle batch ${batchId} was not found.`
    );
  }

  const batch =
    JSON.parse(
      readFileSync(
        file,
        "utf8"
      )
    ) as MerkleBatch;

  validateMerkleBatch(batch);

  return batch;
}

export function loadLatestMerkleBatch(): MerkleBatch | null {
  if (!existsSync(BATCH_DIRECTORY)) {
    return null;
  }

  const files =
    readdirSync(
      BATCH_DIRECTORY
    )
      .filter(
        (file) =>
          file.startsWith("batch-") &&
          file.endsWith(".json")
      );

  if (files.length === 0) {
    return null;
  }

  const batches =
    files.map(
      (file) =>
        JSON.parse(
          readFileSync(
            join(BATCH_DIRECTORY, file),
            "utf8"
          )
        ) as MerkleBatch
    );

  batches.sort(
    (a, b) =>
      Date.parse(b.createdAt) -
      Date.parse(a.createdAt)
  );

  const latest =
    batches[0];

  validateMerkleBatch(latest);

  return latest;
}

export function findEventInMerkleBatch(
  batch: MerkleBatch,
  eventId: string
): MerkleBatchEvent | null {
  return (
    batch.events.find(
      (event) =>
        event.eventId === eventId
    ) ?? null
  );
}
