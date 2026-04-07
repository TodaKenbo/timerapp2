// ============================================
// Firebase Configuration & Initialization
// ============================================

import { initializeApp } from 'firebase/app';
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDkNHm4wYj1WEGkxXq-clTPtyhkexTDFkM",
  authDomain: "timerapp-acf18.firebaseapp.com",
  projectId: "timerapp-acf18",
  storageBucket: "timerapp-acf18.firebasestorage.app",
  messagingSenderId: "691550819038",
  appId: "1:691550819038:web:a62aede51e9da71688284f",
  measurementId: "G-5DHF6VSL74"
};

// Email domain for ID-based login
export const EMAIL_DOMAIN = 'studytracker.app';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Set persistence to local (survives browser restarts)
setPersistence(auth, browserLocalPersistence).catch(console.error);

// Enable offline persistence for Firestore
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Firestore persistence unavailable (multiple tabs)');
  } else if (err.code === 'unimplemented') {
    console.warn('Firestore persistence not supported');
  }
});
