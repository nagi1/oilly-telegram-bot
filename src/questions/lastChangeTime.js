const TelegramBot = require('node-telegram-bot-api');
const { db } = require('../db.js');
const bot = require('../bot.js');
const i18n = require('../i18n');
const { collection, query, where, getDoc, getDocs, setDoc, doc, limit, Timestamp, updateDoc, serverTimestamp, addDoc } = require('firebase/firestore');
const isNumber = require('is-number');
const jse = require('../utils/js-string-escape');

const askLastChangeTime = async (/** @type {TelegramBot.Chat}*/ chat) => {
	const questionMarkup = `❓ *${i18n.__('last_change_time')}* ❓`;
	await bot.sendMessage(chat.id, jse(questionMarkup), {
		parse_mode: 'MarkdownV2',
		reply_markup: {
			force_reply: true,
			selective: true,
			input_field_placeholder: i18n.__('last_change_time_placeholder'),
		},
	});

	// open question session
	const questionSessionData = {
		id: 2,
		question: 'last_change_time',
		answer: null,
		chat_id: chat.id,
		created_at: serverTimestamp(),
	};

	await setDoc(doc(db, 'question_sessions', String(chat.id).toString()), { ...questionSessionData, created_at: serverTimestamp() });

	await bot.sendMessage(chat.id, jse(`_${i18n.__('last_change_time_explain')}_`), {
		parse_mode: 'MarkdownV2',
	});

	await bot.sendMessage(chat.id, jse(`_${i18n.__('enter_correct_then_done')}_`), {
		parse_mode: 'MarkdownV2',
		reply_markup: {
			inline_keyboard: [
				[
					{
						text: i18n.__('Done'),
						callback_data: JSON.stringify({
							type: 'done_answer',
							value: 2,
						}),
					},
				],
			],
		},
	});
};

const validationLogicForLastChangeTime = (answer) => {
	return isNumber(answer) && answer >= 0 && answer <= 365;
};
module.exports = { askLastChangeTime, validationLogicForLastChangeTime };
