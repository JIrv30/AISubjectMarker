import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBYiyeQN9OUA5huSuXMWuGJKdtTSu7oC2Q",
  authDomain: "sltbreifing.firebaseapp.com",
  databaseURL: "https://sltbreifing-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "sltbreifing",
  storageBucket: "sltbreifing.firebasestorage.app",
  messagingSenderId: "793608744425",
  appId: "1:793608744425:web:03a5168a4af40bb749ef78",
  measurementId: "G-XYB4HGXZ3T"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
