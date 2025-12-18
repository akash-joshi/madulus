require("dotenv").config();
import { Bot } from "grammy";
import { sendFridayReminder, ADMINS } from "../src/crons";

const token = process.env.BOT_TOKEN;
const bot = new Bot(token);

console.log("🧪 Testing Friday reminder...\n");

sendFridayReminder(bot, ADMINS)
  .then(() => {
    console.log("\n✅ Test completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  });
