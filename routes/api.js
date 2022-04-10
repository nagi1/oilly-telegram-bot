var express = require('express');
const { sendNotificationRecordingToTimetable } = require('../src/cronjobs');
var router = express.Router();
const i18n = require('../src/i18n');

i18n;

router.get('/cron', async function (req, res, next) {
	await sendNotificationRecordingToTimetable();

	return res.send({ success: true });
});

module.exports = router;
