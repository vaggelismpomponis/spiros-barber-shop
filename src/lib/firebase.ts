import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
    apiKey: "AIzaSyD7XT6fq6PBImNeGUsDwMdVNYqWavfiC_Q",
    authDomain: "spiros-barber-shop.firebaseapp.com",
    projectId: "spiros-barber-shop",
    storageBucket: "spiros-barber-shop.firebasestorage.app",
    messagingSenderId: "970329448916",
    appId: "1:970329448916:web:984e50d8e59a86717af641",
    measurementId: "G-YYFS517Q6Y"
  };

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);

export async function getFcmToken() {
  try {
    const token = await getToken(messaging, { vapidKey: "BC3Kjtizr3e27nX-MsjRT0-H6l4FSzJz0n4pKMzGuTa_tMPB2Q6B-bNpw0q-OYQEsFuDqmhXd5mmCSWSaEXnPmI	" });
    return token;
  } catch (err) {
    console.error("FCM error:", err);
    return null;
  }
}