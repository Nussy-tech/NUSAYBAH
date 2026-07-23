import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCgegsji_Po-TaOl8dhEKKnqbXG2jl8zoA",
    authDomain: "codelokal-75dc4.firebaseapp.com",
    projectId: "codelokal-75dc4",
    storageBucket: "codelokal-75dc4.firebasestorage.app",
    messagingSenderId: "946066010937",
    appId: "1:946066010937:web:e865e3826befeb7c9b6ee8",
    measurementId: "G-42N5HPCDK9"
};

const app = initializeApp(firebaseConfig);

// Export the db so the HTML file can import it
export const db = getFirestore(app);