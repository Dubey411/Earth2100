import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const serviceAccount = require("../../serviceAccountKey.json");

if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();
const auth = getAuth();

export { db, auth };
