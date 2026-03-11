import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, inMemoryPersistence, setPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const readEnv = (value?: string) =>
  (value ?? "")
    .replace(/^['"]|['"]$/g, "")
    .replace(/\s+/g, "")
    .trim();

const firebaseConfig = {
  apiKey: readEnv(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
  authDomain: readEnv(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: readEnv(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: readEnv(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: readEnv(
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  ),
  appId: readEnv(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
};

const missingKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingKeys.length) {
  throw new Error(
    `Firebase config incompleta. Faltan: ${missingKeys.join(", ")}. Revisa apps/web/.env.local`,
  );
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
void setPersistence(auth, inMemoryPersistence).catch((error) => {
  console.warn("No se pudo aplicar inMemoryPersistence", error);
});
export const db = getFirestore(app);
export const storage = getStorage(app);
