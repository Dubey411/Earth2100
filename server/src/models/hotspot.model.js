import { db } from "../config/firebase.js";

// Firestore collection reference
const hotspotCollection = db.collection("hotspots");

const Hotspot = {
  // Get all hotspots
  find: async (filters = {}) => {
    let query = hotspotCollection;

    // Apply filters (e.g., { area: "Asia" })
    for (const [key, value] of Object.entries(filters)) {
      query = query.where(key, "==", value);
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },

  // Get hotspot by Firestore document ID
  findById: async (id) => {
    const doc = await hotspotCollection.doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  },

  // Create a new hotspot
  create: async (data) => {
    const docRef = await hotspotCollection.add({
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return { id: docRef.id, ...data };
  },

  // Update a hotspot by ID
  update: async (id, data) => {
    await hotspotCollection.doc(id).update({
      ...data,
      updatedAt: new Date().toISOString(),
    });
    return { id, ...data };
  },

  // Delete a hotspot by ID
  delete: async (id) => {
    await hotspotCollection.doc(id).delete();
    return { id };
  },
};

export default Hotspot;
