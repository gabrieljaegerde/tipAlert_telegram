import { getAlertCollection, getTipCollection, getUserCollection } from "../../mongo/db.js";
import { TipMethods } from "../../../tools/constants.js";
import { amountToHumanString, getAccountName, send } from "../../../tools/utils.js";
import { InlineKeyboard } from "grammy";
import { botParams } from "../../../config.js";
import { logger } from "../../../tools/logger.js";

const sendTipMessages = async (tip, value, tipper) => {
    const alertCol = await getAlertCollection();
    const userCol = await getUserCollection();
    const thresholdTotalCount = tip.tippersCount ? (tip.tippersCount + 1) / 2 : 0;
    const chain = botParams.settings.network.name.toLowerCase();
    const inlineKeyboard = new InlineKeyboard().url("PolkAssembly",
        `https://${chain}.polkassembly.io/tip/${tip.hash}`);

    //message finder/beneficiary (same wallet)
    if (tip.meta.who === tip.meta.finder) {
        const alert = await alertCol.findOne(
            { address: tip.meta.who }
        );
        if (alert && alert.tipped) {
            const user = await userCol.findOne({ chatId: alert.chatId });
            if (user && !user.blocked) {
                const message = `*Alert for ${await getAccountName(tip.meta.who)}*\n\n` +
                    `A tip request by and for this wallet has just been tipped ` +
                    `*${amountToHumanString(value, 2)}* by *${await getAccountName(tipper)}*.\n\n` +
                    `*Tip Reason*: _${tip.reason}_` +
                    `*Total Tips*: _${tip.meta.tips.length}/${thresholdTotalCount}_` +
                    `*Median Tip*: _${amountToHumanString(tip.medianValue, 2)}_`;
                await send(user.chatId, message, inlineKeyboard);
            }
        }
        return;
    }

    //message finder
    const alertFinder = await alertCol.findOne(
        { address: tip.meta.finder }
    );
    if (alertFinder && alertFinder.tipped) {
        const user = await userCol.findOne({ chatId: alertFinder.chatId });
        if (user && !user.blocked) {
            const message = `*Alert for ${await getAccountName(tip.meta.finder)}*\n\n` +
                `A tip request created by this wallet has just been tipped ` +
                `*${amountToHumanString(value, 2)}* by *${await getAccountName(tipper)}*.\n\n` +
                `*Tip Reason*: _${tip.reason}_\n\n` +
                `*Beneficiary*: _${await getAccountName(tip.meta.who)}_\n\n` +
                `*Total Tips*: _${tip.meta.tips.length}/${thresholdTotalCount}_\n\n` +
                `*Median Tip*: _${amountToHumanString(tip.medianValue, 2)}_\n\n` +
                `*Your Finder's Fee* (${tip.tipFindersFee}%): ` +
                `_${amountToHumanString((tip.medianValue * tip.tipFindersFee / 100).toString(), 2)}_ `;
            await send(user.chatId, message, inlineKeyboard);
        }
    }

    //message beneficiary
    const alertBeneficiary = await alertCol.findOne(
        { address: tip.meta.who }
    );
    if (alertBeneficiary && alertBeneficiary.tipped) {
        const user = await userCol.findOne({ chatId: alertBeneficiary.chatId });
        if (user && !user.blocked) {
            const thresholdTotalCount = tip.tippersCount ? (tip.tippersCount + 1) / 2 : 0;
            const message = `*Alert for ${await getAccountName(tip.meta.who)}*\n\n` +
                `A tip request for this wallet has just been tipped ` +
                `*${amountToHumanString(value, 2)}* by *${await getAccountName(tipper)}*.\n\n` +
                `*Tip Reason*: _${tip.reason}_\n\n` +
                `*Finder*: _${await getAccountName(tip.meta.finder)}_\n\n` +
                `*Total Tips*: _${tip.meta.tips.length}/${thresholdTotalCount}_\n\n` +
                `*Median Tip*: _${amountToHumanString(tip.medianValue, 2)}_\n\n` +
                `*Your Payout* (${100 - tip.tipFindersFee}%): ` +
                `_${amountToHumanString((tip.medianValue * (100 - tip.tipFindersFee) / 100).toString(), 2)}_`;
            await send(user.chatId, message, inlineKeyboard);
        }
    }
};

export const updateTipByTip = async (
    hash: string,
    updates,
    tipper,
    value,
    extrinsicIndexer
) => {
    const tipCol = await getTipCollection();
    await tipCol.updateOne(
        { hash, isClosedOrRetracted: false },
        {
            $set: updates,
            $push: {
                timeline: {
                    type: "extrinsic",
                    method: TipMethods.tip,
                    args: {
                        tipper,
                        value,
                    },
                    extrinsicIndexer,
                },
            },
        }
    );
    const tip = await tipCol.findOne({ hash, isClosedOrRetracted: false });
    if (!tip){
        logger.error(`error fetching tip with hash: ${hash} in updateTipByTip`);
        return;
    }
    sendTipMessages(tip, value, tipper);
};