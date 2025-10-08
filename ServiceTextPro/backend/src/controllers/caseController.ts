import { Request, Response } from 'express';
import { SQLiteDatabase } from '../models/SQLiteDatabase';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import SmartMatchingService from '../services/SmartMatchingService';
import NotificationService from '../services/NotificationService';

const db = new SQLiteDatabase();
const notificationService = new NotificationService();

/**
 * Create a new service case
 */
export const createCase = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      serviceType,
      description,
      preferredDate,
      preferredTime,
      priority,
      city,
      neighborhood,
      address,
      phone,
      additionalDetails,
      providerId,
      providerName,
      isOpenCase,
      assignmentType,
      screenshots,
      customerId,
      category
    } = req.body;

    // Validate required fields
    if (!serviceType || !description || !phone || !city) {
      res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Missing required fields: serviceType, description, phone, city'
        }
      });
      return;
    }

    const caseId = uuidv4();
    const now = new Date().toISOString();

    // Create the case record
    await new Promise<void>((resolve, reject) => {
      db.db.run(
        `INSERT INTO marketplace_service_cases (
          id, service_type, description, preferred_date, preferred_time,
          priority, city, neighborhood, phone, additional_details, provider_id,
          provider_name, is_open_case, assignment_type, status,
          customer_id, category, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          caseId,
          serviceType,
          description,
          preferredDate,
          preferredTime || 'morning',
          priority || 'normal',
          city,
          neighborhood,
          phone,
          additionalDetails,
          assignmentType === 'specific' ? providerId : null,
          assignmentType === 'specific' ? providerName : null,
          assignmentType === 'open' ? 1 : 0,
          assignmentType || 'open',
          'pending',
          customerId,
          category || serviceType || 'general',
          now,
          now
        ],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });

    // Handle screenshots if provided
    if (screenshots && screenshots.length > 0) {
      for (const screenshot of screenshots) {
        // Skip screenshots without a valid URL
        const imageUrl = screenshot.url || screenshot.name || screenshot;
        if (!imageUrl || typeof imageUrl !== 'string') {
          continue;
        }

        const screenshotId = uuidv4();
        await new Promise<void>((resolve, reject) => {
          db.db.run(
            `INSERT INTO case_screenshots (id, case_id, image_url, created_at) VALUES (?, ?, ?, ?)`,
            [screenshotId, caseId, imageUrl, now],
            function(err) {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            }
          );
        });
      }
    }

    // Send notification to SP if case is directly assigned to them
    if (assignmentType === 'specific' && providerId) {
      logger.info('🔔 Creating notification for directly assigned SP', { providerId, caseId });
      try {
        await notificationService.createNotification(
          providerId,
          'case_assigned',
          'Нова заявка директно възложена',
          `Клиент ви възложи нова заявка: ${description.substring(0, 50)}...`,
          { caseId, action: 'view_case' }
        );
        logger.info('✅ Notification sent to SP for direct assignment', { providerId, caseId });
      } catch (notifError) {
        logger.error('❌ Error sending notification to SP:', notifError);
      }
    }

    logger.info('✅ Service case created successfully', { caseId, serviceType, assignmentType });

    res.status(201).json({
      success: true,
      data: {
        caseId,
        message: assignmentType === 'specific' 
          ? `Case assigned to ${providerName}` 
          : 'Case created and available to all providers'
      }
    });

  } catch (error) {
    logger.error('❌ Error creating service case:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create service case'
      }
    });
  }
};

/**
 * Get cases for a specific provider
 */
export const getProviderCases = async (req: Request, res: Response): Promise<void> => {
  try {
    const { providerId } = req.params;

    if (!providerId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Provider ID is required'
        }
      });
      return;
    }

    const cases = await new Promise<any[]>((resolve, reject) => {
      db.db.all(
        `SELECT * FROM marketplace_service_cases 
         WHERE provider_id = ? OR is_open_case = 1 
         ORDER BY created_at DESC`,
        [providerId],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows || []);
          }
        }
      );
    });

    res.json({
      success: true,
      data: cases
    });

  } catch (error) {
    logger.error('❌ Error fetching provider cases:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch cases'
      }
    });
  }
};

/**
 * Accept a case
 */
export const acceptCase = async (req: Request, res: Response): Promise<void> => {
  try {
    const { caseId } = req.params;
    const { providerId, providerName } = req.body;

    if (!caseId || !providerId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Case ID and Provider ID are required'
        }
      });
      return;
    }

    const now = new Date().toISOString();

    await new Promise<void>((resolve, reject) => {
      db.db.run(
        `UPDATE marketplace_service_cases 
         SET status = 'accepted', provider_id = ?, provider_name = ?, updated_at = ?
         WHERE id = ? AND status = 'pending'`,
        [providerId, providerName, now, caseId],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });

    // Get case details for notification
    const caseDetails = await new Promise<any>((resolve, reject) => {
      db.db.get(
        'SELECT customer_id FROM marketplace_service_cases WHERE id = ?',
        [caseId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    // Send notification to customer that their case was accepted
    if (caseDetails?.customer_id) {
      await notificationService.notifyCaseAssigned(
        caseId,
        caseDetails.customer_id,
        providerId,
        providerName
      );
    }

    logger.info('✅ Case accepted successfully', { caseId, providerId });

    res.json({
      success: true,
      data: {
        message: 'Case accepted successfully'
      }
    });

  } catch (error) {
    logger.error('❌ Error accepting case:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to accept case'
      }
    });
  }
};

/**
 * Decline a case - tracks provider-specific declines
 */
export const declineCase = async (req: Request, res: Response): Promise<void> => {
  try {
    const { caseId } = req.params;
    const { reason, providerId } = req.body;

    if (!caseId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Case ID is required'
        }
      });
      return;
    }

    // Get provider ID from authenticated user if not provided
    const actualProviderId = providerId || (req as any).user?.id;

    if (!actualProviderId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Provider ID is required'
        }
      });
      return;
    }

    const now = new Date().toISOString();
    const declineId = require('uuid').v4();

    // Check if this provider already declined this case
    const existingDecline = await new Promise<any>((resolve, reject) => {
      db.db.get(
        'SELECT * FROM case_declines WHERE case_id = ? AND provider_id = ?',
        [caseId, actualProviderId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (existingDecline) {
      res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_DECLINED',
          message: 'You have already declined this case'
        }
      });
      return;
    }

    // Get the case details
    const caseDetails = await new Promise<any>((resolve, reject) => {
      db.db.get(
        'SELECT * FROM marketplace_service_cases WHERE id = ?',
        [caseId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!caseDetails) {
      res.status(404).json({
        success: false,
        error: {
          code: 'CASE_NOT_FOUND',
          message: 'Case not found'
        }
      });
      return;
    }

    // Record the decline for this specific provider
    await new Promise<void>((resolve, reject) => {
      db.db.run(
        `INSERT INTO case_declines (id, case_id, provider_id, reason, declined_at)
         VALUES (?, ?, ?, ?, ?)`,
        [declineId, caseId, actualProviderId, reason, now],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });

    // If case was assigned to this provider, unassign it and return to queue
    if (caseDetails.provider_id === actualProviderId) {
      await new Promise<void>((resolve, reject) => {
        db.db.run(
          `UPDATE marketplace_service_cases 
           SET provider_id = NULL, status = 'pending', updated_at = ?
           WHERE id = ?`,
          [now, caseId],
          function(err) {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          }
        );
      });
      logger.info('✅ Case unassigned and returned to queue', { caseId, providerId: actualProviderId });
    }

    logger.info('✅ Case declined by provider', { caseId, providerId: actualProviderId, reason });

    res.json({
      success: true,
      data: {
        message: 'Case declined successfully',
        returnedToQueue: caseDetails.provider_id === actualProviderId
      }
    });

  } catch (error) {
    logger.error('❌ Error declining case:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to decline case'
      }
    });
  }
};

/**
 * Un-decline a case (remove from declined list so provider can see it again)
 */
export const undeclineCase = async (req: Request, res: Response): Promise<void> => {
  try {
    const { caseId } = req.params;
    const { providerId } = req.body;

    if (!caseId || !providerId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Case ID and Provider ID are required'
        }
      });
      return;
    }

    // Remove the decline record
    await new Promise<void>((resolve, reject) => {
      db.db.run(
        'DELETE FROM case_declines WHERE case_id = ? AND provider_id = ?',
        [caseId, providerId],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });

    logger.info('✅ Case un-declined', { caseId, providerId });

    res.json({
      success: true,
      data: {
        message: 'Case un-declined successfully'
      }
    });

  } catch (error) {
    logger.error('❌ Error un-declining case:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to un-decline case'
      }
    });
  }
};

/**
 * Get declined cases for a provider
 */
export const getDeclinedCases = async (req: Request, res: Response): Promise<void> => {
  try {
    const { providerId } = req.params;

    const cases = await new Promise<any[]>((resolve, reject) => {
      db.db.all(
        `SELECT c.*, cd.declined_at, cd.reason as decline_reason
         FROM marketplace_service_cases c
         INNER JOIN case_declines cd ON c.id = cd.case_id
         WHERE cd.provider_id = ?
         ORDER BY cd.declined_at DESC`,
        [providerId],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows || []);
          }
        }
      );
    });

    res.json({
      success: true,
      data: cases
    });

  } catch (error) {
    logger.error('❌ Error fetching declined cases:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch declined cases'
      }
    });
  }
};

/**
 * Get available cases for a provider (open cases)
 * Excludes cases that this provider has already declined
 */
export const getAvailableCases = async (req: Request, res: Response): Promise<void> => {
  try {
    const { providerId } = req.params;

    const cases = await new Promise<any[]>((resolve, reject) => {
      db.db.all(
        `SELECT c.* FROM marketplace_service_cases c
         WHERE (
           (c.is_open_case = 1 AND c.status = 'pending') 
           OR (c.provider_id = ? AND c.status != 'closed')
         )
         AND c.id NOT IN (
           SELECT case_id FROM case_declines WHERE provider_id = ?
         )
         ORDER BY c.created_at DESC`,
        [providerId, providerId],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows || []);
          }
        }
      );
    });

    res.json({
      success: true,
      data: cases
    });

  } catch (error) {
    logger.error('❌ Error fetching available cases:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch available cases'
      }
    });
  }
};

/**
 * Complete a case (mark as closed/completed)
 */
export const completeCase = async (req: Request, res: Response): Promise<void> => {
  try {
    const { caseId } = req.params;
    const { completionNotes, income } = req.body;

    if (!caseId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Case ID is required'
        }
      });
      return;
    }

    const now = new Date().toISOString();

    await new Promise<void>((resolve, reject) => {
      db.db.run(
        `UPDATE marketplace_service_cases 
         SET status = 'completed', completion_notes = ?, completed_at = ?, updated_at = ?
         WHERE id = ? AND status IN ('wip', 'accepted')`,
        [completionNotes, now, now, caseId],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });

    // Get case details for notification and income tracking
    const caseDetails = await new Promise<any>((resolve, reject) => {
      db.db.get(
        'SELECT customer_id, provider_id FROM marketplace_service_cases WHERE id = ?',
        [caseId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    // Record income if provided
    if (income && income.amount && caseDetails?.provider_id) {
      const incomeId = uuidv4();
      await new Promise<void>((resolve, reject) => {
        db.db.run(
          `INSERT INTO case_income (
            id, case_id, provider_id, customer_id, amount, 
            currency, payment_method, notes, recorded_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            incomeId,
            caseId,
            caseDetails.provider_id,
            caseDetails.customer_id,
            income.amount,
            income.currency || 'BGN',
            income.paymentMethod || null,
            income.notes || null,
            now,
            now,
            now
          ],
          function(err) {
            if (err) {
              logger.error('❌ Error recording income:', err);
              reject(err);
            } else {
              logger.info('💰 Income recorded successfully', { incomeId, amount: income.amount });
              resolve();
            }
          }
        );
      });
    }

    // Send notification to customer and request review
    if (caseDetails?.customer_id && caseDetails?.provider_id) {
      logger.info('🔔 Sending completion notification to customer', { 
        caseId, 
        customerId: caseDetails.customer_id, 
        providerId: caseDetails.provider_id 
      });
      try {
        await notificationService.notifyCaseCompleted(
          caseId,
          caseDetails.customer_id,
          caseDetails.provider_id
        );
        logger.info('✅ Completion notification sent successfully');
      } catch (notifError) {
        logger.error('❌ Error sending completion notification:', notifError);
      }
    } else {
      logger.warn('⚠️ Cannot send notification - missing customer or provider ID', { caseDetails });
    }

    logger.info('✅ Case completed successfully', { caseId, incomeRecorded: !!income });

    res.json({
      success: true,
      data: {
        message: 'Case completed successfully',
        incomeRecorded: !!income
      }
    });

  } catch (error) {
    logger.error('❌ Error completing case:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to complete case'
      }
    });
  }
};

/**
 * Get a single case by ID
 */
export const getCase = async (req: Request, res: Response): Promise<void> => {
  try {
    const { caseId } = req.params;

    if (!caseId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_CASE_ID',
          message: 'Case ID is required'
        }
      });
      return;
    }

    const caseData = await new Promise<any>((resolve, reject) => {
      db.db.get(
        'SELECT * FROM marketplace_service_cases WHERE id = ?',
        [caseId],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });

    if (!caseData) {
      res.status(404).json({
        success: false,
        error: {
          code: 'CASE_NOT_FOUND',
          message: 'Case not found'
        }
      });
      return;
    }

    res.json({
      success: true,
      data: caseData
    });

  } catch (error) {
    logger.error('❌ Error getting case:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get case'
      }
    });
  }
};

/**
 * Get cases with filtering and pagination
 */
export const getCasesWithFilters = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      status, 
      category,
      city,
      neighborhood,
      providerId, 
      customerId, 
      createdByUserId,
      onlyUnassigned,
      excludeDeclinedBy,
      page = 1, 
      limit = 10,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    console.log('🔍 Backend - getCasesWithFilters query params:', req.query);

    // Build WHERE clause dynamically
    const conditions: string[] = [];
    const params: any[] = [];

    if (status) {
      conditions.push('c.status = ?');
      params.push(status);
    }

    if (category) {
      conditions.push('c.category = ?');
      params.push(category);
    }

    if (city) {
      conditions.push('c.city = ?');
      params.push(city);
    }

    if (neighborhood) {
      conditions.push('c.neighborhood = ?');
      params.push(neighborhood);
    }

    // Handle user-specific filtering
    if (createdByUserId) {
      if (onlyUnassigned === 'true') {
        // Show only unassigned cases, excluding ones this provider has declined
        conditions.push('c.customer_id = ? AND c.provider_id IS NULL');
        conditions.push(`c.id NOT IN (SELECT case_id FROM case_declines WHERE provider_id = ?)`);
        params.push(createdByUserId, createdByUserId);
      } else {
        // Show cases where user is either customer, provider, or created the case
        conditions.push('(c.customer_id = ? OR c.provider_id = ?)');
        params.push(createdByUserId, createdByUserId);
      }
    } else {
      // Only apply individual filters if createdByUserId is not provided
      if (providerId) {
        conditions.push('c.provider_id = ?');
        params.push(providerId);
        
        // If filtering by providerId and showing unassigned, exclude declined cases
        if (onlyUnassigned === 'true') {
          conditions.push(`c.id NOT IN (SELECT case_id FROM case_declines WHERE provider_id = ?)`);
          params.push(providerId);
        }
      }

      if (customerId) {
        conditions.push('c.customer_id = ?');
        params.push(customerId);
      }
    }

    // Exclude cases declined by a specific provider (for available cases view)
    if (excludeDeclinedBy) {
      conditions.push(`c.id NOT IN (SELECT case_id FROM case_declines WHERE provider_id = ?)`);
      params.push(excludeDeclinedBy);
      console.log('🚫 Backend - Excluding cases declined by provider:', excludeDeclinedBy);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (Number(page) - 1) * Number(limit);

    console.log('🔍 Backend - SQL WHERE clause:', whereClause);
    console.log('🔍 Backend - SQL params:', params);

    // Get total count
    const totalCount = await new Promise<number>((resolve, reject) => {
      db.db.get(
        `SELECT COUNT(*) as count FROM marketplace_service_cases c ${whereClause}`,
        params,
        (err, row: any) => {
          if (err) {
            reject(err);
          } else {
            resolve(row?.count || 0);
          }
        }
      );
    });

    // Get cases with pagination
    const cases = await new Promise<any[]>((resolve, reject) => {
      // If no specific status filter is applied, sort by status priority
      let orderClause;
      if (!status) {
        // Custom status priority: pending -> accepted -> wip -> declined -> completed
        orderClause = `ORDER BY 
          CASE c.status 
            WHEN 'pending' THEN 1 
            WHEN 'accepted' THEN 2 
            WHEN 'wip' THEN 3 
            WHEN 'declined' THEN 4 
            WHEN 'completed' THEN 5 
            ELSE 6 
          END ASC, 
          c.created_at DESC`;
      } else {
        orderClause = `ORDER BY c.${sortBy} ${sortOrder}`;
      }

      db.db.all(
        `SELECT 
           c.*,
           u.first_name || ' ' || u.last_name as customer_name
         FROM marketplace_service_cases c
         LEFT JOIN users u ON c.customer_id = u.id
         ${whereClause}
         ${orderClause}
         LIMIT ? OFFSET ?`,
        [...params, Number(limit), offset],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows || []);
          }
        }
      );
    });

    res.json({
      success: true,
      data: {
        cases,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: totalCount,
          totalPages: Math.ceil(totalCount / Number(limit))
        }
      }
    });

  } catch (error) {
    logger.error('❌ Error fetching cases with filters:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch cases'
      }
    });
  }
};

/**
 * Get case statistics
 */
export const getCaseStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { providerId, customerId } = req.query;

    let whereClause = '';
    const params: any[] = [];

    if (providerId) {
      whereClause = 'WHERE provider_id = ?';
      params.push(providerId);
    } else if (customerId) {
      whereClause = 'WHERE customer_id = ?';
      params.push(customerId);
    }

    // Get status distribution
    const statusStats = await new Promise<any[]>((resolve, reject) => {
      db.db.all(
        `SELECT status, COUNT(*) as count FROM marketplace_service_cases ${whereClause} GROUP BY status`,
        params,
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows || []);
          }
        }
      );
    });

    // Get available cases count (unassigned cases for service providers, excluding declined)
    let availableCount = 0;
    if (providerId) {
      availableCount = await new Promise<number>((resolve, reject) => {
        db.db.get(
          `SELECT COUNT(*) as count FROM marketplace_service_cases 
           WHERE provider_id IS NULL 
           AND status = 'pending'
           AND id NOT IN (SELECT case_id FROM case_declines WHERE provider_id = ?)`,
          [providerId],
          (err, row: any) => {
            if (err) reject(err);
            else resolve(row?.count || 0);
          }
        );
      });
    }

    // Get declined cases count for this provider
    let declinedCount = 0;
    if (providerId) {
      declinedCount = await new Promise<number>((resolve, reject) => {
        db.db.get(
          `SELECT COUNT(*) as count FROM case_declines WHERE provider_id = ?`,
          [providerId],
          (err, row: any) => {
            if (err) reject(err);
            else resolve(row?.count || 0);
          }
        );
      });
    }

    // Get category distribution
    const categoryStats = await new Promise<any[]>((resolve, reject) => {
      db.db.all(
        `SELECT category, COUNT(*) as count FROM marketplace_service_cases ${whereClause} GROUP BY category`,
        params,
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows || []);
          }
        }
      );
    });

    // Transform statusStats array into object with counts
    const stats: any = {
      available: availableCount,
      pending: 0,
      accepted: 0,
      wip: 0,
      completed: 0,
      declined: declinedCount // Use the count from case_declines table
    };

    statusStats.forEach((stat: any) => {
      if (stat.status === 'pending') stats.pending = stat.count;
      else if (stat.status === 'accepted') stats.accepted = stat.count;
      else if (stat.status === 'wip') stats.wip = stat.count;
      else if (stat.status === 'completed') stats.completed = stat.count;
    });

    res.json({
      success: true,
      data: {
        ...stats,
        statusStats,
        categoryStats
      }
    });

  } catch (error) {
    logger.error('❌ Error fetching case stats:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch case statistics'
      }
    });
  }
};

/**
 * Get smart-matched providers for a case
 */
export const getSmartMatches = async (req: Request, res: Response): Promise<void> => {
  try {
    const { caseId } = req.params;
    const { limit = 10 } = req.query;

    if (!caseId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Case ID is required'
        }
      });
      return;
    }

    // Get case details
    const caseData = await new Promise<any>((resolve, reject) => {
      db.db.get(
        'SELECT * FROM marketplace_service_cases WHERE id = ?',
        [caseId],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });

    if (!caseData) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Case not found'
        }
      });
      return;
    }

    // Use smart matching service
    const smartMatching = new SmartMatchingService();
    const matches = await smartMatching.findBestProviders(caseData, Number(limit));

    logger.info('✅ Smart matches found for case', { caseId, matchCount: matches.length });

    res.json({
      success: true,
      data: {
        caseId,
        matches: matches.map(match => ({
          provider: {
            id: match.provider.id,
            businessName: match.provider.business_name,
            firstName: match.provider.first_name,
            lastName: match.provider.last_name,
            serviceCategory: match.provider.service_category,
            city: match.provider.city,
            neighborhood: match.provider.neighborhood,
            rating: match.provider.rating,
            totalReviews: match.provider.total_reviews,
            experienceYears: match.provider.experience_years,
            hourlyRate: match.provider.hourly_rate,
            isAvailable: match.provider.is_available
          },
          score: match.score,
          matchFactors: match.factors
        }))
      }
    });

  } catch (error) {
    logger.error('❌ Error getting smart matches:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get smart matches'
      }
    });
  }
};

/**
 * Auto-assign case to best provider
 */
export const autoAssignCase = async (req: Request, res: Response): Promise<void> => {
  try {
    const { caseId } = req.params;

    if (!caseId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Case ID is required'
        }
      });
      return;
    }

    const smartMatching = new SmartMatchingService();
    const assignedProviderId = await smartMatching.autoAssignCase(caseId);

    if (!assignedProviderId) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NO_PROVIDERS',
          message: 'No suitable providers found for auto-assignment'
        }
      });
      return;
    }

    logger.info('✅ Case auto-assigned successfully', { caseId, assignedProviderId });

    res.json({
      success: true,
      data: {
        message: 'Case auto-assigned successfully',
        assignedProviderId
      }
    });

  } catch (error) {
    logger.error('❌ Error auto-assigning case:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to auto-assign case'
      }
    });
  }
};

/**
 * Get income statistics for a provider
 */
export const getIncomeStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { providerId } = req.params;
    const { startDate, endDate, period = 'month' } = req.query;

    if (!providerId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Provider ID is required'
        }
      });
      return;
    }

    let whereClause = 'WHERE provider_id = ?';
    const params: any[] = [providerId];

    // Add date filters if provided
    if (startDate) {
      whereClause += ' AND recorded_at >= ?';
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ' AND recorded_at <= ?';
      params.push(endDate);
    }

    // Get total income
    const totalIncome = await new Promise<number>((resolve, reject) => {
      db.db.get(
        `SELECT COALESCE(SUM(amount), 0) as total FROM case_income ${whereClause}`,
        params,
        (err, row: any) => {
          if (err) reject(err);
          else resolve(row?.total || 0);
        }
      );
    });

    // Get income count
    const incomeCount = await new Promise<number>((resolve, reject) => {
      db.db.get(
        `SELECT COUNT(*) as count FROM case_income ${whereClause}`,
        params,
        (err, row: any) => {
          if (err) reject(err);
          else resolve(row?.count || 0);
        }
      );
    });

    // Get average income per case
    const avgIncome = incomeCount > 0 ? totalIncome / incomeCount : 0;

    // Get monthly breakdown
    const monthlyIncome = await new Promise<any[]>((resolve, reject) => {
      db.db.all(
        `SELECT 
          strftime('%Y-%m', recorded_at) as month,
          SUM(amount) as total,
          COUNT(*) as count,
          AVG(amount) as average
         FROM case_income 
         ${whereClause}
         GROUP BY strftime('%Y-%m', recorded_at)
         ORDER BY month DESC
         LIMIT 12`,
        params,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    // Get payment method breakdown
    const paymentMethods = await new Promise<any[]>((resolve, reject) => {
      db.db.all(
        `SELECT 
          COALESCE(payment_method, 'Неуточнен') as method,
          SUM(amount) as total,
          COUNT(*) as count
         FROM case_income 
         ${whereClause}
         GROUP BY payment_method`,
        params,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    logger.info('✅ Income stats retrieved', { providerId, totalIncome, incomeCount });

    res.json({
      success: true,
      data: {
        summary: {
          totalIncome: Math.round(totalIncome * 100) / 100,
          incomeCount,
          averageIncome: Math.round(avgIncome * 100) / 100,
          currency: 'BGN'
        },
        monthlyIncome: monthlyIncome.map(m => ({
          month: m.month,
          total: Math.round(m.total * 100) / 100,
          count: m.count,
          average: Math.round(m.average * 100) / 100
        })),
        paymentMethods: paymentMethods.map(pm => ({
          method: pm.method,
          total: Math.round(pm.total * 100) / 100,
          count: pm.count
        }))
      }
    });

  } catch (error) {
    logger.error('❌ Error fetching income stats:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch income statistics'
      }
    });
  }
};

/**
 * Get income transactions by payment method
 */
export const getIncomeTransactionsByMethod = async (req: Request, res: Response): Promise<void> => {
  try {
    const { providerId, paymentMethod } = req.params;

    if (!providerId || !paymentMethod) {
      res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Provider ID and payment method are required'
        }
      });
      return;
    }

    const transactions = await new Promise<any[]>((resolve, reject) => {
      db.db.all(
        `SELECT 
          ci.*,
          c.description as case_description,
          c.service_type
         FROM case_income ci
         LEFT JOIN marketplace_service_cases c ON ci.case_id = c.id
         WHERE ci.provider_id = ? AND COALESCE(ci.payment_method, 'Неуточнен') = ?
         ORDER BY ci.recorded_at DESC`,
        [providerId, paymentMethod],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    res.json({
      success: true,
      data: transactions
    });

  } catch (error) {
    logger.error('❌ Error fetching income transactions:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch income transactions'
      }
    });
  }
};

/**
 * Get income transactions by month
 */
export const getIncomeTransactionsByMonth = async (req: Request, res: Response): Promise<void> => {
  try {
    const { providerId, month } = req.params;

    if (!providerId || !month) {
      res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Provider ID and month are required'
        }
      });
      return;
    }

    const transactions = await new Promise<any[]>((resolve, reject) => {
      db.db.all(
        `SELECT 
          ci.*,
          c.description as case_description,
          c.service_type
         FROM case_income ci
         LEFT JOIN marketplace_service_cases c ON ci.case_id = c.id
         WHERE ci.provider_id = ? AND strftime('%Y-%m', ci.recorded_at) = ?
         ORDER BY ci.recorded_at DESC`,
        [providerId, month],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    res.json({
      success: true,
      data: transactions
    });

  } catch (error) {
    logger.error('❌ Error fetching income transactions by month:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch income transactions'
      }
    });
  }
};

/**
 * Update income transaction
 */
export const updateIncomeTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const { incomeId } = req.params;
    const { amount, paymentMethod, notes } = req.body;

    if (!incomeId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Income ID is required'
        }
      });
      return;
    }

    const now = new Date().toISOString();

    await new Promise<void>((resolve, reject) => {
      db.db.run(
        `UPDATE case_income 
         SET amount = ?, payment_method = ?, notes = ?, updated_at = ?
         WHERE id = ?`,
        [amount, paymentMethod, notes, now, incomeId],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });

    logger.info('✅ Income transaction updated', { incomeId, amount });

    res.json({
      success: true,
      data: {
        message: 'Income transaction updated successfully'
      }
    });

  } catch (error) {
    logger.error('❌ Error updating income transaction:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update income transaction'
      }
    });
  }
};

/**
 * Get available years with income data for a provider
 */
export const getIncomeYears = async (req: Request, res: Response): Promise<void> => {
  try {
    const { providerId } = req.params;

    if (!providerId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Provider ID is required'
        }
      });
      return;
    }

    const years = await new Promise<any[]>((resolve, reject) => {
      db.db.all(
        `SELECT DISTINCT strftime('%Y', recorded_at) as year
         FROM case_income 
         WHERE provider_id = ? AND recorded_at IS NOT NULL
         ORDER BY year ASC`,
        [providerId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    const yearList = years.map(row => parseInt(row.year)).filter(year => !isNaN(year));

    logger.info('✅ Income years retrieved', { providerId, years: yearList });

    res.json({
      success: true,
      data: yearList
    });

  } catch (error) {
    logger.error('❌ Error fetching income years:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch income years'
      }
    });
  }
};

/**
 * Update case status
 */
export const updateCaseStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { caseId } = req.params;
    const { status, message } = req.body;

    if (!caseId || !status) {
      res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Case ID and status are required'
        }
      });
      return;
    }

    // Validate status values
    const validStatuses = ['pending', 'accepted', 'declined', 'completed', 'wip', 'closed'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        }
      });
      return;
    }

    const now = new Date().toISOString();

    await new Promise<void>((resolve, reject) => {
      db.db.run(
        `UPDATE marketplace_service_cases 
         SET status = ?, updated_at = ?, completion_notes = ?
         WHERE id = ?`,
        [status, now, message || null, caseId],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });

    // If status is completed, also set completed_at
    if (status === 'completed') {
      await new Promise<void>((resolve, reject) => {
        db.db.run(
          `UPDATE marketplace_service_cases 
           SET completed_at = ?
           WHERE id = ?`,
          [now, caseId],
          function(err) {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          }
        );
      });

      // Get case details for notification
      const caseDetails = await new Promise<any>((resolve, reject) => {
        db.db.get(
          'SELECT customer_id, provider_id FROM marketplace_service_cases WHERE id = ?',
          [caseId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      // Send notification to customer and request review
      console.log('🏁 Case completion - Case details for notification:', caseDetails);
      if (caseDetails?.customer_id && caseDetails?.provider_id) {
        console.log('🏁 Case completion - Calling notifyCaseCompleted...');
        await notificationService.notifyCaseCompleted(
          caseId,
          caseDetails.customer_id,
          caseDetails.provider_id
        );
        console.log('🏁 Case completion - Notification service called successfully');
      } else {
        console.log('🏁 Case completion - Missing customer_id or provider_id, skipping notification');
      }
    }

    logger.info('✅ Case status updated successfully', { caseId, status });

    res.json({
      success: true,
      data: {
        message: `Case status updated to ${status}`,
        caseId,
        status
      }
    });

  } catch (error) {
    logger.error('❌ Error updating case status:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update case status'
      }
    });
  }
};