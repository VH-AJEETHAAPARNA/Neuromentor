// ═══════════════════════════════════════════════════════════════
// STEP 1: Create this file: src/firebase.js
// ═══════════════════════════════════════════════════════════════

// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCZxGHgtQq-Ej1c0iJnZau0ao1thX5t9h8",
  authDomain: "neuromentor-bcca5.firebaseapp.com",
  projectId: "neuromentor-bcca5",
  storageBucket: "neuromentor-bcca5.firebasestorage.app",
  messagingSenderId: "274074643484",
  appId: "1:274074643484:web:a8145ed5cf41cf39c343d9",
  measurementId: "G-NRHCK3QB0S"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const signInWithGoogle = () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return signInWithPopup(auth, provider);
};

export const signOutUser = () => signOut(auth);