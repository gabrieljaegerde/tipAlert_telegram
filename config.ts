import { Low, JSONFile } from 'lowdb';
import { Keyboard } from "grammy";
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
  runnerHandle: null,
};

export const getKeyboard = async (ctx): Promise<Keyboard> => {
  return new Keyboard()
    .text("➕ Add alert").row()
    .text("📒 My addresses/alerts").row();
};

export const getDb = async (): Promise<void> => {
  await initDb();
};

export const getLocalStorage = (): Low => {
  const db = new Low(new JSONFile(process.env.LOCAL_STORAGE_DB_FILE_PATH));
  return db;
};

