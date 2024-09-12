import { Bot } from 'grammy';
import { generateHNText, getReadingTime, sunriseFunction } from './logic.js';

/**
 * @typedef {Object} BotCommand
 * @property {string} command - The command string
 * @property {string} description - Description of the command
 * @property {Parameters<typeof bot.command>[1]} callback - The callback function for the command
 */

/** @type {Array<Omit<BotCommand, "callback">>} */
const botCommands = [];

/** @param {Bot} bot */
/** @param {BotCommand} command */
const registerCommand = (bot, command) => {
	const { callback, command: commandString, description } = command;
	bot.command(commandString, callback);
	botCommands.push({ command: commandString, description });
};

/** @param {string} botToken */
/** @param {import('grammy').BotConfig | undefined} botConfig */
/** @param {D1Database | undefined} db */
const createTelegramBot = (botToken, botConfig = undefined, db = undefined) => {
	const bot = new Bot(botToken, botConfig);

	bot.command('start', async (ctx) => {
		await ctx.reply('Hello World!');
	});

	registerCommand(bot, {
		command: 'sendhn',
		description: 'Send Hacker News articles',
		callback: async (ctx) => {
			const message = await generateHNText();
			await ctx.reply(message);
		},
	});

	bot.command('sunrise', async (ctx) => {
		const message = await sunriseFunction();
		await ctx.reply(message);
	});

	bot.command('pingadmins', async (ctx) => {
		const subscribers = await db.prepare('SELECT * FROM Subscribers').all();
		const admins = subscribers.results.filter((result) => result.IS_ADMIN === 1).map((result) => result.ID);

		await ctx.reply(`Admins: ${admins.join(', ')}\nSubscribers: ${subscribers.results.map((subscriber) => subscriber.ID).join(', ')}`);

		// Use Promise.all to send messages concurrently
		for (const admin of admins) {
			await bot.api.sendMessage(admin, 'Pong').catch((error) => {
				console.error(`Failed to send message to admin ${admin}:`, error);
			});
		}
	});

	registerCommand(bot, {
		command: 'caniread',
		description: 'Display reading statistics for an article',
		callback: async (ctx) => {
			const url = ctx.message.text.split('/caniread')[1].trim();

			const readingTime = await getReadingTime(url);

			if (!readingTime) {
				return ctx.reply(
					`Reading time for ${url} could not be calculated. Please ensure that you've entered an absolute URL. If you have, the URL may have some restrictions set on it.`
				);
			}

			ctx.reply(`Reading time for ${url}:\n${readingTime.text}`);
		},
	});

	bot.api.setMyCommands(
		botCommands.map(({ command, description }) => ({
			command,
			description,
		}))
	);

	return bot;
};

export { createTelegramBot };
