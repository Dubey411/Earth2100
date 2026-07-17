import { db } from "../config/firebase.js";

const COLLECTION = "notifications";

class NotificationModel {
  /**
   * Create a new notification
   */
  static async create(notificationData) {
    try {
      const docRef = db.collection(COLLECTION).doc();
      const notification = {
        ...notificationData,
        id: docRef.id,
        createdAt: new Date().toISOString(),
        read: false,
      };
      await docRef.set(notification);
      return notification;
    } catch (error) {
      throw new Error(`Failed to create notification: ${error.message}`);
    }
  }

  /**
   * Get all notifications for a user
   */
  static async getByUserId(userId, limit = 50) {
    try {
      const snapshot = await db
        .collection(COLLECTION)
        .where("userId", "==", userId)
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get();

      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      throw new Error(`Failed to fetch notifications: ${error.message}`);
    }
  }

  /**
   * Get unread notifications count for a user
   */
  static async getUnreadCount(userId) {
    try {
      const snapshot = await db
        .collection(COLLECTION)
        .where("userId", "==", userId)
        .where("read", "==", false)
        .get();

      return snapshot.size;
    } catch (error) {
      throw new Error(`Failed to fetch unread count: ${error.message}`);
    }
  }

  /**
   * Mark a notification as read
   */
  static async markAsRead(notificationId) {
    try {
      await db.collection(COLLECTION).doc(notificationId).update({
        read: true,
        readAt: new Date().toISOString(),
      });
      return true;
    } catch (error) {
      throw new Error(`Failed to mark notification as read: ${error.message}`);
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId) {
    try {
      const snapshot = await db
        .collection(COLLECTION)
        .where("userId", "==", userId)
        .where("read", "==", false)
        .get();

      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { read: true, readAt: new Date().toISOString() });
      });

      await batch.commit();
      return snapshot.size;
    } catch (error) {
      throw new Error(`Failed to mark all as read: ${error.message}`);
    }
  }

  /**
   * Delete a notification
   */
  static async delete(notificationId) {
    try {
      await db.collection(COLLECTION).doc(notificationId).delete();
      return true;
    } catch (error) {
      throw new Error(`Failed to delete notification: ${error.message}`);
    }
  }

  /**
   * Delete old notifications (older than 30 days)
   */
  static async deleteOldNotifications(days = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const snapshot = await db
        .collection(COLLECTION)
        .where("createdAt", "<", cutoffDate.toISOString())
        .get();

      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      return snapshot.size;
    } catch (error) {
      throw new Error(`Failed to delete old notifications: ${error.message}`);
    }
  }
}

export default NotificationModel;