const TelegramBot = require('node-telegram-bot-api');
const { db } = require('./db.js');
const env = require('dotenv').config().parsed;
const bot = require('./bot.js');
const i18n = require('./i18n');
const { collection, query, where, getDoc, getDocs, setDoc, doc, limit, Timestamp, updateDoc, serverTimestamp, addDoc } = require('firebase/firestore');
const { isThereQuestionSessionOpen, getQuestionSessionRef, askQuestionMapper, validateAndRecordMapper } = require('./questions.js');
const { calculateFacts, sendFacts } = require('./calculateFacts.js');
const { calculateTimetable, sendNotificationDate } = require('./calculateTimetable.js');
const { sendNotificationRecordingToTimetable } = require('./cronjobs.js');

const recordFeedback = async (/** @type {TelegramBot.Message}*/ message) => {
	await addDoc(collection(db, 'feedbacks'), {
		username: message.chat.username,
		first_name: message.chat.first_name,
		message: message.text,
		created_at: serverTimestamp(),
	});

	await bot.sendMessage(949097912, `Oilly: New feedback from ${message.chat.username}: ${message.textWithoutCommand}`);
};

const handleFeedbackCommand = async (/** @type {TelegramBot.Message}*/ message) => {
	if (message.text === '/feedback') {
		return await bot.sendMessage(message.chat.id, i18n.__('send_me_your_feedback'));
	}

	await recordFeedback(message);

	return await bot.sendMessage(message.chat.id, i18n.__('thanks_for_your_feedback', message.chat.first_name));
};

module.exports = { recordFeedback, handleFeedbackCommand };
