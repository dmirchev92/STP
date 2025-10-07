import { Request, Response } from 'express';
import ReviewService from '../services/ReviewService';
import logger from '../utils/logger';

const reviewService = new ReviewService();

/**
 * Create a new review
 */
export const createReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id; // From auth middleware
    const {
      caseId,
      providerId,
      rating,
      comment,
      serviceQuality,
      communication,
      timeliness,
      valueForMoney,
      wouldRecommend
    } = req.body;

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

    // Validate required fields
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

    // Validate rating range
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

    // Update provider's cached rating
    await reviewService.updateProviderRating(providerId);

    res.status(201).json({
      success: true,
      data: {
        reviewId,
        message: 'Review created successfully'
      }
    });

  } catch (error) {
    logger.error('❌ Error creating review:', error);
    
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

/**
 * Get reviews for a provider
 */
export const getProviderReviews = async (req: Request, res: Response): Promise<void> => {
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

    const result = await reviewService.getProviderReviews(
      providerId,
      Number(page),
      Number(limit)
    );

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

  } catch (error) {
    logger.error('❌ Error getting provider reviews:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get reviews'
      }
    });
  }
};

/**
 * Get review statistics for a provider
 */
export const getProviderReviewStats = async (req: Request, res: Response): Promise<void> => {
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

  } catch (error) {
    logger.error('❌ Error getting provider review stats:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get review statistics'
      }
    });
  }
};

/**
 * Check if user can review a case
 */
export const canReviewCase = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
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

  } catch (error) {
    logger.error('❌ Error checking review eligibility:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to check review eligibility'
      }
    });
  }
};

/**
 * Get pending reviews for authenticated user
 */
export const getPendingReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;

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

  } catch (error) {
    logger.error('❌ Error getting pending reviews:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get pending reviews'
      }
    });
  }
};

/**
 * Update provider rating (recalculate from reviews)
 */
export const updateProviderRating = async (req: Request, res: Response): Promise<void> => {
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

    await reviewService.updateProviderRating(providerId);

    res.json({
      success: true,
      data: {
        message: 'Provider rating updated successfully'
      }
    });

  } catch (error) {
    logger.error('❌ Error updating provider rating:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update provider rating'
      }
    });
  }
};

/**
 * Send review request notification
 */
export const sendReviewRequest = async (req: Request, res: Response): Promise<void> => {
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

  } catch (error) {
    logger.error('❌ Error sending review request:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to send review request'
      }
    });
  }
};
