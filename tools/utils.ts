import BigNumber from "bignumber.js";
import { botParams } from "../config.js";
import { InlineKeyboard } from "grammy";
import { getUserCollection } from "../src/mongo/db.js";

export const amountToHuman = (amount: string, afterCommas?: number): { value: string, tokenString: string; } => {
  const decimals = parseInt(botParams.settings.network.decimals);
  const token = botParams.settings.network.token;
  const value = new BigNumber(amount.toString())
    .dividedBy(new BigNumber("1e" + decimals))
    .toFixed(afterCommas ? afterCommas : 5, BigNumber.ROUND_FLOOR);
  const tokenString = token ? " " + token : "";
  return { value: value, tokenString: tokenString };
};

export const amountToHumanString = (amount: string, afterCommas?: number): string => {
  const decimals = parseInt(botParams.settings.network.decimals);
  const token = botParams.settings.network.token;
  const value = new BigNumber(amount.toString())
    .dividedBy(new BigNumber("1e" + decimals))
    .toFixed(afterCommas ? afterCommas : 5, BigNumber.ROUND_FLOOR);
  const tokenString = token ? " " + token : "";
  return value + tokenString;
};

export const bigNumberArithmetic = (amount1: string, amount2: string, sign: string): string => {
  if (sign === "-")
    return new BigNumber(amount1.toString()).minus(new BigNumber(amount2.toString())).toString();
  else if (sign === "+")
    return new BigNumber(amount1.toString()).plus(new BigNumber(amount2.toString())).toString();
  else if (sign === "*")
    return new BigNumber(amount1.toString()).multipliedBy(new BigNumber(amount2.toString())).toString();
};

export const bigNumberComparison = (amount1: string, amount2: string, sign: string): boolean => {
  if (sign === ">=")
    return new BigNumber(amount1.toString()).isGreaterThanOrEqualTo(new BigNumber(amount2.toString()));
  else if (sign === "<")
    return new BigNumber(amount1.toString()).isLessThan(new BigNumber(amount2.toString()));
  else if (sign === ">")
    return new BigNumber(amount1.toString()).isGreaterThan(new BigNumber(amount2.toString()));
  else if (sign === "=")
    return new BigNumber(amount1.toString()).isEqualTo(new BigNumber(amount2.toString()));
};

export const asyncFilter = async (arr, predicate) => {
  const results = await Promise.all(arr.map(predicate));
  return arr.filter((_v, index) => results[index]);
};

export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), ms);
  });
};

export const send = async (id: number, message: string, parseMode: string, inlineKeyboard?: InlineKeyboard): Promise<void> => {
  try {
    if (inlineKeyboard)
      if (parseMode === "MarkdownV2") {
        await botParams.bot.api.sendMessage(id, message, { reply_markup: inlineKeyboard, parse_mode: "MarkdownV2" });
      }
      else {
        await botParams.bot.api.sendMessage(id, message, { reply_markup: inlineKeyboard, parse_mode: "Markdown" });
      }
    else
      if (parseMode === "MarkdownV2") {
        await botParams.bot.api.sendMessage(id, message, { parse_mode: "MarkdownV2" });
      }
      else {
        await botParams.bot.api.sendMessage(id, message, { parse_mode: "Markdown" });
      }
  }
  catch (error) {
    if (error.message.includes("bot was blocked by the user")) {
      const userCol = await getUserCollection();
      await userCol.findOneAndUpdate({ chatId: id },
        {
          $set: { blocked: true }
        }
      );
      console.log(new Date(), `Bot was blocked by user with chatid ${id}`);
      return;
    }
    console.log(new Date(), error);
  }
  sleep(1000);
};

export const getAccountName = async (account, short?: boolean) => {
  var accountInfo = await botParams.api.derive.accounts.info(account);
  if (accountInfo.identity.displayParent || accountInfo.identity.display) {
    var value = "";
    if (accountInfo.identity.displayParent) {
      value += accountInfo.identity.displayParent + ":";
    }
    if (accountInfo.identity.display) {
      value += accountInfo.identity.display;
    }
    return value;
  } else if (accountInfo.accountIndex) {
    return accountInfo.accountIndex;
  }
  return short ? account.substring(0, 6) + "..." + account.substring(account.length - 6) : account;
};

export const escapeMarkdown = (text) => {
  var unescaped = text.replace(/\\(\*|_|`|~|\.|!|\[|\]|\(|\)|~|>|#|\+|-|=|\||\{|\}|\\)/g, '$1'); // unescape any "backslashed" character
  var escaped = unescaped.replace(/(\*|_|`|~|\.|!|\[|\]|\(|\)|~|>|#|\+|-|=|\||\{|\}|\\)/g, '\\$1'); // escape *, _, `, ~, \
  return escaped;
};