require("dotenv").config();
import { Bot } from "grammy";
import { checkCgiPageChange, ADMINS } from "../src/crons";

const token = process.env.BOT_TOKEN;
const bot = new Bot(token);

const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");

const adapter = new FileSync("db.json");
const db = low(adapter);

db.defaults({ commands: {}, tasks: {}, subscribers: [], cgiPageHash: null }).write();

console.log("🧪 Testing CGI Manchester page monitor...\n");

checkCgiPageChange(bot, db, ADMINS)
  .then(() => {
    console.log("\n✅ Test completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  });
