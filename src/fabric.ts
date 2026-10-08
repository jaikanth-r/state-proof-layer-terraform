import { connect, hash, signers } from "@hyperledger/fabric-gateway";
import * as grpc from "@grpc/grpc-js";
import { createPrivateKey } from "node:crypto";
import {
  readdir,
  readFile,
  writeFile,
  stat,
  mkdir
} from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import type { Contract } from "@hyperledger/fabric-gateway";

import { config } from "./config.js";
import {
  loadLatestMerkleBatch,
  validateMerkleBatch,
  type MerkleBatch
} from "./merkle-batch.js";
import {
  findEventInMerkleBatch
} from "./merkle-batch.js";
import {
  getProtection,
  saveProtection
} from "./state.js";

const fabricTestNetwork =
  process.env.SPL_FABRIC_TEST_NETWORK ??
  join(homedir(), "fabric-samples", "test-network");

const fabricChannel =
  process.env.SPL_FABRIC_CHANNEL ??
  "splchannel";

const fabricChaincode =
  process.env.SPL_FABRIC_CHAINCODE ??
  "spl-anchor";

const fabricMspId =
  process.env.SPL_FABRIC_MSP_ID ??
  "Org1MSP";

const fabricPeerEndpoint =
  process.env.SPL_FABRIC_PEER_ENDPOINT ??
  "localhost:7051";

const fabricPeerServerName =
  process.env.SPL_FABRIC_PEER_SERVER_NAME ??
  "peer0.org1.example.com";

const orgRoot = join(
  fabricTestNetwork,
  "organizations",
  "peerOrganizations",
  "org1.example.com"
);

const adminMspRoot = join(
  orgRoot,
  "users",
  "Admin@org1.example.com",
  "msp"
);

const certificatePath = join(
  adminMspRoot,
  "signcerts",
  "Admin@org1.example.com-cert.pem"
);

const privateKeyDirectory = join(
  adminMspRoot,
  "keystore"
);

const tlsRootCertificatePath = join(
  orgRoot,
  "peers",
  "peer0.org1.example.com",
  "tls",
  "ca.crt"
);

const decoder = new TextDecoder();

export interface FabricAnchorReceipt {
  anchorId: string;
  batchId: string;
  merkleRoot: string;
  algorithm: string;
  leafCount: number;
  workspace: string;
  channel: string;
  chaincode: string;
  transactionId: string | null;
  anchoredAt: string;
  status: "COMMITTED";
  source: "spl-cli" | "preexisting";
}

export interface FabricAnchor {
  anchorId: string;
  batchId: string;
  merkleRoot: string;
  algorithm: string;
  leafCount: number;
  workspace: string;
  createdAt: string;
}

function anchorsDirectory(): string {
  return join(
    config.splDirectory,
    "fabric-anchors"
  );
}

async function findPrivateKey(): Promise<string> {
  const files =
    await readdir(privateKeyDirectory);

  const keyFile =
    files.find(
      (file) =>
        file.endsWith("_sk") ||
        file.endsWith(".pem")
    );

  if (!keyFile) {
    throw new Error(
      `No private key found in ${privateKeyDirectory}`
    );
  }

  return join(
    privateKeyDirectory,
    keyFile
  );
}

async function createGateway(): Promise<{
  gateway: ReturnType<typeof connect>;
  client: grpc.Client;
}> {
  const credentials =
    await readFile(certificatePath);

  const privateKeyPem =
    await readFile(
      await findPrivateKey()
    );

  const privateKey =
    createPrivateKey(privateKeyPem);

  const signer =
    signers.newPrivateKeySigner(
      privateKey
    );

  const tlsRootCert =
    await readFile(
      tlsRootCertificatePath
    );

  const client =
    new grpc.Client(
      fabricPeerEndpoint,
      grpc.credentials.createSsl(
        tlsRootCert
      ),
      {
        "grpc.ssl_target_name_override":
          fabricPeerServerName
      }
    );

  const gateway =
    connect({
      client,
      identity: {
        mspId: fabricMspId,
        credentials
      },
      signer,
      hash: hash.sha256
    });

  return {
    gateway,
    client
  };
}

function parseAnchorResult(
  value: Uint8Array
): FabricAnchor {
  const raw =
    decoder.decode(value);

  return JSON.parse(
    raw
  ) as FabricAnchor;
}

async function readAnchor(
  contract: Contract,
  anchorId: string
): Promise<FabricAnchor | null> {
  try {
    const result =
      await contract.evaluateTransaction(
        "GetAnchor",
        anchorId
      );

    return parseAnchorResult(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    /*
     * Fabric Gateway may wrap a chaincode error such as:
     *
     *   chaincode response 500,
     *   Anchor <id> does not exist
     *
     * Treat only that specific missing-anchor condition
     * as "not found". All other Gateway/Fabric errors
     * must propagate to the caller.
     */
    if (
      /anchor .* does not exist/i.test(message)
    ) {
      return null;
    }

    throw error;
  }
}

async function saveReceipt(
  receipt: FabricAnchorReceipt
): Promise<void> {
  const directory =
    anchorsDirectory();

  await mkdir(
    directory,
    {
      recursive: true
    }
  );

  const path =
    join(
      directory,
      `${receipt.anchorId}.json`
    );

  await writeFile(
    path,
    JSON.stringify(
      receipt,
      null,
      2
    ) + "\n",
    "utf8"
  );
}

async function readExistingReceipt(
  anchorId: string
): Promise<FabricAnchorReceipt | null> {
  const path =
    join(
      anchorsDirectory(),
      `${anchorId}.json`
    );

  if (!existsSync(path)) {
    return null;
  }

  try {
    return JSON.parse(
      await readFile(
        path,
        "utf8"
      )
    ) as FabricAnchorReceipt;
  } catch {
    return null;
  }
}

function validateAnchorAgainstBatch(
  anchor: FabricAnchor,
  batch: MerkleBatch
): void {
  if (anchor.anchorId !== `spl-${batch.batchId}`) {
    throw new Error(
      "Fabric anchor ID does not match the local Merkle batch."
    );
  }

  if (anchor.batchId !== batch.batchId) {
    throw new Error(
      "Fabric batch ID does not match the local Merkle batch."
    );
  }

  if (anchor.merkleRoot !== batch.root) {
    throw new Error(
      "Fabric Merkle root does not match the local Merkle root."
    );
  }

  if (anchor.algorithm !== batch.algorithm) {
    throw new Error(
      "Fabric algorithm does not match the local Merkle batch."
    );
  }

  if (anchor.leafCount !== batch.leafCount) {
    throw new Error(
      "Fabric leaf count does not match the local Merkle batch."
    );
  }

  if (anchor.workspace !== config.workspace) {
    throw new Error(
      "Fabric workspace does not match the current SPL workspace."
    );
  }
}

async function protectBatch(
  batchId: string
): Promise<void> {
  const protection =
    getProtection();

  if (!protection) {
    return;
  }

  saveProtection({
    ...protection,
    batchId
  });
}

export async function anchorLatestBatch(): Promise<void> {
  const batch =
    loadLatestMerkleBatch();

  if (!batch) {
    throw new Error(
      "No Merkle batch exists. Run spl terraform merkle first."
    );
  }

  /*
   * This is the critical safety boundary:
   * nothing is sent to Fabric until the entire
   * local Merkle batch passes cryptographic validation.
   */
  validateMerkleBatch(batch);

  const protection =
    getProtection();

  if (!protection) {
    throw new Error(
      "No Terraform protection exists. Run spl terraform protect first."
    );
  }

  const protectedEvent =
    findEventInMerkleBatch(
      batch,
      protection.eventId
    );

  if (!protectedEvent) {
    throw new Error(
      `Latest Merkle batch ${batch.batchId} does not contain ` +
      `the currently protected event ${protection.eventId}.`
    );
  }

  if (
    protectedEvent.stateHash !==
    protection.stateHash
  ) {
    throw new Error(
      "Protected event state hash does not match the local Merkle batch."
    );
  }

  const anchorId =
    `spl-${batch.batchId}`;

  console.log();
  console.log(
    "SPL Terraform → Hyperledger Fabric"
  );
  console.log(
    "────────────────────────────────────────"
  );
  console.log(
    `Workspace:    ${config.workspace}`
  );
  console.log(
    `Batch ID:     ${batch.batchId}`
  );
  console.log(
    `Merkle root:  ${batch.root}`
  );
  console.log(
    `Algorithm:    ${batch.algorithm}`
  );
  console.log(
    `Leaf count:   ${batch.leafCount}`
  );
  console.log(
    `Channel:      ${fabricChannel}`
  );
  console.log(
    `Chaincode:    ${fabricChaincode}`
  );
  console.log(
    `Anchor ID:    ${anchorId}`
  );

  const {
    gateway,
    client
  } = await createGateway();

  try {
    const network =
      gateway.getNetwork(
        fabricChannel
      );

    const contract =
      network.getContract(
        fabricChaincode
      );

    console.log();
    console.log(
      "Checking Fabric for an existing anchor..."
    );

    const existing =
      await readAnchor(
        contract,
        anchorId
      );

    if (existing) {
      validateAnchorAgainstBatch(
        existing,
        batch
      );

      await protectBatch(
        batch.batchId
      );

      /*
       * Never overwrite an existing valid local
       * receipt with fabricated transaction metadata.
       */
      const existingReceipt =
        await readExistingReceipt(
          anchorId
        );

      if (!existingReceipt) {
        const receipt:
          FabricAnchorReceipt = {
            anchorId,
            batchId: existing.batchId,
            merkleRoot: existing.merkleRoot,
            algorithm: existing.algorithm,
            leafCount: existing.leafCount,
            workspace: existing.workspace,
            channel: fabricChannel,
            chaincode: fabricChaincode,
            transactionId: null,
            anchoredAt: existing.createdAt,
            status: "COMMITTED",
            source: "preexisting"
          };

        await saveReceipt(
          receipt
        );
      }

      console.log();
      console.log(
        "FABRIC ANCHOR ALREADY EXISTS ✓"
      );
      console.log(
        "Existing anchor matches the validated local Merkle batch."
      );
      console.log(
        `Anchor:       ${anchorId}`
      );
      console.log(
        `Receipt:      ${join(
          anchorsDirectory(),
          `${anchorId}.json`
        )}`
      );

      return;
    }

    console.log();
    console.log(
      "Submitting validated Merkle root to Fabric..."
    );

    const submitted =
      await contract.submitAsync(
        "AnchorMerkleRoot",
        {
          arguments: [
            anchorId,
            batch.batchId,
            batch.root,
            batch.algorithm,
            String(batch.leafCount),
            config.workspace,
            batch.createdAt
          ]
        }
      );

    const transactionId =
      submitted.getTransactionId();

    console.log(
      `Transaction:  ${transactionId}`
    );

    const result =
      parseAnchorResult(
        submitted.getResult()
      );

    const status =
      await submitted.getStatus();

    if (!status.successful) {
      throw new Error(
        `Fabric transaction ${transactionId} committed unsuccessfully ` +
        `with status ${status.code}.`
      );
    }

    validateAnchorAgainstBatch(
      result,
      batch
    );

    const readBack =
      await readAnchor(
        contract,
        anchorId
      );

    if (!readBack) {
      throw new Error(
        "Fabric transaction committed, but the anchor could not be read back."
      );
    }

    validateAnchorAgainstBatch(
      readBack,
      batch
    );

    const receipt:
      FabricAnchorReceipt = {
        anchorId,
        batchId: batch.batchId,
        merkleRoot: batch.root,
        algorithm: batch.algorithm,
        leafCount: batch.leafCount,
        workspace: config.workspace,
        channel: fabricChannel,
        chaincode: fabricChaincode,
        transactionId,
        anchoredAt: readBack.createdAt,
        status: "COMMITTED",
        source: "spl-cli"
      };

    await saveReceipt(
      receipt
    );

    await protectBatch(
      batch.batchId
    );

    console.log();
    console.log(
      "════════════════════════════════════════"
    );
    console.log(
      "FABRIC ANCHOR COMMITTED ✓"
    );
    console.log(
      "════════════════════════════════════════"
    );
    console.log(
      `Anchor:       ${anchorId}`
    );
    console.log(
      `Transaction:  ${transactionId}`
    );
    console.log(
      "Status:       COMMITTED"
    );
    console.log(
      "Read-back:    VERIFIED ✓"
    );
    console.log(
      `Receipt:      ${join(
        anchorsDirectory(),
        `${anchorId}.json`
      )}`
    );
  } finally {
    gateway.close();
    client.close();
  }
}

export async function getFabricAnchor(
  anchorId: string
): Promise<FabricAnchor | null> {
  const {
    gateway,
    client
  } = await createGateway();

  try {
    const network =
      gateway.getNetwork(
        fabricChannel
      );

    const contract =
      network.getContract(
        fabricChaincode
      );

    return await readAnchor(
      contract,
      anchorId
    );
  } finally {
    gateway.close();
    client.close();
  }
}
