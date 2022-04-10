const TelegramBot = require('node-telegram-bot-api');
const { db } = require('./db.js');
const bot = require('./bot.js');
const i18n = require('./i18n');
const { collection, query, where, getDoc, getDocs, setDoc, doc, limit, Timestamp, updateDoc, serverTimestamp, documentId, addDoc, orderBy } = require('firebase/firestore');
const { Str } = require('laravel-js-str');
const jse = require('./utils/js-string-escape');
const { getQuestions } = require('./questions.js');

const idealMileage = 5000; // km
const idealDaysTime = 180; // days
const idealChangeFilterMileage = 6000; // km

const calculateFacts = async (/** @type {TelegramBot.Chat}*/ chat) => {
	const questionsAnswers = await getQuestions(chat);

	const getQuestionAnswer = (questionSlug) => questionsAnswers.find((q) => q.question == questionSlug).answer;

	const currentMileage = parseInt(getQuestionAnswer('current_mileage_question'));

	const oilChangeType = parseInt(getQuestionAnswer('oil_change_type'));

	const mileageDifferenceSinceLastChange = currentMileage - parseInt(getQuestionAnswer('last_change_mileage_question'));

	const lastChangeTimeInDays = parseInt(getQuestionAnswer('last_change_time'));

	const mileageUntilIdealMileage = mileageDifferenceSinceLastChange >= oilChangeType ? 0 : idealMileage - mileageDifferenceSinceLastChange;

	const maxMilageReach = currentMileage + mileageUntilIdealMileage;

	const lastChangeTimeInMonths = lastChangeTimeInDays / 30;

	const avgMileagePerDay = mileageDifferenceSinceLastChange / lastChangeTimeInDays;

	const TimeUntilIdealTimeInDays = idealDaysTime - lastChangeTimeInDays;

	const TimeUntilIdealTimeInMonths = TimeUntilIdealTimeInDays / 30;

	const expectedDaysUntilReachingIdealMileage = mileageUntilIdealMileage / avgMileagePerDay;

	const mileageUntilIdealChangeFilterMileage = idealChangeFilterMileage - mileageDifferenceSinceLastChange;

	const changeOilFilter = () => {
		if (getQuestionAnswer('oil_filter_changed') == 'No') return true;

		return mileageDifferenceSinceLastChange >= idealChangeFilterMileage ? true : false;
	};

	const factsData = {
		chat_id: chat.id,
		ideal_mileage: idealMileage,
		mileage_until_ideal_change_filter_mileage: mileageUntilIdealChangeFilterMileage,
		ideal_days_time: idealDaysTime,
		ideal_change_filter_mileage: idealChangeFilterMileage,
		current_mileage: currentMileage,
		max_mileage_reach: maxMilageReach,
		mileage_difference_since_last_change: mileageDifferenceSinceLastChange,
		last_change_time_in_days: lastChangeTimeInDays,
		last_change_time_in_months: lastChangeTimeInMonths,
		avg_mileage_per_day: avgMileagePerDay,
		mileage_until_ideal_mileage: mileageUntilIdealMileage,
		time_until_ideal_time_in_months: TimeUntilIdealTimeInMonths,
		time_until_ideal_time_in_days: TimeUntilIdealTimeInDays,
		expected_days_until_reaching_ideal_mileage: expectedDaysUntilReachingIdealMileage,
		oil_change_type: oilChangeType,
		change_oil_filter: changeOilFilter(),
		created_at: serverTimestamp(),
	};

	await addDoc(collection(db, 'facts'), factsData);
};

const sendFacts = async (/** @type {TelegramBot.Chat}*/ chat) => {
	const facts = await getLatestFact(chat);

	const message = `
    __${i18n.__('Here are some facts for you:')}__

    ✅ *${i18n.__('Last time you changed the oil were:')}* ${Math.round(facts.last_change_time_in_days)} ${i18n.__('days ago')}.
    ✅ *${i18n.__('Average mileage per day:')}* ${Math.round(facts.avg_mileage_per_day)} ${i18n.__('km')}.
    ✅ *${i18n.__('Expected days to change oil based on distance:')}* ${Math.round(facts.expected_days_until_reaching_ideal_mileage)} ${i18n.__('days')}.
    ✅ *${i18n.__('Max drive mileage before changing oil:')}* ${Math.round(facts.max_mileage_reach)} ${i18n.__('km')}.
    ✅ *${i18n.__('Distance drove since last change:')}* ${Math.round(facts.mileage_difference_since_last_change)} ${i18n.__('km')}.
    ✅ *${i18n.__('Expected days to change oil based on oil oxidation time:')}* ${Math.round(facts.time_until_ideal_time_in_days)} ${i18n.__('Days')}.
    ✅ *${facts.change_oil_filter ? i18n.__('Change Oil filter next time.') : i18n.__('Your Oil filter is good for another %s km.', facts.mileage_until_ideal_change_filter_mileage)}*
    `;

	await bot.sendMessage(chat.id, jse(message), { parse_mode: 'MarkdownV2' });
};

const getLatestFact = async (/** @type {TelegramBot.Chat}*/ chat) => {
	const factsRef = collection(db, 'facts');

	const factsQuery = query(factsRef, where('chat_id', '==', chat.id), limit(1), orderBy('created_at', 'desc'));

	const factsSnapshot = await getDocs(factsQuery);

	if (factsSnapshot.empty) {
		await calculateFacts(chat);
		return await getLatestFact(chat);
	}

	return factsSnapshot.docs.map((qaDoc) => qaDoc.data())[0];
};

module.exports = { calculateFacts, idealMileage, idealDaysTime, idealChangeFilterMileage, sendFacts, getLatestFact };
