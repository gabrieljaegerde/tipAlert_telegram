import { getAccountName, send } from "../../../tools/utils.js";
import {
  TipEvents,
} from "../../../tools/constants.js";
import { getAlertCollection, getTipCollection, getUserCollection } from "../../mongo/db.js";
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
import { botParams } from "../../../config.js";
import { GenericExtrinsic } from "@polkadot/types";
import { logger } from "../../../tools/logger.js";
import { InlineKeyboard } from "grammy";

const sendNewMessages = async (tip) => {
  const alertCol = await getAlertCollection();
  const userCol = await getUserCollection();
  const chain = botParams.settings.network.name.toLowerCase();
  const inlineKeyboard = new InlineKeyboard().url("PolkAssembly",
    `https://${chain}.polkassembly.io/tip/${tip.hash}`);

  //message finder/beneficiary (same wallet)
  if (tip.meta.who === tip.meta.finder) {
    const alert = await alertCol.findOne(
      { address: tip.meta.who }
    );
    if (alert && alert.new) {
      const user = await userCol.findOne({ chatId: alert.chatId });
      if (user && !user.blocked) {
        const message = `*Alert for ${await getAccountName(tip.meta.who, true)}*\n\n` +
          "A new tip request has just been created of which this wallet is " +
          "finder and beneficiary.\n\n" +
          `*Tip Reason*: _${tip.reason}_`;
        await send(user.chatId, message, inlineKeyboard);
      }
    }
    return;
  }

  //message finder
  const alertFinder = await alertCol.findOne(
    { address: tip.meta.finder }
  );
  if (alertFinder && alertFinder.new) {
    const user = await userCol.findOne({ chatId: alertFinder.chatId });
    if (user && !user.blocked) {
      const message = `*Alert for ${await getAccountName(tip.meta.finder, true)}*\n\n` +
        "A new tip request has just been created by this wallet.\n\n" +
        `*Tip Reason*: _${tip.reason}_\n\n` +
        `*Beneficiary*: _${await getAccountName(tip.meta.who, true)}_\n\n` +
        `*Your Finder's Fee*: _${tip.tipFindersFee}%_`;
      await send(user.chatId, message, inlineKeyboard);
    }
  }

  //message beneficiary
  const alertBeneficiary = await alertCol.findOne(
    { address: tip.meta.who }
  );
  if (alertBeneficiary && alertBeneficiary.new) {
    const user = await userCol.findOne({ chatId: alertBeneficiary.chatId });
    if (user && !user.blocked) {
      const message = `*Alert for ${await getAccountName(tip.meta.who, true)}*\n\n` +
        "A new tip request has just been created for this wallet.\n\n" +
        `*Tip Reason*: _${tip.reason}_\n\n` +
        `*Finder*: _${await getAccountName(tip.meta.finder, true)}_`;
      await send(user.chatId, message, inlineKeyboard);
    }
  }
};

export const saveNewTip = async (hash: string, normalizedExtrinsic, extrinsic: GenericExtrinsic) => {
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
  const tip = await tipCol.findOne({ hash, isClosedOrRetracted: false });
  if (!tip) {
    logger.error(`error fetching tip with hash: ${hash} in saveNewTip`);
    return;
  }
  sendNewMessages(tip);

};