module.exports = function (string) {
	return ('' + string).replace(/[.:\@\#\!\-\(\)"'\\\u2028\u2029]/g, function (character) {
		// Escape all characters not included in SingleStringCharacters and
		// DoubleStringCharacters on
		// http://www.ecma-international.org/ecma-262/5.1/#sec-7.8.4
		switch (character) {
			case '"':
			case '(':
			case ')':
			case '!':
			case '@':
			case '#':
			case '.':
			case ':':
			case '-':
			case "'":
			case '\\':
				return '\\' + character;
			// Four possible LineTerminator characters need to be escaped:

			case '\u2028':
				return '\\u2028';
			case '\u2029':
				return '\\u2029';
		}
	});
};
