import { getAlertCollection, getTipCollection, getUserCollection } from "../../mongo/db.js";
import { TipMethods } from "../../../tools/constants.js";
import { amountToHumanString, escapeMarkdown, getAccountName, send } from "../../../tools/utils.js";
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
        const alerts = await alertCol.find(
            { address: tip.meta.who }
        ).toArray();
        for (const alert of alerts) {
            if (alert && alert.tipped) {
                const user = await userCol.findOne({ chatId: alert.chatId });
                if (user && !user.blocked) {
                    const escapedTipReason = escapeMarkdown(tip.reason);
                    const message = `*Alert for ${escapeMarkdown(await getAccountName(tip.meta.who, true))}*\n\n` +
                        `A tip request by and for this wallet has just been tipped ` +
                        `*${escapeMarkdown(amountToHumanString(value, 2))}* by *${escapeMarkdown(await getAccountName(tipper))}*\\.\n\n` +
                        `*Tip Reason*: _${escapedTipReason}_\n\n` +
                        `*Total Tips*: _${tip.meta.tips.length}/${thresholdTotalCount}_\n\n` +
                        `*Median Tip*: _${escapeMarkdown(amountToHumanString(tip.medianValue, 2))}_`;
                    await send(user.chatId, message, "MarkdownV2", inlineKeyboard);
                }
            }
        }
        return;
    }

    //message finder
    const alertsFinder = await alertCol.find(
        { address: tip.meta.finder }
    ).toArray();
    for (const alertFinder of alertsFinder) {
        if (alertFinder && alertFinder.tipped) {
            const user = await userCol.findOne({ chatId: alertFinder.chatId });
            if (user && !user.blocked) {
                const escapedTipReason = escapeMarkdown(tip.reason);
                const findersFee = tip.meta.findersFee ? tip.tipFindersFee : 0;
                const message = `*Alert for ${escapeMarkdown(await getAccountName(tip.meta.finder, true))}*\n\n` +
                    `A tip request created by this wallet has just been tipped ` +
                    `*${escapeMarkdown(amountToHumanString(value, 2))}* by *${escapeMarkdown(await getAccountName(tipper))}*\\.\n\n` +
                    `*Tip Reason*: _${escapedTipReason}_\n\n` +
                    `*Beneficiary*: _${escapeMarkdown(await getAccountName(tip.meta.who, true))}_\n\n` +
                    `*Total Tips*: _${tip.meta.tips.length}/${thresholdTotalCount}_\n\n` +
                    `*Median Tip*: _${escapeMarkdown(amountToHumanString(tip.medianValue, 2))}_\n\n` +
                    `*Your Finder's Fee* \\(${findersFee}%\\): ` +
                    `_${escapeMarkdown(amountToHumanString((tip.medianValue * findersFee / 100).toString(), 2))}_`;
                await send(user.chatId, message, "MarkdownV2", inlineKeyboard);
            }
        }
    }

    //message beneficiary
    const alertsBeneficiary = await alertCol.find(
        { address: tip.meta.who }
    ).toArray();
    for (const alertBeneficiary of alertsBeneficiary) {
        if (alertBeneficiary && alertBeneficiary.tipped) {
            const user = await userCol.findOne({ chatId: alertBeneficiary.chatId });
            if (user && !user.blocked) {
                const escapedTipReason = escapeMarkdown(tip.reason);
                const findersFee = tip.meta.findersFee ? tip.tipFindersFee : 0;
                const thresholdTotalCount = tip.tippersCount ? (tip.tippersCount + 1) / 2 : 0;
                const message = `*Alert for ${escapeMarkdown(await getAccountName(tip.meta.who, true))}*\n\n` +
                    `A tip request for this wallet has just been tipped ` +
                    `*${amountToHumanString(value, 2)}* by *${escapeMarkdown(await getAccountName(tipper))}*\\.\n\n` +
                    `*Tip Reason*: _${escapedTipReason}_\n\n` +
                    `*Finder*: _${escapeMarkdown(await getAccountName(tip.meta.finder, true))}_\n\n` +
                    `*Total Tips*: _${tip.meta.tips.length}/${thresholdTotalCount}_\n\n` +
                    `*Median Tip*: _${escapeMarkdown(amountToHumanString(tip.medianValue, 2))}_\n\n` +
                    `*Your Payout* \\(${100 - findersFee}%\\): ` +
                    `_${escapeMarkdown(amountToHumanString((tip.medianValue * (100 - findersFee) / 100).toString(), 2))}_`;
                await send(user.chatId, message, "MarkdownV2", inlineKeyboard);
            }
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
    if (!tip) {
        logger.error(`error fetching tip with hash: ${hash} in updateTipByTip`);
        return;
    }
    sendTipMessages(tip, value, tipper);
};