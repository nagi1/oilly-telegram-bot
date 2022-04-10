const TelegramBot = require('node-telegram-bot-api');
const { db } = require('./db.js');
const bot = require('./bot.js');
const i18n = require('./i18n');
const { collection, query, where, getDoc, getDocs, setDoc, doc, limit, Timestamp, updateDoc, serverTimestamp, documentId, addDoc, orderBy } = require('firebase/firestore');
const { Str } = require('laravel-js-str');
const dayjs = require('dayjs');
const { getLatestFact } = require('./calculateFacts.js');
const { NOTIFICATION_TYPE_BASED_ON_IDEAL_MILEAGE } = require('./calculateTimetable.js');

const sendNotificationRecordingToTimetable = async () => {
	const timetableRef = collection(db, 'notifications_timetable');

	const timetableQuery = query(timetableRef, where('notify_at', '<=', Timestamp.fromDate(dayjs().toDate())), where('notified_at', '==', null), limit(1000), orderBy('notify_at'));

	const timetableSnapshot = await getDocs(timetableQuery);
	timetableSnapshot.docs.forEach(async (doc) => {
		const timetableData = doc.data();

		// change language
		i18n.setLocale(timetableData.user_language_code);

		if (timetableData.type == NOTIFICATION_TYPE_BASED_ON_IDEAL_MILEAGE) {
			return startIdealMileageSteps(doc);
		}

		return sendIdealTimeNotification(doc);
	});

	return true;
};

const startIdealMileageSteps = async (timetableDocRef) => {
	const timetableData = timetableDocRef.data();
	bot.sendMessage(
		timetableData.chat_id,
		i18n.__(
			'idea_mileage_notification_message',
			Math.round(timetableData.based_on_facts.max_mileage_reach),
			Math.round(timetableData.based_on_facts.avg_mileage_per_day),
			Math.round(timetableData.based_on_facts.expected_days_until_reaching_ideal_mileage),
		),
	);
	// mark time table as notified
	updateDoc(timetableDocRef.ref, { updated_at: serverTimestamp(), notified_at: serverTimestamp() });
};

const sendIdealTimeNotification = async (timetableDocRef) => {
	const timetableData = timetableDocRef.data();
	bot.sendMessage(timetableData.chat_id, i18n.__('idea_time_notification_message', timetableData.based_on_facts.last_change_time_in_days));
	// mark time table as notified
	updateDoc(timetableDocRef.ref, { updated_at: serverTimestamp(), notified_at: serverTimestamp() });
};

module.exports = { sendNotificationRecordingToTimetable };
