const env = require('dotenv').config().parsed;
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, setDoc, query, where } = require('firebase/firestore');

// Todo migrate this variables to .env file
const firebaseConfig = {
	apiKey: 'AIzaSyA-M2PVLcdshTCr7Uqr2EooHQ88da7WVQ8',
	authDomain: 'oilly-bot.firebaseapp.com',
	projectId: 'oilly-bot',
	storageBucket: 'oilly-bot.appspot.com',
	messagingSenderId: '302054885441',
	appId: '1:302054885441:web:a3ddb54a108608fbbbdec0',
	measurementId: 'G-QHWZPWM5J4',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

module.exports = { db, app };
