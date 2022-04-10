const TelegramBot = require('node-telegram-bot-api');
const { db } = require('./db.js');
const bot = require('./bot.js');
const i18n = require('./i18n');
const { collection, query, where, getDoc, getDocs, setDoc, doc, limit, Timestamp, updateDoc, serverTimestamp } = require('firebase/firestore');
const { isThereQuestionSessionOpen, getQuestionSessionRef, askQuestionMapper, validateAndRecordMapper } = require('./questions.js');
const { calculateFacts, sendFacts, idealMileage, idealDaysTime, idealChangeFilterMileage } = require('./calculateFacts.js');
const { calculateTimetable, sendNotificationDate } = require('./calculateTimetable.js');
const { sendNotificationRecordingToTimetable } = require('./cronjobs.js');
const { handleFeedbackCommand } = require('./feedback.js');
const { changeLanguageInDatabase } = require('./setLang.js');
const jse = require('./utils/js-string-escape');

const sendWelcomeMessage = async (chatId, userFirstName) => {
	const message = `
    ${i18n.__('welcome_message', userFirstName)}

    *Change langauge /language*
    `;
	await bot.sendMessage(chatId, message, { parse_mode: 'MarkdownV2' });

	const basedOnFactsMessage = `
    ${i18n.__('my_calculations_are_based_on_facts')}:
    ⚡ ${i18n.__('Ideal mileage before changing oil is %s km.', idealMileage)}
    ⚡ ${i18n.__('Ideal days before oil it expires is %s months.', Math.round(idealDaysTime / 30))}
    ⚡ ${i18n.__('Ideal mileage before oil filter need to change is %s km.', idealChangeFilterMileage)}

    `;
	await bot.sendMessage(chatId, jse(basedOnFactsMessage), { parse_mode: 'MarkdownV2' });
};

const sendWaitingForConfirmation = async (chatId) => {
	await bot.sendMessage(chatId, i18n.__('waiting_for_confirmation'));
};

const startWelcomingSteps = async (/** @type {TelegramBot.Message}*/ message) => {
	const telegramId = message.from.id;
	const telegramName = message.from.first_name;
	let userLang = message.from.language_code.startsWith('en') ? 'en' : 'ar';

	const userSnapshot = await getDoc(doc(db, 'users', String(telegramId).toString()));

	const isNewUser = !userSnapshot.exists();

	let userData = userSnapshot.data() || {};
	// if not used before create record for the user
	userData = {
		...userData,
		...message.from,
		language_code: isNewUser ? userLang : userSnapshot.data().language_code,
		updated_at: serverTimestamp(),
	};

	userLang = isNewUser ? userLang : userSnapshot.data().language_code;

	await setDoc(doc(db, 'users', String(telegramId).toString()), { ...userData, created_at: serverTimestamp() });

	await sendWelcomeMessage(message.chat.id, telegramName, userLang);

	userData.reminder_type ? null : AskToActAsAlgorthimOrJustAReminder(message.chat.id);
};

const respondToMessage = async (/** @type {TelegramBot.Message}*/ message) => {
	// add command properties to message object
	if (message.entities && message.entities.some((e) => e.type === 'bot_command')) {
		const commandEntity = message.entities[0];
		const extractedCommand = String(message.text).substring(commandEntity.offset, commandEntity.length);
		const textWithoutCommand = String(message.text).substring(commandEntity.length + 1); // +1 account for initial space
		Object.assign(message, { isCommand: true, command: extractedCommand, textWithoutCommand });
	} else {
		Object.assign(message, { isCommand: false, command: null, textWithoutCommand: message.text });
	}

	const thereIsQuestionSessionOpen = await isThereQuestionSessionOpen(message.chat);

	// Check if the user is registered before
	if (message.isCommand && message.command === '/start') {
		await startWelcomingSteps(message);
	} else if (message.isCommand && message.command === '/test') {
		// const chat = message.chat;
		// await calculateFacts(chat);
		// await calculateTimetable(chat);
		// await sendFacts(chat);
		// await sendNotificationDate(chat);
		// await sendNotificationRecordingToTimetable();
	} else if (message.isCommand && message.command === '/feedback') {
		return await handleFeedbackCommand(message);
	} else if (message.isCommand && message.command === '/language') {
		return await changeLanguageInDatabase(message);
	} else if (thereIsQuestionSessionOpen) {
		const questionSession = (await getQuestionSessionRef(message.chat)).data();
		const isValid = await validateAndRecordMapper(questionSession.id, message);
		return !isValid ? await askQuestionMapper(questionSession.id, message.chat) : sendWaitingForConfirmation(message.chat.id);
	}
};

const AskToActAsAlgorthimOrJustAReminder = async (chatId) => {
	await bot.sendMessage(chatId, i18n.__('date_or_algorithm'), {
		reply_markup: {
			one_time_keyboard: true,
			inline_keyboard: [
				[
					{
						text: i18n.__('remind_algorithm'),
						callback_data: JSON.stringify({
							type: 'select_reminder',
							value: 'reminder_algorithm',
						}),
					},
				],
				[
					{
						text: i18n.__('remind_in_monthes'),
						callback_data: JSON.stringify({
							type: 'select_reminder',
							value: 'reminder_monthes',
						}),
					},
				],
			],
		},
	});
};

const startMonthesReminderSteps = async (/** @type {TelegramBot.Chat}*/ chat) => {
	await bot.sendMessage(chat.id, i18n.__('remind_me_in_question'), {
		reply_markup: {
			one_time_keyboard: true,
			inline_keyboard: [
				[
					{
						text: i18n.__('15 days'),
						callback_data: JSON.stringify({
							type: 'reminder_monthes',
							value: 15,
						}),
					},
					{
						text: i18n.__('1 month'),
						callback_data: JSON.stringify({
							type: 'reminder_monthes',
							value: 30,
						}),
					},
					{
						text: i18n.__('2 monthes'),
						callback_data: JSON.stringify({
							type: 'reminder_monthes',
							value: 60,
						}),
					},
					{
						text: i18n.__('3 monthes'),
						callback_data: JSON.stringify({
							type: 'reminder_monthes',
							value: 90,
						}),
					},
				],
			],
		},
	});
};
const startAlgorithmReminderSteps = async (/** @type {TelegramBot.Chat}*/ chat) => {
	askQuestionMapper(1, chat);
};

module.exports = { respondToMessage, startMonthesReminderSteps, startAlgorithmReminderSteps };
