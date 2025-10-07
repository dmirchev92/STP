"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendReviewRequest = exports.getPendingReviews = exports.canReviewCase = exports.getProviderReviewStats = exports.getProviderReviews = exports.createReview = void 0;
const ReviewService_1 = __importDefault(require("../services/ReviewService"));
const logger_1 = __importDefault(require("../utils/logger"));
const reviewService = new ReviewService_1.default();
const createReview = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { caseId, providerId, rating, comment, serviceQuality, communication, timeliness, valueForMoney, wouldRecommend } = req.body;
        if (!userId) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'User not authenticated'
                }
            });
            return;
        }
        if (!caseId || !providerId || !rating) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'BAD_REQUEST',
                    message: 'Missing required fields: caseId, providerId, rating'
                }
            });
            return;
        }
        if (rating < 1 || rating > 5) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'BAD_REQUEST',
                    message: 'Rating must be between 1 and 5'
                }
            });
            return;
        }
        const reviewId = await reviewService.createReview({
            caseId,
            customerId: userId,
            providerId,
            rating,
            comment,
            serviceQuality,
            communication,
            timeliness,
            valueForMoney,
            wouldRecommend
        });
        await reviewService.updateProviderRating(providerId);
        res.status(201).json({
            success: true,
            data: {
                reviewId,
                message: 'Review created successfully'
            }
        });
    }
    catch (error) {
        logger_1.default.error('❌ Error creating review:', error);
        if (error instanceof Error) {
            if (error.message.includes('already exists')) {
                res.status(409).json({
                    success: false,
                    error: {
                        code: 'REVIEW_EXISTS',
                        message: 'You have already reviewed this service'
                    }
                });
                return;
            }
            if (error.message.includes('not found') || error.message.includes('not completed')) {
                res.status(404).json({
                    success: false,
                    error: {
                        code: 'CASE_NOT_FOUND',
                        message: 'Case not found or not completed'
                    }
                });
                return;
            }
        }
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to create review'
            }
        });
    }
};
exports.createReview = createReview;
const getProviderReviews = async (req, res) => {
    try {
        const { providerId } = req.params;
        const { page = 1, limit = 10 } = req.query;
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
        const result = await reviewService.getProviderReviews(providerId, Number(page), Number(limit));
        res.json({
            success: true,
            data: {
                reviews: result.reviews,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total: result.total,
                    totalPages: Math.ceil(result.total / Number(limit))
                }
            }
        });
    }
    catch (error) {
        logger_1.default.error('❌ Error getting provider reviews:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to get reviews'
            }
        });
    }
};
exports.getProviderReviews = getProviderReviews;
const getProviderReviewStats = async (req, res) => {
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
        const stats = await reviewService.getProviderReviewStats(providerId);
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        logger_1.default.error('❌ Error getting provider review stats:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to get review statistics'
            }
        });
    }
};
exports.getProviderReviewStats = getProviderReviewStats;
const canReviewCase = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { caseId } = req.params;
        if (!userId) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'User not authenticated'
                }
            });
            return;
        }
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
        const canReview = await reviewService.canReviewCase(caseId, userId);
        res.json({
            success: true,
            data: { canReview }
        });
    }
    catch (error) {
        logger_1.default.error('❌ Error checking review eligibility:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to check review eligibility'
            }
        });
    }
};
exports.canReviewCase = canReviewCase;
const getPendingReviews = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'User not authenticated'
                }
            });
            return;
        }
        const pendingReviews = await reviewService.getPendingReviews(userId);
        res.json({
            success: true,
            data: { pendingReviews }
        });
    }
    catch (error) {
        logger_1.default.error('❌ Error getting pending reviews:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to get pending reviews'
            }
        });
    }
};
exports.getPendingReviews = getPendingReviews;
const sendReviewRequest = async (req, res) => {
    try {
        const { caseId, customerId, providerName } = req.body;
        if (!caseId || !customerId || !providerName) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'BAD_REQUEST',
                    message: 'Missing required fields: caseId, customerId, providerName'
                }
            });
            return;
        }
        await reviewService.sendReviewRequest(caseId, customerId, providerName);
        res.json({
            success: true,
            data: {
                message: 'Review request sent successfully'
            }
        });
    }
    catch (error) {
        logger_1.default.error('❌ Error sending review request:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to send review request'
            }
        });
    }
};
exports.sendReviewRequest = sendReviewRequest;
//# sourceMappingURL=reviewController.js.map