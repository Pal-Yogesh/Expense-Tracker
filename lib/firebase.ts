import { initializeApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { getAuth, GoogleAuthProvider } from "firebase/auth"

const firebaseConfig = {
  apiKey: "AIzaSyAlT5zVRrVjuAb59X-CWdwOXTcdJ5JyOzc",
  authDomain: "expense-tracker-bdce7.firebaseapp.com",
  projectId: "expense-tracker-bdce7",
  storageBucket: "expense-tracker-bdce7.firebasestorage.app",
  messagingSenderId: "658330829878",
  appId: "1:658330829878:web:39368e6cfa12445692c497",
  measurementId: "G-ZJ8GSKCEYK",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
