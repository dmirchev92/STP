// SMS Configuration Controller
// Handles SMS settings management for marketplace web interface

import { Router, Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/auth';
import { ChatTokenService } from '../services/ChatTokenService';
import { SQLiteDatabase } from '../models/SQLiteDatabase';
import logger from '../utils/logger';
import { APIResponse, ServiceTextProError } from '../types';
import config from '../utils/config';

const router = Router();
const chatTokenService = new ChatTokenService();
const db = new SQLiteDatabase();

/**
 * GET /api/v1/sms/config
 * Get SMS configuration and statistics
 */
router.get('/config',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new ServiceTextProError('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }

      // Get SMS statistics (mock data for now)
      const stats = {
        todayCount: 0,
        thisHourCount: 0,
        totalCount: 0
      };
      
      // Get current chat token and URL
      let currentChatUrl = '';
      let previewMessage = '';
      
      try {
        const currentToken = await chatTokenService.getCurrentTokenForSMS(userId);
        currentChatUrl = await chatTokenService.getChatUrlForUser(userId);
        
        // Create preview message with actual link
        const defaultMessage = 'Зает съм, ще върна обаждане след няколко минути.\n\nЗапочнете чат тук:\n[chat_link]\n\n';
      } catch (error) {
        logger.warn('Could not get current chat URL for SMS preview', { userId, error });
        previewMessage = 'Зает съм, ще върна обаждане след няколко минути.\n\nЗапочнете чат тук:\nГенериране на връзка...\n\n';
      }

      // Get SMS configuration from database
      const smsSettings = await db.getSMSSettings(userId);
      
      const smsConfig = {
        isEnabled: smsSettings?.isEnabled || false,
        message: smsSettings?.message || '',
        sentCount: smsSettings?.sentCount || 0,
        lastSentTime: smsSettings?.lastSentTime || null,
        filterKnownContacts: smsSettings?.filterKnownContacts || false,
        processedCalls: smsSettings?.sentCallIds?.length || 0
      };

      const response: APIResponse = {
        success: true,
        data: {
          config: smsConfig,
          stats: stats,
          preview: previewMessage,
          currentChatUrl: currentChatUrl
        },
        metadata: {
          timestamp: new Date(),
          requestId: (req as any).requestId,
          version: config.app.version
        }
      };

      res.json(response);

    } catch (error) {
      logger.error('Error getting SMS config:', error);
      next(error);
    }
  }
);

/**
 * PUT /api/v1/sms/config
 * Update SMS configuration
 */
router.put('/config',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new ServiceTextProError('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }

      const { isEnabled, message, filterKnownContacts } = req.body;

      // Validate message if provided
      if (message && typeof message === 'string') {
        if (message.length > 500) {
          throw new ServiceTextProError('Message too long (max 500 characters)', 'MESSAGE_TOO_LONG', 400);
        }
        
        if (!message.includes('[chat_link]')) {
          throw new ServiceTextProError('Message must contain [chat_link] placeholder', 'MISSING_CHAT_LINK', 400);
        }
      }

      // Save settings to database
      const updates: any = {};
      if (isEnabled !== undefined) updates.isEnabled = isEnabled;
      if (message !== undefined) updates.message = message;
      if (filterKnownContacts !== undefined) updates.filterKnownContacts = filterKnownContacts;

      await db.updateSMSSettings(userId, updates);

      logger.info('SMS config updated in database', {
        userId,
        updates: { isEnabled, messageLength: message?.length, filterKnownContacts }
      });

      const response: APIResponse = {
        success: true,
        data: {
          message: 'SMS configuration updated successfully'
        },
        metadata: {
          timestamp: new Date(),
          requestId: (req as any).requestId,
          version: config.app.version
        }
      };

      res.json(response);

    } catch (error) {
      logger.error('Error updating SMS config:', error);
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/sms/history/clear
 * Clear SMS history (processed calls)
 */
router.delete('/history/clear',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new ServiceTextProError('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }

      // Clear SMS history from database
      await db.clearSMSHistory(userId);
      
      logger.info('SMS history cleared from database', { userId });

      const response: APIResponse = {
        success: true,
        data: {
          message: 'SMS history cleared successfully'
        },
        metadata: {
          timestamp: new Date(),
          requestId: (req as any).requestId,
          version: config.app.version
        }
      };

      res.json(response);

    } catch (error) {
      logger.error('Error clearing SMS history:', error);
    }
  }
);

/**
 * GET /api/v1/sms/stats
 * Get detailed SMS statistics
 */
router.get('/stats',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new ServiceTextProError('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }

      const stats = {
        todayCount: 0,
        thisHourCount: 0,
        totalCount: 0
      };
      const canSend = { canSend: true, reason: null };

      const response: APIResponse = {
        success: true,
        data: {
          stats: stats,
          limits: {
            dailyLimit: config.security.sms.dailyLimit,
            hourlyThreshold: config.security.sms.suspiciousThreshold,
            canSend: canSend.canSend,
            reason: canSend.reason
          }
        },
        metadata: {
          timestamp: new Date(),
          requestId: (req as any).requestId,
          version: config.app.version
        }
      };

      res.json(response);

    } catch (error) {
      logger.error('Error getting SMS stats:', error);
      next(error);
    }
  }
);

/**
 * TEST ENDPOINT - Security validation test (development only)
 */
router.post('/test-security',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new ServiceTextProError('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }

      const { phoneNumber, message } = req.body;
      
      if (!phoneNumber || !message) {
        throw new ServiceTextProError('Phone number and message required', 'MISSING_PARAMETERS', 400);
      }

      // Import and test SMS security service
      const { SMSSecurityService } = require('../services/SMSSecurityService');
      const securityService = SMSSecurityService.getInstance();
      
      const securityCheck = await securityService.validateSMSRequest(
        phoneNumber,
        message,
        userId,
        req.ip
      );

      const response: APIResponse = {
        success: true,
        data: {
          phoneNumber: phoneNumber,
          message: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
          securityCheck: securityCheck,
          testResult: securityCheck.isAllowed ? 'ALLOWED' : 'BLOCKED'
        },
        metadata: {
          timestamp: new Date(),
          requestId: (req as any).requestId,
          version: config.app.version
        }
      };

      res.json(response);

    } catch (error) {
      logger.error('Error testing SMS security:', error);
      next(error);
    }
  }
);

export default router;
