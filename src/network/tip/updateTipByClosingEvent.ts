import { encodeAddress } from "@polkadot/util-crypto";
import { amountToHumanString, getAccountName, send } from "../../../tools/utils.js";
import { botParams } from "../../../config.js";
import { getAlertCollection, getTipCollection, getUserCollection } from "../../mongo/db.js";
import {
  computeTipValue,
  getTipFindersFeeFromApi,
  getTipMeta,
  getTippersCountFromApi
} from "./tipHelpers.js";
import { InlineKeyboard } from "grammy";
import { logger } from "../../../tools/logger.js";

const sendClosingMessages = async (tip) => {
  const alertCol = await getAlertCollection();
  const userCol = await getUserCollection();
  const thresholdTotalCount = tip.tippersCount ? (tip.tippersCount + 1) / 2 : 0;
  const chain = botParams.settings.network.name.toLowerCase();
  const inlineKeyboard = new InlineKeyboard().url("PolkAssembly",
    `https://${chain}.polkassembly.io/tip/${tip.hash}`);

  //message finder/beneficiary (same wallet)
  if (tip.meta.who === tip.meta.finder) {
    const alerts = await alertCol.find(
      { address: tip.meta.who }
    );
    for (const alert of alerts) {
      if (alert.closing) {
        const user = await userCol.findOne({ chatId: alert.chatId });
        if (user && !user.blocked) {
          const message = `*Alert for ${await getAccountName(tip.meta.who, true)}*\n\n` +
            `A tip request for this wallet has been fully tipped and is now entering the *closing period*.\n\n` +
            `*Tip Reason*: _${tip.reason}_\n\n` +
            `*Total Tips*: _${tip.meta.tips.length}/${thresholdTotalCount}_\n\n` +
            `*Median Tip*: _${amountToHumanString(tip.medianValue, 2)}_`;
          await send(user.chatId, message, inlineKeyboard);
        }
      }
    }
    return;
  }

  //message finder
  const alertsFinder = await alertCol.find(
    { address: tip.meta.finder }
  );
  for (const alertFinder of alertsFinder) {
    if (alertFinder && alertFinder.closing) {
      const user = await userCol.findOne({ chatId: alertFinder.chatId });
      if (user && !user.blocked) {
        const message = `*Alert for ${await getAccountName(tip.meta.finder, true)}*\n\n` +
          `A tip request for this wallet has been fully tipped and is now entering the *closing period*.\n\n` +
          `*Tip Reason*: _${tip.reason}_\n\n` +
          `*Beneficiary*: _${await getAccountName(tip.meta.who, true)}_\n\n` +
          `*Total Tips*: _${tip.meta.tips.length}/${thresholdTotalCount}_\n\n` +
          `*Median Tip*: _${amountToHumanString(tip.medianValue, 2)}_\n\n` +
          `*Your Finder's Fee* (${tip.tipFindersFee}%): ` +
          `_${amountToHumanString((tip.medianValue * tip.tipFindersFee / 100).toString(), 2)}_ `;
        await send(user.chatId, message, inlineKeyboard);
      }
    }
  }

  //message beneficiary
  const alertsBeneficiary = await alertCol.find(
    { address: tip.meta.who }
  );
  for (const alertBeneficiary of alertsBeneficiary) {
    if (alertBeneficiary && alertBeneficiary.closing) {
      const user = await userCol.findOne({ chatId: alertBeneficiary.chatId });
      if (user && !user.blocked) {
        const thresholdTotalCount = tip.tippersCount ? (tip.tippersCount + 1) / 2 : 0;
        const message = `*Alert for ${await getAccountName(tip.meta.who, true)}*\n\n` +
          `A tip request for this wallet has been fully tipped and is now entering the *closing period*.\n\n` +
          `*Tip Reason*: _${tip.reason}_\n\n` +
          `*Finder*: _${await getAccountName(tip.meta.finder, true)}_\n\n` +
          `*Total Tips*: _${tip.meta.tips.length}/${thresholdTotalCount}_\n\n` +
          `*Median Tip*: _${amountToHumanString(tip.medianValue, 2)}_\n\n` +
          `*Your Payout* (${100 - tip.tipFindersFee}%): ` +
          `_${amountToHumanString((tip.medianValue * (100 - tip.tipFindersFee) / 100).toString(), 2)}_`;
        await send(user.chatId, message, inlineKeyboard);
      }
    }
  }
};

export const updateTipByClosingEvent = async (hash: string, state, data, extrinsic) => {
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
  const tip = await tipCol.findOne({ hash, isClosedOrRetracted: false });
  if (!tip) {
    logger.error(`error fetching tip with hash: ${hash} in updateTipByClosingEvent`);
    return;
  }
  sendClosingMessages(tip);
};