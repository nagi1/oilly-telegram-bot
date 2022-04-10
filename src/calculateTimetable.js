const TelegramBot = require('node-telegram-bot-api');
const { db } = require('./db.js');
const bot = require('./bot.js');
const i18n = require('./i18n');
const { collection, query, where, getDoc, getDocs, setDoc, doc, limit, Timestamp, updateDoc, serverTimestamp, documentId, addDoc } = require('firebase/firestore');
const { Str } = require('laravel-js-str');
const dayjs = require('dayjs');
const jse = require('./utils/js-string-escape');
const { getLatestFact } = require('./calculateFacts.js');

const NOTIFICATION_TYPE_BASED_ON_IDEAL_TIME = 'ideal_time';
const NOTIFICATION_TYPE_BASED_ON_IDEAL_MILEAGE = 'ideal_mileage';

const calculateTimetable = async (/** @type {TelegramBot.Chat}*/ chat) => {
	const latestFact = await getLatestFact(chat);
	const userSnapshot = await getDoc(doc(db, 'users', String(chat.id).toString()));
	const userLang = userSnapshot.data().language_code;

	// const previousTimetable = await getTimetable(chat);
	let preferredNotificationType = NOTIFICATION_TYPE_BASED_ON_IDEAL_MILEAGE;
	let days = latestFact['expected_days_until_reaching_ideal_mileage'];

	// When the days until reaching ideal time to change
	// is greater than expected days until reaching
	// ideal mileage prefere time notification
	if (latestFact['time_until_ideal_time_in_days'] < latestFact['expected_days_until_reaching_ideal_mileage']) {
		preferredNotificationType = NOTIFICATION_TYPE_BASED_ON_IDEAL_TIME;
		days = latestFact['time_until_ideal_time_in_days'];
	}

	const notificationTimestamp = calculateNotificationTimestamp(days);

	const notificationTimetableData = {
		type: preferredNotificationType,
		based_on_facts: latestFact,
		chat_id: chat.id,
		user_language_code: userLang,
		notify_at: notificationTimestamp,
		created_at: serverTimestamp(),
		updated_at: serverTimestamp(),
		notified_at: null,
	};

	// when there is a previous timetable
	// if (previousTimetable !== false) {
	// 	return await calculateTimetableBasedOnPrevious(previousTimetable, notificationTimetableData);
	// }

	return await setTimetableData(chat, notificationTimetableData);
};

const sendNotificationDate = async (chat) => {
	const timetable = await getTimetable(chat);

	const message = `*${i18n.__('I will notify you in %s days from now to change your oil', dayjs.unix(timetable.notify_at.seconds).diff(dayjs(), 'days', false))}* 😁`;

	await bot.sendMessage(chat.id, jse(message), { parse_mode: 'MarkdownV2' });
};

const setTimetableData = async (chat, timetableData) => {
	return await setDoc(doc(db, 'notifications_timetable', String(chat.id).toString()), timetableData);
};

const calculateTimetableBasedOnPrevious = async (previousTimetable, newCalculatedTimetable) => {
	// Todo
	const { type: previousType, notify_at: previousNotifyAt, based_on_facts: previousFact } = previousTimetable;
	const { type: newType, notify_at: newNotifyAt } = newCalculatedTimetable;

	if (previousType == NOTIFICATION_TYPE_BASED_ON_IDEAL_TIME) {
		const days = previousFact['expected_days_until_reaching_ideal_mileage'];
		const previousExpectedMilageTimestamp = calculateNotificationTimestamp(days);

		if (dayjs(previousExpectedMilageTimestamp).isAfter(previousNotifyAt)) {
		}
	}
};

const calculateNotificationTimestamp = (days) => {
	return Timestamp.fromDate(dayjs().add(days, 'day').toDate());
};

const getTimetable = async (/** @type {TelegramBot.Chat}*/ chat) => {
	const timetableRef = collection(db, 'notifications_timetable');

	const timetableQuery = query(timetableRef, where(documentId(), '==', String(chat.id).toString()));
	const timetableSnapshot = await getDocs(timetableQuery);

	if (timetableSnapshot.empty) {
		return false;
	}

	return timetableSnapshot.docs.map((qaDoc) => qaDoc.data())[0];
};

// Send notification based on the time days left until recommended period
// Send notification based on expected time days to reach ideal mileage based on avarage distance per day.
// Prompt the user after days expected to reach the ideal mileage asking them if they reach the max milage.
// if the user says no, ask them for fall back to time days left until recommended period.

module.exports = { calculateTimetable, sendNotificationDate, NOTIFICATION_TYPE_BASED_ON_IDEAL_TIME, NOTIFICATION_TYPE_BASED_ON_IDEAL_MILEAGE };
