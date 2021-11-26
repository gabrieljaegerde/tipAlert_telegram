import { Low, JSONFile } from 'lowdb';
import { Keyboard } from "grammy";
import mongoose from "mongoose";
import { ApiPromise } from "@polkadot/api";
import { Bot } from "grammy";
import { RunnerHandle } from '@grammyjs/runner';
import { initDb } from './src/mongo/db.js';

type BotParams = {
  api: ApiPromise,
  localStorage: Low,
  settings: any,
  bot: Bot,
  runnerHandle: RunnerHandle;
};

export const botParams: BotParams = {
  api: null,
  localStorage: null,
  settings: null,
  bot: null,
  runnerHandle: null
};

const mainKeyboard = new Keyboard()
  .text("🧙🏻‍♀️ Creator Mode").row()
  .text("🕵🏾‍♂️ Finder Mode").row()
  .text("🛠️ Account Settings");

export const getKeyboard = async (ctx): Promise<Keyboard> => {
  //const user: IUser = await User.findOne({ chatId: ctx.chat.id });
  // switch (session.menu) {
  //   case "main":
  //     return mainKeyboard;
  //   default:
  //     return mainKeyboard;
  // }
  return mainKeyboard;
};

export const getDb = async (): Promise<void> => {
  await initDb();
  // const uri = process.env.MONGO_URI;
  // try {
  //   await mongoose.connect(uri);
  //   console.log('MongoDB Connected...');
  // } catch (err) {
  //   console.log(err);
  // }
};

export const getLocalStorage = (): Low => {
  const db = new Low(new JSONFile(process.env.LOCAL_STORAGE_DB_FILE_PATH));
  return db;
};

