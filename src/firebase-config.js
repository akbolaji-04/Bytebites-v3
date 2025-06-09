import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-analytics.js";

const firebaseConfig = {
    apiKey: "AIzaSyB8zKTVZpoPmtxX9PS_et_JWVrbUpste9k",
    authDomain: "bytebites-8e4d6.firebaseapp.com",
    projectId: "bytebites-8e4d6",
    storageBucket: "bytebites-8e4d6.appspot.com",
    messagingSenderId: "1027669607395",
    appId: "1:1027669607395:web:39bb370d43035fa05016d6",
    measurementId: "G-3DTVS8EL4T"
  };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const analytics = getAnalytics(app);
const googleProvider = new GoogleAuthProvider();

export { app, db, auth, analytics, googleProvider };