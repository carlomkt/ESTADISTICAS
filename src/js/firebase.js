// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA38JjN1sqivFVrtrC7JOlskLpXoZeg6-A",
  authDomain: "codisecst.firebaseapp.com",
  projectId: "codisecst",
  storageBucket: "codisecst.firebasestorage.app",
  messagingSenderId: "424615657602",
  appId: "1:424615657602:web:12093110cede58fcb4749b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export firestore and auth instances
export const db = getFirestore(app);
export const auth = getAuth(app);
