require('dotenv').config();
import Telegraf from "telegraf";

import {
  ADMINS,
  callSunrise,
  OUTSIDERS,
  sendHn,
  sunriseFunction,
} from "./crons";

const token = process.env.BOT_TOKEN;

const bot = new Telegraf(token);

callSunrise(bot);

const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");

const adapter = new FileSync("db.json");
const db = low(adapter);

db.defaults({ commands: {}, tasks: {} }).write();

bot.command("start", (ctx) => {
  ctx.reply(`Hello ${ctx.from.first_name}`);
});

bot.use((ctx, next) => {
  if (ctx.message && ctx.message.text) {
    var regex = new RegExp("@" + bot.options.username.toLowerCase(), "i");
    ctx.message.text = ctx.message.text.replace(regex, "");
  }
  return next();
});

bot.command("ls", (ctx) => {
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
});

bot.command("runcron", (ctx) => {
  const fromId = ctx.from.id;

  if (ADMINS.some((id) => id === fromId)) {
    sunriseFunction(bot, [fromId]);
    sendHn(bot, [fromId]);

    ctx.reply("Cron running.");
  } else {
    if (OUTSIDERS.some((id) => id === fromId)) {
      sendHn(bot, [fromId]);

      ctx.reply("Cron running.");
    } else {
      ctx.reply("Not an admin.");
    }
  }
});

bot.command("add", (ctx) => {
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
});

bot.command("done", (ctx) => {
  const fromId = ctx.message.from.id;
  const tasks = db.has(`tasks.${fromId}`).value()
    ? db.get(`tasks.${fromId}`).value()
    : [];
  db.set(
    `tasks.${fromId}`,
    tasks.filter((task, innerIndex) => innerIndex != 0)
  ).write();
  ctx.reply("Task Done.");
});

bot.command("todo", (ctx) => {
  const fromId = ctx.message.from.id;
  const task = ctx.message.text.split("/todo")[1];
  if (task) {
    const tasks = db.has(`tasks.${fromId}`).value()
      ? [task, ...db.get(`tasks.${fromId}`).value()]
      : [task];
    db.set(`tasks.${fromId}`, tasks).write();
  }
  ctx.reply(`Task Added.`);
});

bot.command("lstasks", (ctx) => {
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
});

bot.command("rmtask", (ctx) => {
  const fromId = ctx.message.from.id;
  const index = ctx.message.text.split(" ")[1];
  const tasks = db.has(`tasks.${fromId}`).value()
    ? db.get(`tasks.${fromId}`).value()
    : [];
  db.set(
    `tasks.${fromId}`,
    tasks.filter((task, innerIndex) => innerIndex != index)
  ).write();
  ctx.reply("Task Removed.");
});

bot.command("remove", (ctx) => {
  const groupId = ctx.message.chat.id;
  const command = ctx.message.text.split(" ")[1];
  if (!command) {
    return ctx.reply(
      "Missing Command in Query. Remove commands as `/remove command_name`"
    );
  }
  db.unset(`commands.${groupId}.${ctx.message.text.split(" ")[1]}`).write();
  ctx.reply(`Removed /${ctx.message.text.split(" ")[1]}`);
});

bot.command("equals", (ctx) => {
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
});

bot.on("message", (ctx) => {
  const groupId = ctx.message.chat.id;
  const fromId = ctx.message.from.id;

  const command = ctx.message.text
    ? ctx.message.text.split(" ")[0].split("/")[1]
    : "";

  if (command !== "") {
    if (db.has(`commands.${groupId}.${command}`).value()) {
      const reply = db.get(`commands.${groupId}.${command}`).value();
      ctx.reply(`${reply}`);
    } else if (db.has(`commands.${fromId}.${command}`).value()) {
      const reply = db.get(`commands.${fromId}.${command}`).value();
      ctx.reply(`${reply}`);
    }
  }
});

bot.launch();

console.log("Bot started");
