import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDFOP3cDgKjhS2n3mFUPKRvq3MUEOHegLA",
  authDomain: "moja-eats-user-app.firebaseapp.com",
  projectId: "moja-eats-user-app",
  storageBucket: "moja-eats-user-app.firebasestorage.app",
  messagingSenderId: "324381066277",
  appId: "1:324381066277:web:2c818c1056da5b7094abcc"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
