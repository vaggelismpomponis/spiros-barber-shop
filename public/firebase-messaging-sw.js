importScripts('https://www.gstatic.com/firebasejs/10.11.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.11.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyD7XT6fq6PBImNeGUsDwMdVNYqWavfiC_Q",
    authDomain: "spiros-barber-shop.firebaseapp.com",
    projectId: "spiros-barber-shop",
    storageBucket: "spiros-barber-shop.firebasestorage.app",
    messagingSenderId: "970329448916",
    appId: "1:970329448916:web:984e50d8e59a86717af641",
    measurementId: "G-YYFS517Q6Y"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: '/favicon.svg'
  });
});