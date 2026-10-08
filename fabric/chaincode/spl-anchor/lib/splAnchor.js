'use strict';

const stringify = require('json-stringify-deterministic');
const sortKeysRecursive = require('sort-keys-recursive');
const { Contract } = require('fabric-contract-api');

class SplAnchor extends Contract {

    async AnchorMerkleRoot(
        ctx,
        anchorId,
        batchId,
        merkleRoot,
        algorithm,
        leafCount,
        workspace,
        createdAt
    ) {
        if (!anchorId) {
            throw new Error('anchorId is required');
        }

        if (!batchId) {
            throw new Error('batchId is required');
        }

        if (!/^[a-f0-9]{64}$/.test(merkleRoot)) {
            throw new Error('merkleRoot must be a 64-character lowercase SHA-256 hex value');
        }

        if (algorithm !== 'SHA-256') {
            throw new Error('Only SHA-256 anchors are supported');
        }

        const count = Number(leafCount);

        if (!Number.isInteger(count) || count <= 0) {
            throw new Error('leafCount must be a positive integer');
        }

        if (!workspace) {
            throw new Error('workspace is required');
        }

        if (!createdAt) {
            throw new Error('createdAt is required');
        }

        const existing = await ctx.stub.getState(anchorId);

        if (existing && existing.length > 0) {
            throw new Error(`Anchor ${anchorId} already exists`);
        }

        const anchor = {
            anchorId,
            batchId,
            merkleRoot,
            algorithm,
            leafCount: count,
            workspace,
            createdAt
        };

        await ctx.stub.putState(
            anchorId,
            Buffer.from(
                stringify(sortKeysRecursive(anchor))
            )
        );

        return JSON.stringify(anchor);
    }

    async GetAnchor(ctx, anchorId) {
        const data = await ctx.stub.getState(anchorId);

        if (!data || data.length === 0) {
            throw new Error(`Anchor ${anchorId} does not exist`);
        }

        return data.toString();
    }

    async VerifyAnchor(ctx, anchorId, merkleRoot) {
        const data = await ctx.stub.getState(anchorId);

        if (!data || data.length === 0) {
            throw new Error(`Anchor ${anchorId} does not exist`);
        }

        if (!/^[a-f0-9]{64}$/.test(merkleRoot)) {
            throw new Error('merkleRoot must be a 64-character lowercase SHA-256 hex value');
        }

        const anchor = JSON.parse(data.toString());

        return JSON.stringify({
            anchorId,
            expectedRoot: anchor.merkleRoot,
            suppliedRoot: merkleRoot,
            match: anchor.merkleRoot === merkleRoot
        });
    }
}

module.exports = SplAnchor;
