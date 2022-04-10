const { collection, query, where, limit, getDoc, updateDoc, doc, setDoc, serverTimestamp } = require('firebase/firestore');
const { db } = require('./db.js');
const TelegramBot = require('node-telegram-bot-api');
const i18n = require('./i18n');
const bot = require('./bot');
const { startMonthesReminderSteps, startAlgorithmReminderSteps } = require('./Oilly');
const dayjs = require('dayjs');
const { askQuestionMapper, recordQuestionAnswer } = require('./questions.js');
const { calculateTimetable, sendNotificationDate } = require('./calculateTimetable.js');
const { sendFacts, calculateFacts } = require('./calculateFacts.js');

const handleQueryCallbacks = async (/** @type {TelegramBot.CallbackQuery}*/ callbackQuery) => {
	const callbackData = JSON.parse(callbackQuery.data);

	switch (callbackData.type) {
		case 'select_reminder':
			return await handleSelectReminderCallback(callbackQuery, callbackData);
		case 'reminder_monthes':
			return await handleMonthesReminderCallback(callbackQuery, callbackData);
		case 'done_answer':
			return await handleQuestionAnswerConfirmation(callbackQuery, callbackData);
	}
};

const handleSelectReminderCallback = async (/** @type {TelegramBot.CallbackQuery}*/ callbackQuery, callbackData) => {
	if (callbackData.value == 'reminder_monthes') {
		return await startMonthesReminderSteps(callbackQuery.message.chat);
	} else if (callbackData.value == 'reminder_algorithm') {
		return await startAlgorithmReminderSteps(callbackQuery.message.chat);
	}
};

const handleMonthesReminderCallback = async (/** @type {TelegramBot.CallbackQuery}*/ callbackQuery, callbackData) => {
	const telegramId = callbackQuery.from.id;
	const chatId = callbackQuery.message.chat.id;

	const remindAfter = callbackData.value;
	const remindAfterInMonthes = callbackData.value / 30;
	const remindAfterUnix = dayjs.unix(callbackQuery.message.date).add(remindAfter, 'day').unix();

	const reminderData = {
		remind_after_timestamp: remindAfterUnix,
	};

	await updateDoc(doc(db, 'users', String(telegramId).toString()), {
		reminder_type: 'reminder_monthes',
	});
	await setDoc(doc(db, 'reminders', String(telegramId).toString()), { ...reminderData, created_at: serverTimestamp() });

	await bot.sendMessage(chatId, i18n.__('will_remind_you_in', remindAfterInMonthes, dayjs.unix(remindAfterUnix).format('DD/MM/YYYY')));
};

const handleQuestionAnswerConfirmation = async (/** @type {TelegramBot.CallbackQuery}*/ callbackQuery, callbackData) => {
	const chat = callbackQuery.message.chat;
	const questionId = callbackData.value;

	await recordQuestionAnswer(questionId, chat);

	// make sure that the answer is recorded
	const answerRecord = (await getDoc(doc(db, 'questions_answers', String(`${chat.id}_${questionId}`).toString()))).data();

	if (!answerRecord.answer) {
		return await askQuestionMapper(questionId, chat);
	}

	return questionId < 6 ? await askQuestionMapper(questionId + 1, chat) : await finishSteps(chat);
};

const finishSteps = async (chat) => {
	await calculateFacts(chat);
	await calculateTimetable(chat);
	await sendFacts(chat);
	await sendNotificationDate(chat);

	return true;
};

module.exports = handleQueryCallbacks;
