const TelegramBot = require('node-telegram-bot-api');
const { db } = require('./db.js');
const bot = require('./bot.js');
const i18n = require('./i18n');
const { collection, query, where, getDoc, getDocs, setDoc, doc, limit, Timestamp, updateDoc, serverTimestamp, addDoc } = require('firebase/firestore');
const { askCurrentMileage, validationLogicForCurrentMileage } = require('./questions/currentMileage.js');
const { askLastChangeMileage, validationLogicForLastChangeMileage } = require('./questions/lastChangeMileage');
const { askLastChangeTime, validationLogicForLastChangeTime } = require('./questions/lastChangeTime.js');
const { askOilType, validationLogicForOilType } = require('./questions/oilType.js');
const { askOilChangeFrequency, validationLogicForOilChangeFrequency } = require('./questions/oilChangeFrequency.js');
const { askOilFilterChanged, validationLogicForOilFilterChanged } = require('./questions/oilFilterChanged.js');

const recordQuestionAnswer = async (questionId, /** @type {TelegramBot.Chat}*/ chat) => {
	// get last answer
	const lastQuestionSession = (await getQuestionSessionRef(chat)).data();

	await setDoc(doc(db, 'questions_answers', String(`${chat.id}_${lastQuestionSession.id}`).toString()), {
		id: lastQuestionSession.id,
		question: lastQuestionSession.question,
		answer: lastQuestionSession.answer,
		chat_id: chat.id,
		created_at: serverTimestamp(),
	});
};

const askQuestionMapper = async (questionId, /** @type {TelegramBot.Chat}*/ chat) => {
	const questionMapping = {
		1: askCurrentMileage,
		2: askLastChangeTime,
		3: askLastChangeMileage,
		4: askOilType,
		5: askOilChangeFrequency,
		6: askOilFilterChanged,
	};

	return await questionMapping[questionId](chat);
};

const recordAndValidate = async (/** @type {TelegramBot.Message}*/ message, validationLogic) => {
	const answer = message.text;
	const previousQuestions = await getQuestions(message.chat);
	const isValid = validationLogic(answer, previousQuestions);

	if (isValid) {
		await updateDoc(doc(db, 'question_sessions', String(message.chat.id).toString()), { answer });
	}

	return isValid;
};

const validateAndRecordMapper = async (questionId, /** @type {TelegramBot.Message}*/ message) => {
	const questionMapping = {
		1: validationLogicForCurrentMileage,
		2: validationLogicForLastChangeTime,
		3: validationLogicForLastChangeMileage,
		4: validationLogicForOilType,
		5: validationLogicForOilChangeFrequency,
		6: validationLogicForOilFilterChanged,
	};

	const validationLogicFunction = questionMapping[questionId];

	return await recordAndValidate(message, validationLogicFunction);
};

const getQuestionSessionRef = async (/** @type {TelegramBot.Chat}*/ chat) => {
	const questionSessionSnapshot = await getDoc(doc(db, 'question_sessions', String(chat.id).toString()));

	return questionSessionSnapshot;
};

const getQuestions = async (/** @type {TelegramBot.Chat}*/ chat) => {
	const questionsAnswersRef = collection(db, 'questions_answers');

	const questionsAnswersQuery = query(questionsAnswersRef, where('chat_id', '==', chat.id));

	const questionsAnswersSnapshot = await getDocs(questionsAnswersQuery);

	return questionsAnswersSnapshot.docs.map((qaDoc) => qaDoc.data());
};

const isThereQuestionSessionOpen = async (/** @type {TelegramBot.Chat}*/ chat) => {
	return (await getQuestionSessionRef(chat)).exists();
};

module.exports = { isThereQuestionSessionOpen, getQuestions, getQuestionSessionRef, validateAndRecordMapper, recordQuestionAnswer, askQuestionMapper };
