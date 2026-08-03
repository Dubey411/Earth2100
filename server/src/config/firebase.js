import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

let serviceAccount = null;

// 1. Try reading from environment variable (for Render / Vercel deployment)
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log("🔥 [firebase]: Loaded credentials from process.env.FIREBASE_SERVICE_ACCOUNT");
  } catch (e) {
    console.error("🔥 [firebase]: Failed to parse FIREBASE_SERVICE_ACCOUNT env var:", e.message);
  }
}

// 2. Try loading local serviceAccountKey.json if not yet loaded from env
if (!serviceAccount) {
  try {
    serviceAccount = require("../../serviceAccountKey.json");
    console.log("🔥 [firebase]: Loaded local serviceAccountKey.json");
  } catch (e) {
    console.warn("⚠️ [firebase]: No serviceAccountKey.json found and FIREBASE_SERVICE_ACCOUNT env var not set.");
  }
}

// 3. Initialize Firebase Admin SDK if credentials are valid
if (serviceAccount && getApps().length === 0) {
  try {
    initializeApp({
      credential: cert(serviceAccount),
    });
    console.log("🚀 [firebase]: Firebase Admin initialized successfully!");
  } catch (err) {
    console.error("🔥 [firebase]: Firebase initialization failed:", err.message);
  }
}

// 4. Safe exports with fallback mocks if Firebase Admin is not configured
let db;
let auth;

if (getApps().length > 0) {
  db = getFirestore();
  auth = getAuth();
} else {
  console.warn("ℹ️ [firebase]: Running in fallback mode without Firebase Admin SDK.");
  
  // Dummy DB mock to prevent crash on routes if Firebase is unconfigured
  db = {
    collection: () => ({
      where: () => ({ get: async () => ({ docs: [] }) }),
      get: async () => ({ docs: [] }),
      doc: () => ({
        get: async () => ({ exists: false }),
        update: async () => {},
        delete: async () => {},
      }),
      add: async (data) => ({ id: `mock-${Date.now()}`, ...data }),
    }),
  };

  auth = {
    verifyIdToken: async () => {
      throw new Error("Firebase Auth not initialized on server");
    },
  };
}

export { db, auth };
