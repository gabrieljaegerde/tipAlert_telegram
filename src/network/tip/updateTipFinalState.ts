import { InlineKeyboard } from "grammy";
import { amountToHumanString, getAccountName, send } from "../../../tools/utils.js";
import { botParams } from "../../../config.js";
import { TipEvents } from "../../../tools/constants.js";
import { logger } from "../../../tools/logger.js";
import { getAlertCollection, getTipCollection, getUserCollection } from "../../mongo/db.js";
import {
    getRealSigner,
    getTipMetaByBlockHeight,
    getTipMethodNameAndArgs
} from "./tipHelpers.js";

const sendClosedMessages = async (tip, retracted) => {
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
                    `A tip request by and for this wallet has just ${retracted ? "retracted" : "closed"}.\n\n` +
                    `*Tip Reason*: _${tip.reason}_` +
                    `*Total Tips*: _${tip.meta.tips.length}/${thresholdTotalCount}_ ` +
                    `*Median Tip*: _${amountToHumanString(tip.medianValue, 2)}_` +
                    retracted ? "You will *NOT* receive a payout." : ("You will shortly receive " +
                        "payout of the median tip.");
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
                `A tip request by this wallet has just ${retracted ? "retracted" : "closed"}.\n\n` +
                `*Tip Reason*: _${tip.reason}_` +
                `*Beneficiary*: _${await getAccountName(tip.meta.who)}_\n\n` +
                `*Total Tips*: _${tip.meta.tips.length}/${thresholdTotalCount}_\n\n` +
                `*Median Tip*: _${amountToHumanString(tip.medianValue, 2)}_\n\n` +
                `*Your Finder's Fee* (${tip.tipFindersFee}%): ` +
                `_${amountToHumanString((tip.medianValue * tip.tipFindersFee / 100).toString(), 2)}_ ` +
                retracted ? "You will *NOT* receive the finder's fee." : ("You will shortly receive " +
                    "payout of the finder's fee.");
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
            const message = `*Alert for ${await getAccountName(tip.meta.finder)}*\n\n` +
                `A tip request by this wallet has just ${retracted ? "retracted" : "closed"}.\n\n` +
                `*Tip Reason*: _${tip.reason}_\n\n` +
                `*Finder*: _${await getAccountName(tip.meta.finder)}_\n\n` +
                `*Total Tips*: _${tip.meta.tips.length}/${thresholdTotalCount}_\n\n` +
                `*Median Tip*: _${amountToHumanString(tip.medianValue, 2)}_\n\n` +
                `*Your Payout* (${100 - tip.tipFindersFee}%): ` +
                `_${amountToHumanString((tip.medianValue * (100 - tip.tipFindersFee) / 100).toString(), 2)}_` +
                retracted ? "You will *NOT* receive the payout." : ("You will shortly receive " +
                    "your payout.");
            await send(user.chatId, message, inlineKeyboard);
        }
    }
};

export const updateTipFinalState = async (
    hash: string,
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
    const tip = await tipCol.findOne({ hash, isClosedOrRetracted: false });
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

    if (!tip) {
        logger.error(`error fetching tip with hash: ${hash} in updateTipFinalState`);
        return;
    }
    sendClosedMessages(tip, eventMethod === TipEvents.TipRetracted);
};