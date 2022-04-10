const TelegramBot = require('node-telegram-bot-api');
const { db } = require('../db.js');
const bot = require('../bot.js');
const i18n = require('../i18n');
const { collection, query, where, getDoc, getDocs, setDoc, doc, limit, Timestamp, updateDoc, serverTimestamp, addDoc } = require('firebase/firestore');
const isNumber = require('is-number');
const jse = require('../utils/js-string-escape');

const askOilFilterChanged = async (/** @type {TelegramBot.Chat}*/ chat) => {
	const questionMarkup = `❓ *${i18n.__('oil_filter_changed')}* ❓`;
	await bot.sendMessage(chat.id, jse(questionMarkup), {
		parse_mode: 'MarkdownV2',
		reply_markup: {
			selective: true,
			one_time_keyboard: true,
			force_reply: true,
			resize_keyboard: true,
			input_field_placeholder: i18n.__('oil_filter_changed_placeholder'),
			keyboard: [
				[
					{
						text: 'Yes',
					},
					{
						text: 'No',
					},
				],
			],
		},
	});

	// open question session
	const questionSessionData = {
		id: 6,
		question: 'oil_filter_changed',
		chat_id: chat.id,
		answer: null,
		created_at: serverTimestamp(),
	};

	await setDoc(doc(db, 'question_sessions', String(chat.id).toString()), { ...questionSessionData, created_at: serverTimestamp() });

	await bot.sendMessage(chat.id, jse(`_${i18n.__('done_last_question')}_`), {
		parse_mode: 'MarkdownV2',
		reply_markup: {
			inline_keyboard: [
				[
					{
						text: i18n.__('Done, Notify me!'),
						callback_data: JSON.stringify({
							type: 'done_answer',
							value: 6,
						}),
					},
				],
			],
		},
	});
};

const validationLogicForOilFilterChanged = (answer) => {
	const acceptedAnswers = ['yes', 'no'];
	return acceptedAnswers.includes(String(answer).toLowerCase());
};
module.exports = { askOilFilterChanged, validationLogicForOilFilterChanged };
