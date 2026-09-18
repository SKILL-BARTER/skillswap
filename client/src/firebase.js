import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';


// Replace these with the values from Firebase console:
// Project settings > General > Your apps > SDK setup and configuration.
// This config is safe to ship in frontend code — it is not a secret.

const firebaseConfig = {
  apiKey: "AIzaSyAz2qQb_8mpJEwOzOSXJEQhMExjJ1qdHE8",
  authDomain: "skills-match-77fb3.firebaseapp.com",
  projectId: "skills-match-77fb3",
  storageBucket: "skills-match-77fb3.firebasestorage.app",
  messagingSenderId: "747885403227",
  appId: "1:747885403227:web:a4da425c6588b2a552337e",
  measurementId: "G-E1KM43S8RT"
};
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
// Always show the account chooser so students can pick their university
// account instead of silently reusing the personal one that's signed in.
googleProvider.setCustomParameters({ prompt: 'select_account' });
