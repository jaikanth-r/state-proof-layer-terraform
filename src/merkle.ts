import { createHash } from "node:crypto";

function sha256Hex(value: string): string {
  return createHash("sha256")
    .update(value, "utf8")
    .digest("hex");
}

export function merkleLeaf(stateHash: string): string {
  return sha256Hex(`leaf:${stateHash}`);
}

export function merkleParent(left: string, right: string): string {
  return sha256Hex(`node:${left}${right}`);
}

export function buildMerkleRoot(leaves: string[]): string {
  if (leaves.length === 0) {
    throw new Error("Cannot build a Merkle tree with no leaves.");
  }

  let level = [...leaves];

  while (level.length > 1) {
    const next: string[] = [];

    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] ?? left;

      next.push(merkleParent(left, right));
    }

    level = next;
  }

  return level[0];
}

export interface MerkleProofStep {
  position: "left" | "right";
  hash: string;
}

export function buildMerkleProof(
  leaves: string[],
  targetIndex: number
): MerkleProofStep[] {
  if (leaves.length === 0) {
    throw new Error("Cannot build a proof from no leaves.");
  }

  if (
    targetIndex < 0 ||
    targetIndex >= leaves.length
  ) {
    throw new Error("Invalid Merkle leaf index.");
  }

  const proof: MerkleProofStep[] = [];
  let index = targetIndex;
  let level = [...leaves];

  while (level.length > 1) {
    const siblingIndex =
      index % 2 === 0
        ? index + 1
        : index - 1;

    const sibling =
      level[siblingIndex] ?? level[index];

    proof.push({
      position: index % 2 === 0 ? "right" : "left",
      hash: sibling
    });

    const next: string[] = [];

    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] ?? left;

      next.push(merkleParent(left, right));
    }

    index = Math.floor(index / 2);
    level = next;
  }

  return proof;
}

export function verifyMerkleProof(
  leaf: string,
  proof: MerkleProofStep[],
  expectedRoot: string
): boolean {
  let current = leaf;

  for (const step of proof) {
    current =
      step.position === "left"
        ? merkleParent(step.hash, current)
        : merkleParent(current, step.hash);
  }

  return current === expectedRoot;
}
