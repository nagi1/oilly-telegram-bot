const i18n = require('./i18n.js');
const TelegramBot = require('node-telegram-bot-api');
const { updateDoc, getDoc, doc } = require('firebase/firestore');
const bot = require('./bot.js');
const { db } = require('./db.js');

const setLangauge = async (/** @type {TelegramBot.Message}*/ message) => {
	const userSnapshot = await getDoc(doc(db, 'users', String(message.from.id).toString()));

	if (userSnapshot.exists()) {
		const userData = userSnapshot.data();
		i18n.setLocale(userData.language_code);
		return true;
	}

	return i18n.setLocale(message.from.language_code ? message.from.language_code : 'ar');
};

const changeLanguageInDatabase = async (/** @type {TelegramBot.Message}*/ message) => {
	const userSnapshot = await getDoc(doc(db, 'users', String(message.chat.id).toString()));
	if (userSnapshot.exists()) {
		const userData = userSnapshot.data();
		const newLang = userData.language_code == 'ar' ? 'en' : 'ar';
		updateDoc(userSnapshot.ref, { language_code: newLang });
		i18n.setLocale(newLang);

		await bot.sendMessage(
			message.chat.id,
			`
            Language Changed ...
            اللغة اتغيرت ...
          👉 /start 👈
        `,
		);

		return true;
	}

	return i18n.setLocale('ar');
};

module.exports = { setLangauge, changeLanguageInDatabase };
