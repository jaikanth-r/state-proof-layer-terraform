# StateProofLayer Terraform CLI

StateProofLayer (SPL) is a Terraform state integrity platform that creates independently verifiable cryptographic evidence for infrastructure state.

This repository contains the Terraform-facing CLI component of StateProofLayer.

## Integrity Pipeline

```text
Terraform State
      │
      ▼
Canonicalization
      │
      ▼
SHA-256 State Hash
      │
      ▼
Integrity Evidence
      │
      ▼
Merkle Batch / Proof
      │
      ▼
Hyperledger Fabric Anchor
      │
      ▼
Independent Verification
```

The system is designed to detect unauthorized or unexpected changes to protected Terraform state while preserving an independently verifiable historical integrity record.

---

## Features

- Terraform state protection
- Deterministic state hashing
- SHA-256 integrity evidence
- Local evidence history
- Merkle tree construction
- Merkle proof generation and verification
- Hyperledger Fabric anchoring
- Full integrity verification
- Terraform plan/apply integration
- Protection lifecycle tracking
- Protection and Merkle batch validation
- Detection of state and evidence tampering
- Fabric anchor verification
- Idempotent Merkle batch and anchor operations

---

## CLI Commands

### Terraform Integrity Commands

```bash
spl terraform init
spl terraform protect
spl terraform status
spl terraform history
spl terraform verify
spl terraform merkle
spl terraform anchor
```

### Terraform Execution Commands

```bash
spl terraform run plan
spl terraform run apply
```

### Command Overview

| Command | Purpose |
|---|---|
| `spl terraform init` | Register the Terraform state resource with SPL |
| `spl terraform protect` | Protect the current Terraform state |
| `spl terraform status` | Display current integrity status |
| `spl terraform history` | Display protected state history |
| `spl terraform verify` | Verify the complete integrity chain |
| `spl terraform merkle` | Build or reuse a Merkle batch |
| `spl terraform anchor` | Anchor the active Merkle batch to Fabric |
| `spl terraform run plan` | Run Terraform plan without creating protection |
| `spl terraform run apply` | Run Terraform apply and protect the resulting state |

---

## Basic Workflow

Initialize SPL:

```bash
spl terraform init
```

Protect the current Terraform state:

```bash
spl terraform protect
```

Check the current status:

```bash
spl terraform status
```

View protection history:

```bash
spl terraform history
```

Build the Merkle batch:

```bash
spl terraform merkle
```

Anchor the Merkle batch:

```bash
spl terraform anchor
```

Verify the complete integrity chain:

```bash
spl terraform verify
```

---

## Terraform Integration

SPL can also be used around normal Terraform workflows.

Run a plan:

```bash
spl terraform run plan
```

Run an apply and protect the resulting state:

```bash
spl terraform run apply
```

The intended lifecycle is:

```text
Terraform Plan / Apply
          │
          ▼
   Terraform State
          │
          ▼
     SPL Protect
          │
          ▼
   Integrity Evidence
          │
          ▼
     Merkle Batch
          │
          ▼
   Fabric Anchor
          │
          ▼
      Verification
```

---

## Integrity Model

SPL separates cryptographic integrity from application storage and user interaction.

The integrity pipeline is:

```text
Terraform State
      │
      ▼
State Extraction
      │
      ▼
Canonical Representation
      │
      ▼
SHA-256
      │
      ▼
Evidence Event
      │
      ▼
Merkle Tree
      │
      ▼
Merkle Root
      │
      ▼
Hyperledger Fabric
      │
      ▼
Independent Verification
```

The cryptographic integrity layer does not depend on PostgreSQL or the web application being the source of truth.

PostgreSQL and the API belong to the wider StateProofLayer application layer and are responsible for queryable metadata, operational records, history, authentication, authorization, and application workflows.

---

## Merkle Integrity

SPL groups integrity evidence into Merkle batches.

Each evidence event contains information including:

- Event ID
- State hash
- Merkle leaf
- Merkle proof

The resulting Merkle batch contains:

- Batch ID
- Algorithm
- Creation timestamp
- Leaf count
- Merkle root
- Event proofs

SPL validates the complete Merkle structure before using it for anchoring or verification.

The active protection lifecycle is bound to its corresponding Merkle batch once the batch has been associated with the protection record.

This prevents verification or anchoring from silently switching to an unrelated newer batch.

---

## Hyperledger Fabric

Hyperledger Fabric provides the immutable anchoring layer.

SPL does not store the complete Terraform state on the blockchain.

Instead, the system anchors compact cryptographic commitments such as:

```text
Anchor ID
Batch ID
Merkle Root
Algorithm
Leaf Count
Workspace
Creation Time
```

Conceptually:

```text
SPL CLI
   │
   ▼
Fabric Gateway
   │
   ▼
SPL Anchor Chaincode
   │
   ▼
Hyperledger Fabric Ledger
```

The Fabric anchor provides an independently verifiable historical commitment.

---

## Fabric Configuration

Fabric configuration is provided through environment variables rather than hardcoded machine-specific paths.

Required variables:

```text
SPL_FABRIC_TEST_NETWORK
SPL_FABRIC_CHANNEL
SPL_FABRIC_CHAINCODE
SPL_FABRIC_MSP_ID
SPL_FABRIC_PEER_ENDPOINT
SPL_FABRIC_PEER_SERVER_NAME
SPL_FABRIC_ORG_ROOT
```

Example:

```bash
export SPL_FABRIC_TEST_NETWORK="/path/to/fabric/test-network"
export SPL_FABRIC_CHANNEL="splchannel"
export SPL_FABRIC_CHAINCODE="spl-anchor"
export SPL_FABRIC_MSP_ID="Org1MSP"
export SPL_FABRIC_PEER_ENDPOINT="peer.example.com:7051"
export SPL_FABRIC_PEER_SERVER_NAME="peer.example.com"
export SPL_FABRIC_ORG_ROOT="/path/to/org1.example.com"
```

The repository intentionally does not contain machine-specific Fabric paths or credentials.

Private keys, certificates, and other sensitive material must remain outside source control.

---

## Terraform Project Options

SPL supports specifying the Terraform project root:

```bash
spl terraform init --root ./infra
```

A Terraform workspace can also be specified:

```bash
spl terraform protect --workspace production
```

For example:

```bash
spl terraform verify --root ./infra
```

---

## Project Structure

```text
stateprooflayer-terraform/
│
├── examples/
│   └── terraform/
│       ├── main.tf
│       └── .terraform.lock.hcl
│
├── fabric/
│   └── chaincode/
│       └── spl-anchor/
│           ├── index.js
│           ├── lib/
│           │   └── splAnchor.js
│           ├── package.json
│           └── package-lock.json
│
├── src/
│   ├── bin/
│   │   ├── anchor.ts
│   │   ├── history.ts
│   │   ├── init.ts
│   │   ├── protect.ts
│   │   ├── status.ts
│   │   └── verify.ts
│   │
│   ├── anchor.ts
│   ├── cli.ts
│   ├── config.ts
│   ├── evidence.ts
│   ├── fabric.ts
│   ├── hash.ts
│   ├── history.ts
│   ├── init.ts
│   ├── merkle-batch-run.ts
│   ├── merkle-batch.ts
│   ├── merkle.ts
│   ├── protect.ts
│   ├── run.ts
│   ├── state.ts
│   ├── status.ts
│   ├── terraform.ts
│   └── verify.ts
│
├── .gitignore
├── LICENSE
├── package.json
├── package-lock.json
└── tsconfig.json
```

---

## Requirements

- Node.js 20+
- npm
- Terraform
- Hyperledger Fabric for blockchain anchoring

The current development environment uses Linux/Ubuntu for Terraform, Docker, and Fabric infrastructure.

---

## Installation

Clone the repository:

```bash
git clone git@github.com:jaikanth-r/state-proof-layer-terraform.git
cd state-proof-layer-terraform
```

Install dependencies:

```bash
npm install
```

Build the project:

```bash
npm run build
```

---

## Development

Run the TypeScript type checker:

```bash
npm run typecheck
```

Build the CLI:

```bash
npm run build
```

The package exposes the `spl` executable through the package configuration.

---

## Security

SPL is designed around the principle that application storage and user interfaces must not become the cryptographic source of truth.

The repository excludes:

- Terraform state files
- SPL local runtime data
- Environment files
- Private keys
- Certificates
- Build output
- Dependency directories
- Local Fabric runtime data
- Temporary files

Do not commit credentials or private cryptographic material.

### Trust Model

```text
Cryptographic Integrity
        │
        ├── SHA-256
        ├── Merkle Verification
        └── Hyperledger Fabric 
Application Layer
        │
        ├── API
        ├── PostgreSQL
        └── Authentication / Authorization
Presentation Layer
        │
        ├── CLI
        └── Web Application
```

PostgreSQL, the CLI, and the web interface are not treated as the cryptographic root of trust.

---

## Wider StateProofLayer Architecture

This repository is one component of the wider StateProofLayer platform.

The target platform architecture is:

```text
                    StateProofLayer
                          │
          ┌───────────────┼────────────────┐
          │               │                │
          ▼               ▼                ▼
     Terraform CLI     Web App           CI/CD
          │               │                │
          └───────────────┼────────────────┘
                          │
                          ▼
                       SPL API
                       │     │
                       │     └──────────► Hyperledger Fabric
                       │
                       ▼
                   PostgreSQL
```

The Terraform CLI is intended for infrastructure workflows, automation, and CI/CD.

The future web application will provide human-facing operations and visualization.

The API will mediate application operations between the CLI/web interfaces, PostgreSQL, and Fabric.

---

## Current Project Status

The Terraform integrity core has been validated through an end-to-end workflow involving:

```text
Terraform
    ↓
State Hash
    ↓
Evidence
    ↓
Merkle Batch
    ↓
Fabric Anchor
    ↓
Full Verification
```

The implementation has also been tested against integrity and lifecycle failure scenarios including state tampering, evidence tampering, Merkle corruption, Fabric availability failures, replay, duplicate anchoring, and lifecycle binding.

The project is currently being developed as a semi-production academic and portfolio prototype.

It is not currently positioned as a high-scale public hosted service.

---

## Roadmap

The wider StateProofLayer platform is planned in stages:

```text
Terraform CLI
     │
     ▼
SPL API
     │
     ▼
PostgreSQL
     │
     ▼
Platform CLI
     │
     ▼
Web Operations Console
     │
     ▼
AWS / S3 Integration
     │
     ▼
Customer End-to-End Workflow
     │
     ▼
Security / Adversarial Testing
     │
     ▼
CI/CD
     │
     ▼
Semi-Production Deployment
```

The Terraform integrity CLI and Fabric anchoring layer are implemented independently so that the wider platform can be built around the verified integrity foundation.

---

## License

Copyright 2026 StateProofLayer contributors.

Licensed under the Apache License, Version 2.0.

See [LICENSE](LICENSE) for the full license text.