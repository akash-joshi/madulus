require("dotenv").config();
import { Bot } from "grammy";

import { ADMINS, callSunrise, sendHn, sunriseFunction } from "./src/crons";
import { getReadingTime } from "./src/readingTime";

const token = process.env.BOT_TOKEN;

const bot = new Bot(token);

const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");

const adapter = new FileSync("db.json");
const db = low(adapter);

db.defaults({ commands: {}, tasks: {}, subscribers: [] }).write();

callSunrise(bot, db);

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
  ctx.reply(`Hello ${ctx.from.first_name}`);
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

  ctx.reply("Cron running.");

  if (ADMINS.some((id) => id === fromId)) {
    sunriseFunction(bot, [fromId]);
  }

  sendHn(bot, [fromId], ADMINS);
});

registerCommand({
  command: "add",
  description: "add a custom command to the bot",
  callback: (ctx) => {
    const groupId = ctx.message.chat.id;
    const command = ctx.message.text.split(" ")[1];
    const reply = ctx.message.text.split("\\")[1];
    if (!command || !reply) {
      return ctx.reply(
        `Missing Command or Reply in Query. Add commands as \`/add command_name \\ command_text \` `
      );
    }
    db.set(`commands.${groupId}.${command}`, reply).write();
    ctx.reply(`Added /${command}`);
  },
});

registerCommand({
  command: "remove",
  description: "removes a stored custom command",
  callback: (ctx) => {
    const groupId = ctx.message.chat.id;
    const command = ctx.message.text.split(" ")[1];
    if (!command) {
      return ctx.reply(
        "Missing Command in Query. Remove commands as `/remove command_name`"
      );
    }
    db.unset(`commands.${groupId}.${ctx.message.text.split(" ")[1]}`).write();
    ctx.reply(`Removed /${ctx.message.text.split(" ")[1]}`);
  },
});

registerCommand({
  command: "ls",
  description: "list all commands registered with the bot",
  callback: (ctx) => {
    const groupId = ctx.message.chat.id;
    const fromId = ctx.message.from.id;
    const commands1 = db.get(`commands.${groupId}`).value();
    const commands2 = db.get(`commands.${fromId}`).value();
    if (
      !db.has(`commands.${groupId}`).value() &&
      !db.has(`commands.${fromId}`).value()
    ) {
      return ctx.reply("No commands added. Yet !");
    }
    ctx.reply(
      `Group commands are :\n${
        commands1 ? Object.keys(commands1) : ""
      }\n\nPersonal commands are :\n${commands2 ? Object.keys(commands2) : ""}`
    );
  },
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
  command: "equals",
  description: "experimental calculator command",
  callback: (ctx) => {
    const signs = ["+", "-", "*", "/"];
    for (let sign in signs) {
      if (ctx.message.text.split(sign)[1]) {
        const command = ctx.message.text.split(" ")[1];
        const left: string = command.split(sign)[0]
          ? command.split(sign)[0].trim()
          : "0";
        const right: string = command.split(sign)[1]
          ? command.split(sign)[1].trim()
          : "0";

        if (sign === "+") {
          ctx.reply(`${parseInt(left) + parseInt(right)}`);
          break;
        } else if (sign === "-") {
          ctx.reply(`${parseInt(left) - parseInt(right)}`);
          break;
        } else if (sign === "*") {
          ctx.reply(`${parseInt(left) * parseInt(right)}`);
          break;
        } else if (sign === "/") {
          ctx.reply(`${parseInt(left) / parseInt(right)}`);
          break;
        }
      }
    }
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
