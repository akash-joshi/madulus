import 'dotenv/config';
import { createTelegramBot } from "./bot.js";

const bot = createTelegramBot(process.env.BOT_TOKEN);

bot.catch(console.error);

bot.start({
  drop_pending_updates: true,
  onStart: () => console.log("Bot started"),
});