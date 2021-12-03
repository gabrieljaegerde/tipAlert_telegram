import { botParams } from "../../../config.js";
import { hexToString } from "@polkadot/util";
import {
    ProxyMethods,
    TipMethods,
    Modules,
    MultisigMethods,
    UtilityMethods,
} from "../../../tools/constants.js";
import { GenericCall } from "@polkadot/types";
import { logger } from "../../../tools/logger.js";
import { createKeyMulti, encodeAddress } from "@polkadot/util-crypto";

export const getTipMeta = async (tipHash, { blockHeight, blockHash }) => {
    const blockApi = await botParams.api.at(blockHash);
    let rawMeta;
    if (blockApi.query.treasury?.tips) {
        rawMeta = await blockApi.query.treasury?.tips(tipHash);
    } else {
        rawMeta = await blockApi.query.tips.tips(tipHash);
    }

    return rawMeta.toJSON();
};

export const getTipMetaByBlockHeight = async (height, tipHash) => {
    const blockHash = await botParams.api.rpc.chain.getBlockHash(height);
    return await getTipMeta(tipHash, { blockHeight: height, blockHash });
};

export const getReasonStorageReasonText = async (reasonHash, blockHash) => {
    const blockApi = await botParams.api.at(blockHash);
    let rawReasonText;
    if (blockApi.query.tips?.reasons) {
        rawReasonText = await blockApi.query.tips.reasons(reasonHash);
    } else if (blockApi.query.treasury?.reasons) {
        rawReasonText = await blockApi.query.treasury.reasons(reasonHash);
    } else {
        return null;
    }
    return rawReasonText.toHuman();
};

export const getTippersCountFromApi = async (blockHash) => {
    const blockApi = await botParams.api.at(blockHash);
    if (blockApi.consts.electionsPhragmen?.desiredMembers) {
        return parseInt(blockApi.consts.electionsPhragmen?.desiredMembers.toString());
        //.toNumber();
    } else if (blockApi.consts.phragmenElection?.desiredMembers) {
        return parseInt(blockApi.consts.phragmenElection?.desiredMembers.toString());
        //.toNumber();
    }

    throw new Error("cannot get elections desired members");
};

export const getTipFindersFeeFromApi = async (blockHash) => {
    const blockApi = await botParams.api.at(blockHash);
    if (blockApi.consts.tips?.tipFindersFee) {
        return blockApi.consts.tips?.tipFindersFee.toNumber();
    } else if (blockApi.consts.treasury?.tipFindersFee) {
        return parseInt(blockApi.consts.treasury?.tipFindersFee.toString());
        //.toNumber();
    }

    return null;
};

export const median = (values) => {
    if (!Array.isArray(values)) {
        return null;
    }

    if (values.length === 0) {
        return null;
    }

    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
};

export const computeTipValue = (tipMeta) => {
    const tipValues = (tipMeta?.tips ?? []).map((tip) => tip[1]);
    return median(tipValues);
};

export const tryInitCall = async (registry, callHex) => {
    try {
        return new GenericCall(registry, callHex);
    } catch (e) {
        logger.error(e.message, e.stack);
    }
};

export const getCall = async (blockHash, callHex) => {
    const registry = await botParams.api.getBlockRegistry(blockHash);

    return tryInitCall(registry.registry, callHex); //|| {};
}

export const getMultiSigExtrinsicAddress = (args, signer) => {
    if (!args) {
        args = {};
    }
    const { threshold, other_signatories: otherSignatories } = args;

    return calcMultisigAddress(
        [signer, ...otherSignatories],
        threshold,
        botParams.api.registry.chainSS58
    );
}

export const calcMultisigAddress = (signatories, threshold, chainSS58) => {
    const multiPub = createKeyMulti(signatories, threshold);
    return encodeAddress(multiPub, chainSS58);
}

export const getTipReason = async (normalizedExtrinsic, extrinsic) => {
    const { section, name, args } = normalizedExtrinsic;

    if (name === ProxyMethods.proxy) {
        return hexToString(args.call.args.reason);
    }

    if ([TipMethods.tipNew, TipMethods.reportAwesome].includes(name)) {
        return hexToString(args.reason);
    }

    if (Modules.Multisig === section || MultisigMethods.asMulti === name) {
        // handle multisig transaction
        const rawCall = extrinsic.method.args[3].toHex();
        const call = await getCall(
            normalizedExtrinsic.extrinsicIndexer.blockHash,
            rawCall
        );
        if (
            Modules.Treasury !== call.section ||
            [TipMethods.tipNew, TipMethods.reportAwesome].includes(call.method)
        ) {
            return;
        }
        const { args } = call.toJSON();
        const reason = args["reason"];
        return hexToString(reason);
    }

    return null;
}

export const getRealSigner = async (normalizedExtrinsic) => {
    const { section, name, args, signer } = normalizedExtrinsic;

    if (name === ProxyMethods.proxy) {
        return args.real;
    }

    if (Modules.Multisig === section || MultisigMethods.asMulti === name) {
        // handle multisig transaction
        return await getMultiSigExtrinsicAddress(args, signer);
    }
    return signer;
}

export const getTipMethodNameAndArgs = async (
    normalizedExtrinsic,
    extrinsic,
    reasonText
) => {
    const {
        section,
        name,
        args,
        extrinsicIndexer: indexer,
    } = normalizedExtrinsic;

    if (name === ProxyMethods.proxy) {
        const call = await getCall(indexer.blockHash, extrinsic.args[2].toHex());
        return [call.method, call.toJSON().args];
    }

    if (Modules.Multisig === section || MultisigMethods.asMulti === name) {
        const call = await getCall(
            indexer.blockHash,
            extrinsic.method.args[3].toHex()
        );
        return [call.method, call.toJSON().args];
    }

    if (Modules.Utility === section && UtilityMethods.batch === name) {
        const blockHash = normalizedExtrinsic.extrinsicIndexer.blockHash;
        const batchCalls = extrinsic.method.args[0];

        for (const callInBatch of batchCalls) {
            const rawCall = callInBatch.toHex();
            const call = await getCall(blockHash, rawCall);

            if (
                Modules.Treasury === call.section &&
                [TipMethods.tipNew, TipMethods.reportAwesome].includes(call.method)
            ) {
                const { args } = call.toJSON();
                const reason = args["reason"];
                if (reasonText === hexToString(reason)) {
                    return [call.method, call.toJSON().args];
                }
            }
        }
    }

    // TODO: handle other extrinsics that wrap the tip methods

    return [name, args];
}
