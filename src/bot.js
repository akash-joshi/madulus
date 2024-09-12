import { Bot } from 'grammy';

/** @param {string} botToken */
/** @param {import('grammy').BotConfig} botConfig */
const createTelegramBot = (botToken, botConfig = undefined) => {
  const bot = new Bot(botToken, botConfig);

  bot.command("start", async (ctx) => {
    await ctx.reply("Hello World!");
  });

  bot.command("help", async (ctx) => {
    await ctx.reply("Help!");
  });

  return bot;
};

export { createTelegramBot };

