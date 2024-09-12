import { Bot } from 'grammy';
import { generateHNText } from './logic.js';

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
/** @param {import('grammy').BotConfig} botConfig */
const createTelegramBot = (botToken, botConfig = undefined) => {
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

	bot.api.setMyCommands(
		botCommands.map(({ command, description }) => ({
			command,
			description,
		}))
	);

	return bot;
};

export { createTelegramBot };
