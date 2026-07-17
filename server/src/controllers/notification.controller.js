import NotificationModel from "../models/notification.model.js";

class NotificationController {
  /**
   * Create a notification (system/admin)
   * POST /api/notifications/create
   */
  static async createNotification(req, res) {
    try {
      const { userId, type, title, message, data, severity } = req.body;

      if (!userId || !title || !message) {
        return res.status(400).json({
          success: false,
          message: "userId, title, and message are required",
        });
      }

      const notification = await NotificationModel.create({
        userId,
        type: type || "system",
        title,
        message,
        data: data || {},
        severity: severity || "info", // info, warning, alert, critical
      });

      return res.status(201).json({
        success: true,
        data: notification,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get all notifications for authenticated user
   * GET /api/notifications/user
   */
  static async getUserNotifications(req, res) {
    try {
      const userId = req.user?.uid;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized - user ID required",
        });
      }

      const limit = parseInt(req.query.limit) || 50;
      const notifications = await NotificationModel.getByUserId(userId, limit);

      return res.json({
        success: true,
        count: notifications.length,
        data: notifications,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get unread notifications count
   * GET /api/notifications/unread
   */
  static async getUnreadCount(req, res) {
    try {
      const userId = req.user?.uid;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized - user ID required",
        });
      }

      const count = await NotificationModel.getUnreadCount(userId);

      return res.json({
        success: true,
        unreadCount: count,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Mark a notification as read
   * PUT /api/notifications/:id/read
   */
  static async markAsRead(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Notification ID is required",
        });
      }

      await NotificationModel.markAsRead(id);

      return res.json({
        success: true,
        message: "Notification marked as read",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Mark all notifications as read
   * PUT /api/notifications/read-all
   */
  static async markAllAsRead(req, res) {
    try {
      const userId = req.user?.uid;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized - user ID required",
        });
      }

      const count = await NotificationModel.markAllAsRead(userId);

      return res.json({
        success: true,
        message: `Marked ${count} notifications as read`,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Delete a notification
   * DELETE /api/notifications/:id
   */
  static async deleteNotification(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Notification ID is required",
        });
      }

      await NotificationModel.delete(id);

      return res.json({
        success: true,
        message: "Notification deleted successfully",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Create flood alert notification (auto-generated)
   * POST /api/notifications/flood-alert
   */
  static async createFloodAlert(req, res) {
    try {
      const { userId, region, severity, lat, lng } = req.body;

      if (!userId || !region) {
        return res.status(400).json({
          success: false,
          message: "userId and region are required",
        });
      }

      const severityLabels = {
        low: "⚠️ Low",
        moderate: "🟡 Moderate",
        high: "🟠 High",
        critical: "🔴 Critical",
      };

      const notification = await NotificationModel.create({
        userId,
        type: "flood_alert",
        title: `🌊 Flood Alert: ${region}`,
        message: `${severityLabels[severity] || "⚠️"} flood risk detected in ${region}. ${
          severity === "critical" ? "Immediate action recommended." : "Stay informed."
        }`,
        severity: severity || "moderate",
        data: { region, lat, lng, severity },
      });

      return res.status(201).json({
        success: true,
        data: notification,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

export default NotificationController;