import { getTipCollection } from "../../mongo/db.js";
import { logger } from "../../../tools/logger.js";
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
    const tipCol = await getTipCollection();
    const tip = await tipCol.findOne({ hash, isClosedOrRetracted: false });
    if (!tip) {
      logger.info(`tip with hash: ${hash} TipCall but doesnt exist in db.`);
      return;
    }
    await updateTipByTip(hash, updates, author, tipValue, extrinsicIndexer);
};