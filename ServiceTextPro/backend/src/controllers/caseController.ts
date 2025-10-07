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
    if (!serviceType || !description || !address || !phone) {
      res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Missing required fields: serviceType, description, address, phone'
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
          priority, address, phone, additional_details, provider_id,
          provider_name, is_open_case, assignment_type, status,
          customer_id, category, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          caseId,
          serviceType,
          description,
          preferredDate,
          preferredTime || 'morning',
          priority || 'normal',
          address,
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
        const screenshotId = uuidv4();
        await new Promise<void>((resolve, reject) => {
          db.db.run(
            `INSERT INTO case_screenshots (id, case_id, image_url, created_at) VALUES (?, ?, ?, ?)`,
            [screenshotId, caseId, screenshot.url || screenshot.name, now],
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

    // Send notification to customer
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
 * Decline a case
 */
export const declineCase = async (req: Request, res: Response): Promise<void> => {
  try {
    const { caseId } = req.params;
    const { reason } = req.body;

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
         SET status = 'declined', decline_reason = ?, updated_at = ?
         WHERE id = ?`,
        [reason, now, caseId],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });

    logger.info('✅ Case declined successfully', { caseId, reason });

    res.json({
      success: true,
      data: {
        message: 'Case declined successfully'
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
 * Get available cases for a provider (open cases)
 */
export const getAvailableCases = async (req: Request, res: Response): Promise<void> => {
  try {
    const { providerId } = req.params;

    const cases = await new Promise<any[]>((resolve, reject) => {
      db.db.all(
        `SELECT * FROM marketplace_service_cases 
         WHERE (is_open_case = 1 AND status = 'pending') 
            OR (provider_id = ? AND status != 'closed')
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
    const { completionNotes } = req.body;

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
    if (caseDetails?.customer_id && caseDetails?.provider_id) {
      await notificationService.notifyCaseCompleted(
        caseId,
        caseDetails.customer_id,
        caseDetails.provider_id
      );
    }

    logger.info('✅ Case completed successfully', { caseId });

    res.json({
      success: true,
      data: {
        message: 'Case completed successfully'
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
      providerId, 
      customerId, 
      createdByUserId,
      onlyUnassigned,
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

    // Handle user-specific filtering
    if (createdByUserId) {
      if (onlyUnassigned === 'true') {
        // Show only unassigned cases created by this user
        conditions.push('c.customer_id = ? AND c.provider_id IS NULL');
        params.push(createdByUserId);
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
      }

      if (customerId) {
        conditions.push('c.customer_id = ?');
        params.push(customerId);
      }
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

    res.json({
      success: true,
      data: {
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