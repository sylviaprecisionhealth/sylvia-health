import { initializeApp, getApps } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyBquiLgQOknHfyvIH9bRbDMWReYgfao5Vo",
  authDomain: "sylvia-health.firebaseapp.com",
  projectId: "sylvia-health",
  storageBucket: "sylvia-health.firebasestorage.app",
  messagingSenderId: "46984466655",
  appId: "1:46984466655:web:55bdace0b068b2aa14996a"
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
