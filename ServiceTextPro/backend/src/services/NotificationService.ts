import { SQLiteDatabase } from '../models/SQLiteDatabase';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

interface Notification {
  id: string;
  user_id: string;
  type: 'case_assigned' | 'case_accepted' | 'case_completed' | 'case_declined' | 'new_case_available' | 'review_request';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  created_at: string;
}

interface NotificationTemplate {
  type: string;
  title: string;
  message: string;
}

export class NotificationService {
  private db: SQLiteDatabase;
  private wsConnections: Map<string, any> = new Map(); // Store WebSocket connections by user ID

  constructor() {
    this.db = new SQLiteDatabase();
    this.initializeNotificationTables();
  }

  /**
   * Initialize notification tables if they don't exist
   */
  private async initializeNotificationTables(): Promise<void> {
    try {
      await new Promise<void>((resolve, reject) => {
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
          if (err) reject(err);
          else resolve();
        });
      });

      // Create index for faster queries
      await new Promise<void>((resolve, reject) => {
        this.db.db.run(`
          CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
          ON notifications(user_id, read, created_at DESC)
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      logger.info('✅ Notification tables initialized');
    } catch (error) {
      logger.error('❌ Error initializing notification tables:', error);
    }
  }

  /**
   * Register WebSocket connection for real-time notifications
   */
  registerConnection(userId: string, ws: any): void {
    this.wsConnections.set(userId, ws);
    logger.info('🔌 WebSocket connection registered', { userId });

    // Send unread notification count on connection
    this.sendUnreadCount(userId);
  }

  /**
   * Unregister WebSocket connection
   */
  unregisterConnection(userId: string): void {
    this.wsConnections.delete(userId);
    logger.info('🔌 WebSocket connection unregistered', { userId });
  }

  /**
   * Create and send notification
   */
  async createNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    data?: any
  ): Promise<string> {
    try {
      const notificationId = uuidv4();
      const now = new Date().toISOString();

      // Store notification in database
      await new Promise<void>((resolve, reject) => {
        this.db.db.run(
          `INSERT INTO notifications (id, user_id, type, title, message, data, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [notificationId, userId, type, title, message, JSON.stringify(data), now],
          function(err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      // Send real-time notification if user is connected
      const ws = this.wsConnections.get(userId);
      if (ws && ws.readyState === 1) { // WebSocket.OPEN
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

      // Send updated unread count
      this.sendUnreadCount(userId);

      logger.info('✅ Notification created and sent', { 
        notificationId, 
        userId, 
        type,
        realTime: !!ws 
      });

      return notificationId;

    } catch (error) {
      logger.error('❌ Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Send unread notification count to user
   */
  private async sendUnreadCount(userId: string): Promise<void> {
    try {
      const count = await this.getUnreadCount(userId);
      const ws = this.wsConnections.get(userId);
      
      if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({
          type: 'unread_count',
          data: { count }
        }));
      }
    } catch (error) {
      logger.error('❌ Error sending unread count:', error);
    }
  }

  /**
   * Get unread notification count for user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.db.get(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0',
        [userId],
        (err, row: any) => {
          if (err) reject(err);
          else resolve(row?.count || 0);
        }
      );
    });
  }

  /**
   * Get notifications for user with pagination
   */
  async getUserNotifications(
    userId: string, 
    page: number = 1, 
    limit: number = 20
  ): Promise<{ notifications: Notification[], total: number }> {
    try {
      const offset = (page - 1) * limit;

      // Get total count
      const total = await new Promise<number>((resolve, reject) => {
        this.db.db.get(
          'SELECT COUNT(*) as count FROM notifications WHERE user_id = ?',
          [userId],
          (err, row: any) => {
            if (err) reject(err);
            else resolve(row?.count || 0);
          }
        );
      });

      // Get notifications
      const notifications = await new Promise<Notification[]>((resolve, reject) => {
        this.db.db.all(
          `SELECT * FROM notifications 
           WHERE user_id = ? 
           ORDER BY created_at DESC 
           LIMIT ? OFFSET ?`,
          [userId, limit, offset],
          (err, rows: any[]) => {
            if (err) reject(err);
            else {
              const parsed = rows.map(row => ({
                ...row,
                data: row.data ? JSON.parse(row.data) : null,
                read: !!row.read
              }));
              resolve(parsed);
            }
          }
        );
      });

      return { notifications, total };

    } catch (error) {
      logger.error('❌ Error getting user notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      await new Promise<void>((resolve, reject) => {
        this.db.db.run(
          'UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?',
          [notificationId, userId],
          function(err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      // Send updated unread count
      this.sendUnreadCount(userId);

      logger.info('✅ Notification marked as read', { notificationId, userId });

    } catch (error) {
      logger.error('❌ Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for user
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      await new Promise<void>((resolve, reject) => {
        this.db.db.run(
          'UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0',
          [userId],
          function(err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      // Send updated unread count
      this.sendUnreadCount(userId);

      logger.info('✅ All notifications marked as read', { userId });

    } catch (error) {
      logger.error('❌ Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Case-specific notification methods
   */
  async notifyCaseAssigned(caseId: string, customerId: string, providerId: string, providerName: string): Promise<void> {
    await this.createNotification(
      customerId,
      'case_assigned',
      'Заявката ви е приета',
      `${providerName} прие вашата заявка и ще се свърже с вас скоро.`,
      { caseId, providerId }
    );
  }

  async notifyCaseAccepted(caseId: string, providerId: string, customerName: string): Promise<void> {
    await this.createNotification(
      providerId,
      'case_accepted',
      'Нова заявка за работа',
      `Имате нова заявка от ${customerName}. Моля свържете се с клиента.`,
      { caseId }
    );
  }

  async notifyCaseCompleted(caseId: string, customerId: string, providerId: string): Promise<void> {
    await this.createNotification(
      customerId,
      'case_completed',
      'Заявката е завършена',
      'Вашата заявка е отбелязана като завършена. Моля оценете услугата.',
      { caseId, providerId }
    );
  }

  async notifyNewCaseAvailable(caseId: string, category: string, location: string, providerIds: string[]): Promise<void> {
    const title = 'Нова заявка в района ви';
    const message = `Нова заявка за ${category} в ${location}. Проверете дали можете да я приемете.`;

    // Send to all relevant providers
    for (const providerId of providerIds) {
      await this.createNotification(
        providerId,
        'new_case_available',
        title,
        message,
        { caseId, category, location }
      );
    }
  }

  async notifyReviewRequest(caseId: string, customerId: string, providerName: string): Promise<void> {
    await this.createNotification(
      customerId,
      'review_request',
      'Оценете услугата',
      `Моля оценете работата на ${providerName}. Вашето мнение е важно за нас.`,
      { caseId }
    );
  }
}

export default NotificationService;
