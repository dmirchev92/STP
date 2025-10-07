"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoAssignCase = exports.getSmartMatches = exports.getCaseStats = exports.getCasesWithFilters = exports.completeCase = exports.getAvailableCases = exports.declineCase = exports.acceptCase = exports.getProviderCases = exports.createCase = void 0;
const SQLiteDatabase_1 = require("../models/SQLiteDatabase");
const logger_1 = __importDefault(require("../utils/logger"));
const uuid_1 = require("uuid");
const SmartMatchingService_1 = __importDefault(require("../services/SmartMatchingService"));
const NotificationService_1 = __importDefault(require("../services/NotificationService"));
const db = new SQLiteDatabase_1.SQLiteDatabase();
const notificationService = new NotificationService_1.default();
const createCase = async (req, res) => {
    try {
        const { serviceType, description, preferredDate, preferredTime, priority, address, phone, additionalDetails, providerId, providerName, isOpenCase, assignmentType, screenshots, customerId, category } = req.body;
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
        const caseId = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        await new Promise((resolve, reject) => {
            db.db.run(`INSERT INTO marketplace_service_cases (
          id, service_type, description, preferred_date, preferred_time,
          priority, address, phone, additional_details, provider_id,
          provider_name, is_open_case, assignment_type, status,
          customer_id, category, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
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
            ], function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
        if (screenshots && screenshots.length > 0) {
            for (const screenshot of screenshots) {
                const screenshotId = (0, uuid_1.v4)();
                await new Promise((resolve, reject) => {
                    db.db.run(`INSERT INTO case_screenshots (id, case_id, image_url, created_at) VALUES (?, ?, ?, ?)`, [screenshotId, caseId, screenshot.url || screenshot.name, now], function (err) {
                        if (err) {
                            reject(err);
                        }
                        else {
                            resolve();
                        }
                    });
                });
            }
        }
        logger_1.default.info('✅ Service case created successfully', { caseId, serviceType, assignmentType });
        res.status(201).json({
            success: true,
            data: {
                caseId,
                message: assignmentType === 'specific'
                    ? `Case assigned to ${providerName}`
                    : 'Case created and available to all providers'
            }
        });
    }
    catch (error) {
        logger_1.default.error('❌ Error creating service case:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to create service case'
            }
        });
    }
};
exports.createCase = createCase;
const getProviderCases = async (req, res) => {
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
        const cases = await new Promise((resolve, reject) => {
            db.db.all(`SELECT * FROM marketplace_service_cases 
         WHERE provider_id = ? OR is_open_case = 1 
         ORDER BY created_at DESC`, [providerId], (err, rows) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(rows || []);
                }
            });
        });
        res.json({
            success: true,
            data: cases
        });
    }
    catch (error) {
        logger_1.default.error('❌ Error fetching provider cases:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to fetch cases'
            }
        });
    }
};
exports.getProviderCases = getProviderCases;
const acceptCase = async (req, res) => {
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
        await new Promise((resolve, reject) => {
            db.db.run(`UPDATE marketplace_service_cases 
         SET status = 'accepted', provider_id = ?, provider_name = ?, updated_at = ?
         WHERE id = ? AND status = 'pending'`, [providerId, providerName, now, caseId], function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
        const caseDetails = await new Promise((resolve, reject) => {
            db.db.get('SELECT customer_id FROM marketplace_service_cases WHERE id = ?', [caseId], (err, row) => {
                if (err)
                    reject(err);
                else
                    resolve(row);
            });
        });
        if (caseDetails?.customer_id) {
            await notificationService.notifyCaseAssigned(caseId, caseDetails.customer_id, providerId, providerName);
        }
        logger_1.default.info('✅ Case accepted successfully', { caseId, providerId });
        res.json({
            success: true,
            data: {
                message: 'Case accepted successfully'
            }
        });
    }
    catch (error) {
        logger_1.default.error('❌ Error accepting case:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to accept case'
            }
        });
    }
};
exports.acceptCase = acceptCase;
const declineCase = async (req, res) => {
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
        await new Promise((resolve, reject) => {
            db.db.run(`UPDATE marketplace_service_cases 
         SET status = 'declined', decline_reason = ?, updated_at = ?
         WHERE id = ?`, [reason, now, caseId], function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
        logger_1.default.info('✅ Case declined successfully', { caseId, reason });
        res.json({
            success: true,
            data: {
                message: 'Case declined successfully'
            }
        });
    }
    catch (error) {
        logger_1.default.error('❌ Error declining case:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to decline case'
            }
        });
    }
};
exports.declineCase = declineCase;
const getAvailableCases = async (req, res) => {
    try {
        const { providerId } = req.params;
        const cases = await new Promise((resolve, reject) => {
            db.db.all(`SELECT * FROM marketplace_service_cases 
         WHERE (is_open_case = 1 AND status = 'pending') 
            OR (provider_id = ? AND status != 'closed')
         ORDER BY created_at DESC`, [providerId], (err, rows) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(rows || []);
                }
            });
        });
        res.json({
            success: true,
            data: cases
        });
    }
    catch (error) {
        logger_1.default.error('❌ Error fetching available cases:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to fetch available cases'
            }
        });
    }
};
exports.getAvailableCases = getAvailableCases;
const completeCase = async (req, res) => {
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
        await new Promise((resolve, reject) => {
            db.db.run(`UPDATE marketplace_service_cases 
         SET status = 'closed', completion_notes = ?, completed_at = ?, updated_at = ?
         WHERE id = ? AND status = 'wip'`, [completionNotes, now, now, caseId], function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
        const caseDetails = await new Promise((resolve, reject) => {
            db.db.get('SELECT customer_id, provider_id FROM marketplace_service_cases WHERE id = ?', [caseId], (err, row) => {
                if (err)
                    reject(err);
                else
                    resolve(row);
            });
        });
        if (caseDetails?.customer_id && caseDetails?.provider_id) {
            await notificationService.notifyCaseCompleted(caseId, caseDetails.customer_id, caseDetails.provider_id);
        }
        logger_1.default.info('✅ Case completed successfully', { caseId });
        res.json({
            success: true,
            data: {
                message: 'Case completed successfully'
            }
        });
    }
    catch (error) {
        logger_1.default.error('❌ Error completing case:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to complete case'
            }
        });
    }
};
exports.completeCase = completeCase;
const getCasesWithFilters = async (req, res) => {
    try {
        const { status, category, providerId, customerId, createdByUserId, onlyUnassigned, page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
        console.log('🔍 Backend - getCasesWithFilters query params:', req.query);
        const conditions = [];
        const params = [];
        if (status) {
            conditions.push('status = ?');
            params.push(status);
        }
        if (category) {
            conditions.push('category = ?');
            params.push(category);
        }
        if (createdByUserId) {
            if (onlyUnassigned === 'true') {
                conditions.push('customer_id = ? AND provider_id IS NULL');
                params.push(createdByUserId);
            }
            else {
                conditions.push('(customer_id = ? OR provider_id = ?)');
                params.push(createdByUserId, createdByUserId);
            }
        }
        else {
            if (providerId) {
                conditions.push('provider_id = ?');
                params.push(providerId);
            }
            if (customerId) {
                conditions.push('customer_id = ?');
                params.push(customerId);
            }
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const offset = (Number(page) - 1) * Number(limit);
        console.log('🔍 Backend - SQL WHERE clause:', whereClause);
        console.log('🔍 Backend - SQL params:', params);
        const totalCount = await new Promise((resolve, reject) => {
            db.db.get(`SELECT COUNT(*) as count FROM marketplace_service_cases ${whereClause}`, params, (err, row) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(row?.count || 0);
                }
            });
        });
        const cases = await new Promise((resolve, reject) => {
            db.db.all(`SELECT * FROM marketplace_service_cases 
         ${whereClause}
         ORDER BY ${sortBy} ${sortOrder}
         LIMIT ? OFFSET ?`, [...params, Number(limit), offset], (err, rows) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(rows || []);
                }
            });
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
    }
    catch (error) {
        logger_1.default.error('❌ Error fetching cases with filters:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to fetch cases'
            }
        });
    }
};
exports.getCasesWithFilters = getCasesWithFilters;
const getCaseStats = async (req, res) => {
    try {
        const { providerId, customerId } = req.query;
        let whereClause = '';
        const params = [];
        if (providerId) {
            whereClause = 'WHERE provider_id = ?';
            params.push(providerId);
        }
        else if (customerId) {
            whereClause = 'WHERE customer_id = ?';
            params.push(customerId);
        }
        const statusStats = await new Promise((resolve, reject) => {
            db.db.all(`SELECT status, COUNT(*) as count FROM marketplace_service_cases ${whereClause} GROUP BY status`, params, (err, rows) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(rows || []);
                }
            });
        });
        const categoryStats = await new Promise((resolve, reject) => {
            db.db.all(`SELECT category, COUNT(*) as count FROM marketplace_service_cases ${whereClause} GROUP BY category`, params, (err, rows) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(rows || []);
                }
            });
        });
        res.json({
            success: true,
            data: {
                statusStats,
                categoryStats
            }
        });
    }
    catch (error) {
        logger_1.default.error('❌ Error fetching case stats:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to fetch case statistics'
            }
        });
    }
};
exports.getCaseStats = getCaseStats;
const getSmartMatches = async (req, res) => {
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
        const caseData = await new Promise((resolve, reject) => {
            db.db.get('SELECT * FROM marketplace_service_cases WHERE id = ?', [caseId], (err, row) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(row);
                }
            });
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
        const smartMatching = new SmartMatchingService_1.default();
        const matches = await smartMatching.findBestProviders(caseData, Number(limit));
        logger_1.default.info('✅ Smart matches found for case', { caseId, matchCount: matches.length });
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
    }
    catch (error) {
        logger_1.default.error('❌ Error getting smart matches:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to get smart matches'
            }
        });
    }
};
exports.getSmartMatches = getSmartMatches;
const autoAssignCase = async (req, res) => {
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
        const smartMatching = new SmartMatchingService_1.default();
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
        logger_1.default.info('✅ Case auto-assigned successfully', { caseId, assignedProviderId });
        res.json({
            success: true,
            data: {
                message: 'Case auto-assigned successfully',
                assignedProviderId
            }
        });
    }
    catch (error) {
        logger_1.default.error('❌ Error auto-assigning case:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to auto-assign case'
            }
        });
    }
};
exports.autoAssignCase = autoAssignCase;
//# sourceMappingURL=caseController.js.map