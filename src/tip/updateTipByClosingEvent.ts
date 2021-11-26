import { getTipCollection } from "../mongo/db.js";
import {
  computeTipValue,
  getTipFindersFeeFromApi,
  getTipMeta,
  getTippersCountFromApi} from "./tipHelpers.js";

export const updateTipByClosingEvent = async (hash, state, data, extrinsic) => {
    const blockHash = extrinsic.extrinsicIndexer.blockHash;
    const meta = await getTipMeta(hash, extrinsic.extrinsicIndexer);
    const tippersCount = await getTippersCountFromApi(blockHash);
    const tipFindersFee = await getTipFindersFeeFromApi(blockHash);
    const updates = {
      tippersCount,
      tipFindersFee,
      meta,
      medianValue: computeTipValue(meta),
    };
  
    const tipCol = await getTipCollection();
    await tipCol.updateOne(
      { hash, isClosedOrRetracted: false },
      { $set: updates }
    );
    //send message to tip finder and tip beneficiary saying new tip.
  }