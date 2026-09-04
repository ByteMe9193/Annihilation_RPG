import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBqXEVvmheF1m9uK4N8vpLoMLCxRyXYQ2s",
  authDomain: "annihilation-b112b.firebaseapp.com",
  projectId: "annihilation-b112b",
  storageBucket: "annihilation-b112b.firebasestorage.app",
  messagingSenderId: "168332051529",
  appId: "1:168332051529:web:0d30c75e1571e43e772b98",
  measurementId: "G-871QK4JNWN",
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

export { db };