import {
  TipEvents,
} from "../../tools/constants.js";
import { getTipCollection } from "../mongo/db.js";
import {
  computeTipValue,
  getRealSigner,
  getReasonStorageReasonText,
  getTipFindersFeeFromApi,
  getTipMeta,
  getTipMethodNameAndArgs,
  getTippersCountFromApi,
  getTipReason
} from "./tipHelpers.js";

export const saveNewTip = async (hash, normalizedExtrinsic, extrinsic) => {
  const indexer = normalizedExtrinsic.extrinsicIndexer;

  const finder = await getRealSigner(normalizedExtrinsic);
  const meta = await getTipMeta(hash, indexer);
  const reason =
    (await getTipReason(normalizedExtrinsic, extrinsic)) ||
    (await getReasonStorageReasonText(meta?.reason, indexer.blockHash));
  const medianValue = computeTipValue(meta);
  const tippersCount = await getTippersCountFromApi(indexer.blockHash);
  const tipFindersFee = await getTipFindersFeeFromApi(indexer.blockHash);

  const [method, args] = await getTipMethodNameAndArgs(
    normalizedExtrinsic,
    extrinsic,
    reason
  );

  const tipCol = await getTipCollection();
  await tipCol.insertOne({
    indexer,
    hash,
    reason,
    finder,
    medianValue,
    meta,
    tippersCount,
    tipFindersFee,
    isClosedOrRetracted: false,
    state: {
      indexer: normalizedExtrinsic.extrinsicIndexer,
      state: TipEvents.NewTip,
      data: [hash],
    },
    timeline: [
      {
        type: "extrinsic",
        method,
        args: {
          ...args,
          finder,
        },
        extrinsicIndexer: indexer,
      },
    ],
  });
};