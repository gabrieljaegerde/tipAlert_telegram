import { Modules, TipMethods } from "../../../tools/constants.js";
import { computeTipValue, getTipMeta, getTippersCountFromApi } from "./tipHelpers.js";
import { updateTipByTip } from "./updateTipByTip.js";

const isTipModule = (section) => {
    return section === Modules.Tips;
}

const getCommonTipUpdates = async (tipHash, indexer) => {
    const tippersCount = await getTippersCountFromApi(indexer.blockHash);
    const meta = await getTipMeta(tipHash, indexer);
    return { tippersCount, meta, medianValue: computeTipValue(meta) };
}

export const handleTipCall = async (call, author, extrinsicIndexer) => {
    if (
        !isTipModule(call.section) ||
        TipMethods.tip !== call.method
    ) {
        return;
    }
    const {
        args: { hash, tip_value: tipValue },
    } = call.toJSON();

    const updates = await getCommonTipUpdates(hash, extrinsicIndexer);
    
    await updateTipByTip(hash, updates, author, tipValue, extrinsicIndexer);
};