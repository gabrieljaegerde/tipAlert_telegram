import { getTipCollection } from "../mongo/db.js";
import {
  getRealSigner,
  getTipMetaByBlockHeight,
  getTipMethodNameAndArgs} from "./tipHelpers.js";

export const updateTipFinalState = async (
    hash,
    eventMethod,
    data,
    normalizedExtrinsic,
    extrinsic
) => {
    const indexer = normalizedExtrinsic.extrinsicIndexer;
    const meta = await getTipMetaByBlockHeight(indexer.blockHeight - 1, hash);
    const updates = {
        isClosedOrRetracted: true,
        meta,
        state: { indexer, state: eventMethod, data },
    };

    const [method, args] = await getTipMethodNameAndArgs(
        normalizedExtrinsic,
        extrinsic,
        null
    );
    const terminator = await getRealSigner(normalizedExtrinsic);

    const tipCol = await getTipCollection();
    await tipCol.updateOne(
        { hash, isClosedOrRetracted: false },
        {
            $set: updates,
            $push: {
                timeline: {
                    type: "extrinsic",
                    method,
                    args: {
                        ...args,
                        terminator,
                    },
                    extrinsicIndexer: indexer,
                },
            },
        }
    );
};