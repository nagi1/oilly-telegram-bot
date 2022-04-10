const path = require('path');
const i18n = require('i18n');

i18n.configure({
	locales: ['en', 'ar'],
	defaultLocale: 'ar',
	autoReload: false,
	syncFiles: true,
	directory: path.join(__dirname, '..', '/locales'),
});

module.exports = i18n;
