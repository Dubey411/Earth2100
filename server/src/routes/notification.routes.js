const express = require('express');
const router = expresss.Router()
const NotificationController = require('../controller/notification.controller')
const {authenticate} = require('../middleware/auth.middleware')

// ─── Unprotected routes ─────────────────────────────────────────────────────
router.get('/user/:userId',NotificationController.getUserNotifications)
router.get('/unread/:userId',NotificationController.getUnreadCount)

// ─── Protected routes (requires authentication) ─────────────────────────────
router.post('/create',authenticate,NotificationController.createNotifications)
router.put('/:id/read',authenticate,NotificationController.markAsRead)
router.put('/read-all',authenticate,NotificationController.markAllAsRead)
router.delete('/:id',authenticate,NotificationController.deleteNotification)

// ─── Optional: System notification (no auth, internal use) ──────────────────
router.post('/system',NotificationController.createNotification)

module.export = router