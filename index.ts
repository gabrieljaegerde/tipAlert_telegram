import { botParams, getDb, getLocalStorage } from "./config.js";
import { getSettings } from "./tools/settings.js";
import { blockCountAdapter } from "./tools/blockCountAdapter.js";
import dotenv from "dotenv";
import * as bot from "./bot.js";
import { bigNumberArithmetic, send } from "./tools/utils.js";
import { getApi } from "./tools/substrateUtils.js";
import { ApiPromise } from "@polkadot/api";
import { Low } from "lowdb/lib";
import mongoose from "mongoose";
import { BlockListener } from "./src/network/blockListener.js";
import { getUserCollection } from "./src/mongo/db.js";

dotenv.config();

class SubstrateBot {
  settings: any;
  api: ApiPromise;
  localStorage: Low;
  /**
   * Create SubstrateBot instance
   * @param config - SubstrateBot config
   * @param config.settings - main bot settings, should contain substrate network params (name, prefix, decimals, token),
   * telegram bot token, start & validators messages, links (governance, common), list of group alerts. See sample in examples
   * @param config.api - polkadot-api instance for connect to node
   * @param config.getNetworkStats - external function for getting substrate network stats
   */
  constructor({
    settings,
    api
  }) {
    this.settings = settings;
    this.api = api;
    this.localStorage = getLocalStorage();
  }

  async run() {
    await getDb();
    botParams.api = this.api;
    botParams.localStorage = this.localStorage;
    const networkProperties = await this.api.rpc.system.properties();
    if (!this.settings.network.prefix && networkProperties.ss58Format) {
      this.settings.network.prefix = networkProperties.ss58Format.toString();
    }
    if (!this.settings.network.decimals && networkProperties.tokenDecimals) {
      this.settings.network.decimals = networkProperties.tokenDecimals.toString();
    }
    if (
      this.settings.network.token === undefined &&
      networkProperties.tokenSymbol
    ) {
      this.settings.network.token = networkProperties.tokenSymbol.toString();
    }
    botParams.settings = this.settings;
    const { runnerHandle, tBot } = await bot.start();
    botParams.bot = tBot;
    botParams.runnerHandle = runnerHandle;
    new BlockListener(botParams.api,
      new blockCountAdapter(botParams.localStorage, "headerBlock"));
  }

  async stop() {
    const userCol = await getUserCollection();
    const users = await userCol.find({});
    const alert = `🚧🚧🚧🚧🚧🚧🚧🚧🚧\nThe bot will be down for an undetermined amount of time for *maintenance*.\n\n` +
      `👷🏽‍♀️👷🏻We are working hard to get the bot running again soon and ` +
      `you will be notified when it comes back online.\n\n*Sorry for the inconvenience!*\n\n_Please ` +
      `refrain from depositing to the bot wallet until the bot is running again._\n🚧🚧🚧🚧🚧🚧🚧🚧🚧`;
    if (process.env.SETUP_COMPLETE === "true") {
      for (const user of users) {
        if (!user.blocked) {
          await send(user.chatId, alert);
        }
      }
      await botParams.runnerHandle.stop();
      console.log("bot stopped.");
    }
    await mongoose.connection.close(false);
    console.log('MongoDb connection closed.');
    process.exit(0);
  }
}

let substrateBot;
async function main() {
  const settings = getSettings();
  const api = await getApi();
  substrateBot = new SubstrateBot({
    settings,
    api
  });
  await substrateBot.run();
  const userCol = await getUserCollection();
  const users = await userCol.find({});
  const alert = `🚨The bot is back *online*!🚨`;
  if (process.env.SETUP_COMPLETE === "true") {
    for (const user of users) {
      if (!user.blocked) {
        await send(user.chatId, alert);
      }
    }
  }
  process.once('SIGINT', () => {
    substrateBot.stop();
  });
  process.once('SIGTERM', () => {
    substrateBot.stop();
  });
}

main();

