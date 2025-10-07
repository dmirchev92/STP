"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const SQLiteDatabase_1 = require("../models/SQLiteDatabase");
const logger_1 = __importDefault(require("../utils/logger"));
const uuid_1 = require("uuid");
class NotificationService {
    constructor() {
        this.wsConnections = new Map();
        this.db = new SQLiteDatabase_1.SQLiteDatabase();
        this.initializeNotificationTables();
    }
    async initializeNotificationTables() {
        try {
            await new Promise((resolve, reject) => {
                this.db.db.run(`
          CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            data TEXT,
            read INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
          )
        `, (err) => {
                    if (err)
                        reject(err);
                    else
                        resolve();
                });
            });
            await new Promise((resolve, reject) => {
                this.db.db.run(`
          CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
          ON notifications(user_id, read, created_at DESC)
        `, (err) => {
                    if (err)
                        reject(err);
                    else
                        resolve();
                });
            });
            logger_1.default.info('✅ Notification tables initialized');
        }
        catch (error) {
            logger_1.default.error('❌ Error initializing notification tables:', error);
        }
    }
    registerConnection(userId, ws) {
        this.wsConnections.set(userId, ws);
        logger_1.default.info('🔌 WebSocket connection registered', { userId });
        this.sendUnreadCount(userId);
    }
    unregisterConnection(userId) {
        this.wsConnections.delete(userId);
        logger_1.default.info('🔌 WebSocket connection unregistered', { userId });
    }
    async createNotification(userId, type, title, message, data) {
        try {
            const notificationId = (0, uuid_1.v4)();
            const now = new Date().toISOString();
            await new Promise((resolve, reject) => {
                this.db.db.run(`INSERT INTO notifications (id, user_id, type, title, message, data, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`, [notificationId, userId, type, title, message, JSON.stringify(data), now], function (err) {
                    if (err)
                        reject(err);
                    else
                        resolve();
                });
            });
            const ws = this.wsConnections.get(userId);
            if (ws && ws.readyState === 1) {
                ws.send(JSON.stringify({
                    type: 'notification',
                    data: {
                        id: notificationId,
                        type,
                        title,
                        message,
                        data,
                        created_at: now
                    }
                }));
            }
            this.sendUnreadCount(userId);
            logger_1.default.info('✅ Notification created and sent', {
                notificationId,
                userId,
                type,
                realTime: !!ws
            });
            return notificationId;
        }
        catch (error) {
            logger_1.default.error('❌ Error creating notification:', error);
            throw error;
        }
    }
    async sendUnreadCount(userId) {
        try {
            const count = await this.getUnreadCount(userId);
            const ws = this.wsConnections.get(userId);
            if (ws && ws.readyState === 1) {
                ws.send(JSON.stringify({
                    type: 'unread_count',
                    data: { count }
                }));
            }
        }
        catch (error) {
            logger_1.default.error('❌ Error sending unread count:', error);
        }
    }
    async getUnreadCount(userId) {
        return new Promise((resolve, reject) => {
            this.db.db.get('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0', [userId], (err, row) => {
                if (err)
                    reject(err);
                else
                    resolve(row?.count || 0);
            });
        });
    }
    async getUserNotifications(userId, page = 1, limit = 20) {
        try {
            const offset = (page - 1) * limit;
            const total = await new Promise((resolve, reject) => {
                this.db.db.get('SELECT COUNT(*) as count FROM notifications WHERE user_id = ?', [userId], (err, row) => {
                    if (err)
                        reject(err);
                    else
                        resolve(row?.count || 0);
                });
            });
            const notifications = await new Promise((resolve, reject) => {
                this.db.db.all(`SELECT * FROM notifications 
           WHERE user_id = ? 
           ORDER BY created_at DESC 
           LIMIT ? OFFSET ?`, [userId, limit, offset], (err, rows) => {
                    if (err)
                        reject(err);
                    else {
                        const parsed = rows.map(row => ({
                            ...row,
                            data: row.data ? JSON.parse(row.data) : null,
                            read: !!row.read
                        }));
                        resolve(parsed);
                    }
                });
            });
            return { notifications, total };
        }
        catch (error) {
            logger_1.default.error('❌ Error getting user notifications:', error);
            throw error;
        }
    }
    async markAsRead(notificationId, userId) {
        try {
            await new Promise((resolve, reject) => {
                this.db.db.run('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?', [notificationId, userId], function (err) {
                    if (err)
                        reject(err);
                    else
                        resolve();
                });
            });
            this.sendUnreadCount(userId);
            logger_1.default.info('✅ Notification marked as read', { notificationId, userId });
        }
        catch (error) {
            logger_1.default.error('❌ Error marking notification as read:', error);
            throw error;
        }
    }
    async markAllAsRead(userId) {
        try {
            await new Promise((resolve, reject) => {
                this.db.db.run('UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0', [userId], function (err) {
                    if (err)
                        reject(err);
                    else
                        resolve();
                });
            });
            this.sendUnreadCount(userId);
            logger_1.default.info('✅ All notifications marked as read', { userId });
        }
        catch (error) {
            logger_1.default.error('❌ Error marking all notifications as read:', error);
            throw error;
        }
    }
    async notifyCaseAssigned(caseId, customerId, providerId, providerName) {
        await this.createNotification(customerId, 'case_assigned', 'Заявката ви е приета', `${providerName} прие вашата заявка и ще се свърже с вас скоро.`, { caseId, providerId });
    }
    async notifyCaseAccepted(caseId, providerId, customerName) {
        await this.createNotification(providerId, 'case_accepted', 'Нова заявка за работа', `Имате нова заявка от ${customerName}. Моля свържете се с клиента.`, { caseId });
    }
    async notifyCaseCompleted(caseId, customerId, providerId) {
        await this.createNotification(customerId, 'case_completed', 'Заявката е завършена', 'Вашата заявка е отбелязана като завършена. Моля оценете услугата.', { caseId, providerId });
    }
    async notifyNewCaseAvailable(caseId, category, location, providerIds) {
        const title = 'Нова заявка в района ви';
        const message = `Нова заявка за ${category} в ${location}. Проверете дали можете да я приемете.`;
        for (const providerId of providerIds) {
            await this.createNotification(providerId, 'new_case_available', title, message, { caseId, category, location });
        }
    }
    async notifyReviewRequest(caseId, customerId, providerName) {
        await this.createNotification(customerId, 'review_request', 'Оценете услугата', `Моля оценете работата на ${providerName}. Вашето мнение е важно за нас.`, { caseId });
    }
}
exports.NotificationService = NotificationService;
exports.default = NotificationService;
//# sourceMappingURL=NotificationService.js.map