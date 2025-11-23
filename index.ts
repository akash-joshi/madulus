require("dotenv").config();
import { createHash } from "crypto";
import { Bot } from "grammy";

import { ADMINS, callSunrise, callCgiCheck, sendHn, sunriseFunction, checkCgiPageChange } from "./src/crons";
import { getReadingTime } from "./src/readingTime";

const token = process.env.BOT_TOKEN;

const bot = new Bot(token);

const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");

const adapter = new FileSync("db.json");
const db = low(adapter);

db.defaults({ commands: {}, tasks: {}, subscribers: [], cgiPageHash: null }).write();

callSunrise(bot, db);
callCgiCheck(bot, db);

type BotCommand = {
  command: string;
  description: string;
  callback: Parameters<typeof bot.command>[1];
};

const botCommands: Omit<BotCommand, "callback">[] = [];

bot.use((ctx, next) => {
  if (ctx.message && "text" in ctx.message) {
    var regex = new RegExp("@" + bot.botInfo.username.toLowerCase(), "i");
    ctx.message.text = ctx.message.text.replace(regex, "");
  }
  return next();
});

bot.command("start", (ctx) => {
  ctx.reply(`Hello ${ctx.from.first_name} ${ctx.from.id}`);
});

const registerCommand = ({ callback, command, description }: BotCommand) => {
  bot.command(command, callback);
  botCommands.push({ command, description });
};

registerCommand({
  command: "subscribe",
  description: "subscribe to HackerNews updates",
  callback: (ctx) => {
    const fromId = ctx.from.id;

    ctx.reply("Subscribed to HN Updates.");

    const subscribers = db.get("subscribers").value();

    if (!subscribers.includes(fromId)) {
      db.set("subscribers", [...subscribers, fromId]).write();
    }
  },
});

registerCommand({
  command: "unsubscribe",
  description: "unsubscribe from HackerNews updates",
  callback: (ctx) => {
    const fromId = ctx.from.id;

    ctx.reply("Unsubscribing you.");

    const subscribers = db.get("subscribers").value();

    db.set(
      "subscribers",
      subscribers.filter((id) => id !== fromId)
    ).write();
  },
});

bot.command("runcron", (ctx) => {
  const fromId = ctx.from.id;

  if (ADMINS.some((id) => id === fromId)) {
    sunriseFunction(bot, [fromId]);
  }

  sendHn(bot, [fromId], ADMINS);
});

bot.command("checkcgi", (ctx) => {
  const fromId = ctx.from.id;

  console.log({fromId})
  
  if (ADMINS.some((id) => id === fromId)) {
    ctx.reply("Checking CGI Manchester page...");
    checkCgiPageChange(bot, db, [fromId]);
  } else {
    ctx.reply("Only admins can run this command.");
  }
});

registerCommand({
  command: "todo",
  description: "add a todo to the bot",
  callback: (ctx) => {
    const fromId = ctx.message.from.id;
    const task = ctx.message.text.split("/todo")[1];
    if (task) {
      const tasks = db.has(`tasks.${fromId}`).value()
        ? [task, ...db.get(`tasks.${fromId}`).value()]
        : [task];
      db.set(`tasks.${fromId}`, tasks).write();
    }
    ctx.reply(`Task Added.`);
  },
});

registerCommand({
  command: "done",
  description: "mark a todo as done",
  callback: (ctx) => {
    const fromId = ctx.message.from.id;
    const tasks = db.has(`tasks.${fromId}`).value()
      ? db.get(`tasks.${fromId}`).value()
      : [];
    db.set(`tasks.${fromId}`, tasks.slice(1, tasks.length)).write();
    ctx.reply("Task Done.");
  },
});

registerCommand({
  command: "lstasks",
  description: "list all of the tasks that you've added",
  callback: (ctx) => {
    const fromId = ctx.message.from.id;
    const dbHasTasks = db.has(`tasks.${fromId}`).value();

    if (dbHasTasks) {
      const tasks = db.get(`tasks.${fromId}`).value();

      const returnString =
        tasks.length === 0
          ? `No tasks found`
          : tasks.map((task, index) => `${index}. ${task}`).join("\n");

      return ctx.reply(returnString);
    }

    return ctx.reply("No tasks found");
  },
});

registerCommand({
  command: "rmtask",
  description: "remove a task from the list without marking it as done",
  callback: (ctx) => {
    const fromId = ctx.message.from.id;
    const index = ctx.message.text.split(" ")[1];
    const tasks = db.has(`tasks.${fromId}`).value()
      ? db.get(`tasks.${fromId}`).value()
      : [];
    db.set(
      `tasks.${fromId}`,
      tasks.filter((_task, innerIndex) => innerIndex != index)
    ).write();
    ctx.reply("Task Removed.");
  },
});

registerCommand({
  command: "caniread",
  description: "display reading statistics for an article",
  callback: async (ctx) => {
    const url = ctx.message.text.split("/caniread")[1].trim();

    const readingTime = await getReadingTime(url);

    if (!readingTime) {
      return ctx.reply(
        `Reading time for ${url} could not be calculated. Please ensure that you've entered an absolute URL. If you have, the URL may have some restrictions set on it.`
      );
    }

    ctx.reply(`Reading time for ${url}:\n${readingTime.text}`);
  },
});

bot.inlineQuery(/https?.+/, async (ctx) => {
  const userQuery = ctx.update.inline_query.query;

  const readingTime = userQuery.trim()
    ? await getReadingTime(userQuery.trim())
    : null;

  const title = "Reading Time";

  const description =
    readingTime?.text ??
    `Reading time for ${userQuery} could not be calculated. Please ensure that you've entered an absolute URL. If you have, the URL may have some restrictions set on it.`;

  ctx.answerInlineQuery([
    {
      type: "article",
      id: `caniread-${createHash("md5")
        .update(userQuery.trim())
        .digest("hex")}`,
      title,
      description,
      input_message_content: {
        message_text: `Article: ${userQuery}\n${title}: ${description}`,
        parse_mode: "HTML",
      },
    },
  ]);
});

bot.command("analytics", (ctx) => {
  ctx.reply(`We have:\n${db.get("subscribers").value().length}`);
});

bot.on("message", (ctx) => {
  const groupId = ctx.message.chat.id;
  const fromId = ctx.message.from.id;

  if ("text" in ctx.message) {
    const command = ctx.message.text.split(" ")[0].split("/")[1];

    if (db.has(`commands.${groupId}.${command}`).value()) {
      const reply = db.get(`commands.${groupId}.${command}`).value();
      ctx.reply(reply);
    } else if (db.has(`commands.${fromId}.${command}`).value()) {
      const reply = db.get(`commands.${fromId}.${command}`).value();
      ctx.reply(reply);
    }
  }
});

// setMyCommands to botCommands
// @todo only set on prod
bot.api.setMyCommands(
  botCommands.map(({ command, description }) => ({
    command,
    description,
  }))
);

bot.start();

console.info("Bot started");
