import express from "express";
import NotificationController from "../controllers/notification.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

// ─── Protected routes (require authentication) ──────────────────────────────

// Get all notifications for authenticated user
router.get("/user", verifyToken, NotificationController.getUserNotifications);

// Get unread count
router.get("/unread", verifyToken, NotificationController.getUnreadCount);

// Mark as read
router.put("/:id/read", verifyToken, NotificationController.markAsRead);

// Mark all as read
router.put("/read-all", verifyToken, NotificationController.markAllAsRead);

// Delete notification
router.delete("/:id", verifyToken, NotificationController.deleteNotification);

// ─── System routes (internal use) ────────────────────────────────────────────

// Create notification (admin/system)
router.post("/create", NotificationController.createNotification);

// Create flood alert
router.post("/flood-alert", NotificationController.createFloodAlert);

export default router;