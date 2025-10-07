'use client'

import { useState } from 'react'
import { apiClient } from '@/lib/api'

interface SurveyModalProps {
  isOpen: boolean
  onClose: () => void
  caseId: string
  providerId: string
  providerName: string
  onSubmitSuccess?: () => void
}

interface SurveyData {
  rating: number
  comment: string
  communication?: number
  quality?: number
  timeliness?: number
  valueForMoney?: number
  wouldRecommend?: boolean
}

export default function SurveyModal({
  isOpen,
  onClose,
  caseId,
  providerId,
  providerName,
  onSubmitSuccess
}: SurveyModalProps) {
  const [surveyData, setSurveyData] = useState<SurveyData>({
    rating: 0,
    comment: '',
    communication: 0,
    quality: 0,
    timeliness: 0,
    valueForMoney: 0,
    wouldRecommend: undefined
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Calculate overall rating based on individual ratings with half stars
  const calculateOverallRating = (communication: number, quality: number, timeliness: number, valueForMoney: number) => {
    const ratings = [communication, quality, timeliness, valueForMoney].filter(r => r > 0)
    if (ratings.length === 0) return 0
    const average = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
    // Round to nearest 0.5 (e.g., 3.2 -> 3.0, 3.3 -> 3.5, 3.7 -> 4.0)
    return Math.round(average * 2) / 2
  }

  const handleStarClick = (field: keyof SurveyData, value: number) => {
    setSurveyData(prev => {
      const newData = { ...prev, [field]: value }
      
      // If updating individual ratings, recalculate overall rating
      if (field !== 'rating') {
        const communication = field === 'communication' ? value : prev.communication || 0
        const quality = field === 'quality' ? value : prev.quality || 0
        const timeliness = field === 'timeliness' ? value : prev.timeliness || 0
        const valueForMoney = field === 'valueForMoney' ? value : prev.valueForMoney || 0
        
        const overallRating = calculateOverallRating(communication, quality, timeliness, valueForMoney)
        
        newData.rating = overallRating
      }
      
      return newData
    })
  }

  // Render stars with half-star support for display only
  const renderStarsDisplay = (rating: number) => {
    const stars = []
    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        // Full star
        stars.push(
          <span key={i} className="text-2xl text-yellow-400">⭐</span>
        )
      } else if (i - 0.5 <= rating) {
        // Half star - using a combination of full and empty
        stars.push(
          <span key={i} className="text-2xl relative inline-block">
            <span className="text-gray-300">⭐</span>
            <span className="absolute inset-0 text-yellow-400 overflow-hidden" style={{ width: '50%' }}>⭐</span>
          </span>
        )
      } else {
        // Empty star
        stars.push(
          <span key={i} className="text-2xl text-gray-300">⭐</span>
        )
      }
    }
    return stars
  }

  const renderStars = (field: keyof SurveyData, currentValue: number) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={(e) => {
              e.preventDefault()
              handleStarClick(field, star)
            }}
            className={`text-2xl transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-50 rounded ${
              star <= currentValue
                ? 'text-yellow-400 hover:text-yellow-500'
                : 'text-gray-300 hover:text-yellow-300'
            }`}
            title={`Оценка ${star} от 5`}
          >
            ⭐
          </button>
        ))}
        {currentValue > 0 && (
          <span className="ml-2 text-sm text-gray-600">
            {currentValue}/5
          </span>
        )}
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (surveyData.rating === 0) {
      setError('Моля поставете поне една оценка от категориите по-долу')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const reviewPayload = {
        caseId,
        providerId,
        rating: surveyData.rating,
        comment: surveyData.comment,
        communication: surveyData.communication || undefined,
        serviceQuality: surveyData.quality || undefined,
        timeliness: surveyData.timeliness || undefined,
        valueForMoney: surveyData.valueForMoney || undefined,
        wouldRecommend: surveyData.wouldRecommend
      }
      
      await apiClient.createReview(reviewPayload)

      onSubmitSuccess?.()
      onClose()
    } catch (err: any) {
      console.error('Error submitting survey:', err)
      setError(err.response?.data?.message || 'Възникна грешка при изпращането на оценката')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Оценете услугата</h2>
              <p className="text-gray-600 mt-1">Как оценявате работата на {providerName}?</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ✕
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Overall Rating - Auto-calculated */}
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-3">
                Обща оценка <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center space-x-2 mb-2">
                <div className="flex space-x-1">
                  {renderStarsDisplay(surveyData.rating)}
                </div>
                <span className="ml-2 text-lg font-medium text-gray-700">
                  {surveyData.rating > 0 ? `${surveyData.rating}/5` : 'Не е оценено'}
                </span>
              </div>
              <p className="text-sm text-blue-600 mt-2">
                Общата оценка се изчислява автоматично като средна стойност (с половин звезди)
              </p>
            </div>

            {/* Detailed Ratings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Комуникация
                </label>
                {renderStars('communication', surveyData.communication || 0)}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Качество на работата
                </label>
                {renderStars('quality', surveyData.quality || 0)}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Спазване на срокове
                </label>
                {renderStars('timeliness', surveyData.timeliness || 0)}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Съотношение цена/качество
                </label>
                {renderStars('valueForMoney', surveyData.valueForMoney || 0)}
              </div>
            </div>

            {/* Would Recommend */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Бихте ли препоръчали този специалист?
              </label>
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => setSurveyData(prev => ({ ...prev, wouldRecommend: true }))}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    surveyData.wouldRecommend === true
                      ? 'bg-green-100 border-green-500 text-green-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  👍 Да
                </button>
                <button
                  type="button"
                  onClick={() => setSurveyData(prev => ({ ...prev, wouldRecommend: false }))}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    surveyData.wouldRecommend === false
                      ? 'bg-red-100 border-red-500 text-red-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  👎 Не
                </button>
              </div>
            </div>

            {/* Comment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Коментар (по желание)
              </label>
              <textarea
                value={surveyData.comment}
                onChange={(e) => setSurveyData(prev => ({ ...prev, comment: e.target.value }))}
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Споделете вашето мнение за услугата..."
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-6 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors"
              >
                Отказ
              </button>
              <button
                type="submit"
                disabled={isSubmitting || surveyData.rating === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Изпращане...' : 'Изпрати оценка'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
