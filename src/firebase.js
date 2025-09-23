// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAn2oi44Ok-I99HZlhnmvNNGJv3XlM4fG0",
  authDomain: "mi-french.firebaseapp.com",
  projectId: "mi-french",
  storageBucket: "mi-french.firebasestorage.app",
  messagingSenderId: "429104074318",
  appId: "1:429104074318:web:ac24308e1340e564173d1f",
  measurementId: "G-VC1F3F0MYH"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
