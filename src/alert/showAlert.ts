import { MenuTemplate, createBackMainMenuButtons, deleteMenuFromContext } from "grammy-inline-menu";
import { Context, InlineKeyboard, InputFile } from "grammy";
import { getAlertCollection } from "../mongo/db.js";
import { listAlertsMiddleware } from "./listAlerts.js";
import { getAccountName, send } from "../../tools/utils.js";

let alert;

export const showAlert = new MenuTemplate(async (ctx: Context) => {
    const alertCol = await getAlertCollection();
    alert = await alertCol.findOne({ address: ctx.match[1] });
    let info = `Alert for *${await getAccountName(alert.address)}*\n\n` +
        `You will be informed of the following events regarding this address:\n\n` +
        `New tip request: ${alert.new ? "✅" : "❌"}\n\n` +
        `Tip received: ${alert.tipped ? "✅" : "❌"}\n\n` +
        `Tip request closing: ${alert.closing ? "✅" : "❌"}\n\n` +
        `Tip request closed: ${alert.closed ? "✅" : "❌"}\n\n`;
    return { text: info, parse_mode: "Markdown" };
});

showAlert.select(
    "s",
    ["new", "tipped", "closing", "closed"],
    {
        showFalseEmoji: true,
        isSet: (ctx, key) => alert[key],
        set: async (ctx, key, newState) => {
            const alertCol = await getAlertCollection();
            alert[key] = newState;
            await alertCol.updateOne({ address: alert.address }, { $set: alert });
            return true;
        },
        columns: 1
    }
);

showAlert.interact("Delete Alert", "da", {
    do: async (ctx: Context) => {
        await deleteMenuFromContext(ctx);
        const alertCol = await getAlertCollection();
        await alertCol.deleteOne({ address: alert.address });
        const message = `Alert for ${alert.address} deleted.`;
        await send(ctx.chat.id, message);
        listAlertsMiddleware.replyToContext(ctx, `la/`);
        return false;
    },
    joinLastRow: false
});

showAlert.manualRow(createBackMainMenuButtons());
