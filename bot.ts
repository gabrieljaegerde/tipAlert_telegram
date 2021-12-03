import { Bot, lazySession, GrammyError, HttpError } from "grammy";
import { hydrateFiles } from "@grammyjs/files";
import { botParams, getKeyboard } from "./config.js";
import mongoose from "mongoose";
import { apiThrottler } from "@grammyjs/transformer-throttler";
import { run, RunnerHandle, sequentialize } from "@grammyjs/runner";
import { getUserCollection } from "./src/mongo/db.js";
import { listAlertsMiddleware } from "./src/alert/listAlerts.js";
import { addAlertMiddleware, enterAddress } from "./src/alert/addAlert.js";

export const start = async (): Promise<{ runnerHandle: RunnerHandle, tBot: Bot; }> => {

  /*
   *   BOT initialization
   */

  const bot = new Bot(botParams.settings.botToken);

  bot.api.config.use(apiThrottler());

  /*
   *   /start command handler
   */

  bot.command("start", async (ctx) => {
    if (ctx.chat.type == "private") {
      const userCol = await getUserCollection();
      const user = await userCol.findOne({ chatId: ctx.chat.id });

      let message: string;
      //normal start
      if (!user) {
        await userCol.insertOne({
          firstName: ctx.chat.first_name,
          username: ctx.chat.username,
          chatId: ctx.chat.id,
          type: ctx.chat.type,
          blocked: false,
          createdAt: new Date()
        });

        message = `Welcome to the TipAlert bot`;
        await ctx.reply(
          message,
          {
            reply_markup: {
              keyboard: (await getKeyboard(ctx)).build(),
              resize_keyboard: true
            },
            parse_mode: "Markdown",
          }
        );
      }
      if (user && user.blocked) {
        user.blocked = false;
        await user.save();
      }
    }
  });

  /*
   *   /menu command handler
   */

  bot.command("menu", async (ctx) => {
    if (ctx.chat.type == "private") {
      const message = "Here you go";
      await ctx.reply(
        message,
        {
          reply_markup: {
            keyboard: (await getKeyboard(ctx)).build(),
            resize_keyboard: true
          },
          parse_mode: "Markdown",
        }
      );
    }
  });

  /*
   *   react bot on 'Add alert' message
   */

  bot.hears("Add alert", async (ctx) => {
    if (ctx.chat.type == "private") {
      const message = "Here you go";
      addAlertMiddleware.replyToContext(ctx);
    }
  });

  bot.use(addAlertMiddleware);

  bot.use(listAlertsMiddleware);

  bot.use(enterAddress.middleware());

  /*
   *   react bot on 'My addresses/alerts' message
   */

  bot.hears("My addresses/alerts", async (ctx) => {
    if (ctx.chat.type == "private") {
      listAlertsMiddleware.replyToContext(ctx);
    }
  });

  /*
   *   Handle all unhandled callback queries
   */

  bot.on("callback_query:data", async (ctx, next) => {
    console.log("Unknown button event with payload", ctx.callbackQuery.data);
    await ctx.answerCallbackQuery(); // remove loading animation
  });

  /*
   *   Collect and show in console all bot errors
   */
  bot.catch(async (err) => {
    const ctx = err.ctx;
    console.error(`Error while handling update ${ctx.update.update_id}:`);
    const e = err.error;
    if (e instanceof GrammyError) {
      if (e.description.includes("bot was blocked by the user")) {
        const userCol = await getUserCollection();
        const user = await userCol.findOne({ chatId: ctx.chat.id });
        user.blocked = true;
        await user.save();
        console.log(new Date(), `Bot was blocked by user with chatid ${e.payload.chat_id}`);
        return;
      }
      console.error("Error in request:", e.description);
    } else if (e instanceof HttpError) {
      console.error("Could not contact Telegram:", e);
    } else {
      console.error("Unknown error:", e);
    }
  });
  const runnerHandle = run(bot);
  console.log(new Date(), "Bot started as", bot);
  return { runnerHandle, tBot: bot };
};
