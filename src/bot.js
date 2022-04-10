const env = require('dotenv').config().parsed;

const TelegramBot = require('node-telegram-bot-api');
const token = env.TOKEN;
const webhookUrl = env.WEBHOOK_URL;

const bot = new TelegramBot(token);
bot.setWebHook(webhookUrl);
bot.setMyCommands([
	{ command: 'start', description: 'Start using Oilly' },
	{ command: 'feedback', description: 'Share your experience and report bugs to help improve Oilly' },
	{ command: 'language', description: 'Change Oilly language' },
]);

module.exports = bot;
