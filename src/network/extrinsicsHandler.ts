import { GenericCall } from "@polkadot/types";
import { logger } from "../../tools/logger.js";
import { Modules, MultisigMethods, ProxyMethods, TipMethods, UtilityMethods } from "../../tools/constants.js";
import { normalizeExtrinsic } from "./eventsHandler.js";
import { handleTipCall } from "./tip/handleTipCall.js";
import { calcMultisigAddress } from "./tip/tipHelpers.js";

const extractExtrinsicEvents = (events, extrinsicIndex) => {
    return events.filter((event) => {
        const { phase } = event;
        return !phase.isNull && phase.value.toNumber() === extrinsicIndex;
    });
};

const handleCall = async (call, author, extrinsicIndexer) => {
    await handleTipCall(call, author, extrinsicIndexer);
};

const unwrapProxy = async (call, signer, extrinsicIndexer) => {
    const real = call.args[0].toJSON();
    const innerCall = call.args[2];
    await handleWrappedCall(innerCall, real, extrinsicIndexer);
};

const handleMultisig = async (call, signer, extrinsicIndexer) => {
    const callHex = call.args[3];
    const threshold = call.args[0].toNumber();
    const otherSignatories = call.args[1].toJSON();
    const multisigAddr = calcMultisigAddress(
        [signer, ...otherSignatories],
        threshold,
        call.registry.chainSS58
    );

    let innerCall;

    try {
        innerCall = new GenericCall(call.registry, callHex);
    } catch (e) {
        logger.error(`error when parse multiSig`, extrinsicIndexer);
        return;
    }

    await handleWrappedCall(innerCall, multisigAddr, extrinsicIndexer);
};

const unwrapBatch = async (call, signer, extrinsicIndexer) => {
    for (const innerCall of call.args[0]) {
        await handleWrappedCall(innerCall, signer, extrinsicIndexer);
    }
};

const handleWrappedCall = async (call, signer, extrinsicIndexer) => {
    const { section, method } = call;

    if (Modules.Proxy === section && ProxyMethods.proxy === method) {
        await unwrapProxy(call, signer, extrinsicIndexer);
    } else if (
        [Modules.Multisig, Modules.Utility].includes(section) &&
        MultisigMethods.asMulti === method
    ) {
        await handleMultisig(call, signer, extrinsicIndexer);
    } else if (Modules.Utility === section && UtilityMethods.batch === method) {
        await unwrapBatch(call, signer, extrinsicIndexer);
    }

    await handleCall(call, signer, extrinsicIndexer);
};

const extractAndHandleCall = async (extrinsic, events = [], extrinsicIndexer) => {
    const signer = extrinsic.signer.toString();
    const call = extrinsic.method;

    await handleWrappedCall(call, signer, extrinsicIndexer);
};

export const handleExtrinsics = async (extrinsics = [], allEvents = [], indexer) => {
    let index = 0;
    for (const extrinsic of extrinsics) {
        const events = extractExtrinsicEvents(allEvents, index);
        const normalized = normalizeExtrinsic(extrinsic, events);
        const extrinsicIndexer = {
            ...indexer,
            index: index++,
        };
        if (!normalized.isSuccess) {
            continue;
        }
        try {
            await extractAndHandleCall(extrinsic, events, extrinsicIndexer);
        } catch (e) {
            logger.error(`error handling extrinsic ${normalized}: ${e}`);
            return;
        }
    }
};