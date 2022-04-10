const TelegramBot = require('node-telegram-bot-api');
const bot = require('../src/bot.js');
const https = require('https');
const env = require('dotenv').config().parsed;

var express = require('express');
var router = express.Router();
const { respondToMessage } = require('../src/Oilly.js');
const handleQueryCallbacks = require('../src/handleQueryCallbacks.js');
const { setLangauge } = require('../src/setLang.js');
const path = require('path');
const i18n = require('../src/i18n');
const { URL } = require('url');

router.post('/', async function (req, res, next) {
	if (req.body.message) {
		console.log(req.body.message);
		await setLangauge(req.body.message);
		await respondToMessage(req.body.message);

		https.request({ host: new URL(env.WEBHOOK_URL).host, path: '/api/cron' });

		return res.send();
	} else if (req.body.callback_query) {
		console.log(req.body.callback_query);
		// await setLangauge(req.body.callback_query.message);
		await handleQueryCallbacks(req.body.callback_query);

		https.request({ host: new URL(env.WEBHOOK_URL).host, path: '/api/cron' });

		return res.send();
	}

	console.table(req.body);
	return res.send();
});

module.exports = router;
