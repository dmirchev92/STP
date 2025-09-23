'use client'

import React, { useState, useEffect } from 'react'

interface UnifiedCaseModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  mode: 'template' | 'direct'
  templateData?: any
  isSubmitting?: boolean
  providerName: string
  providerId?: string
  providerCategory?: string
  customerPhone?: string
}

export default function UnifiedCaseModal({
  isOpen,
  onClose,
  onSubmit,
  mode,
  templateData,
  isSubmitting = false,
  providerName,
  providerId,
  providerCategory,
  customerPhone
}: UnifiedCaseModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [screenshots, setScreenshots] = useState<File[]>([])
  const [dragActive, setDragActive] = useState(false)

  // Initialize form data based on mode
  useEffect(() => {
    if (mode === 'direct') {
      setFormData({
        serviceType: providerCategory || 'general',
        description: '',
        preferredDate: '',
        preferredTime: 'morning',
        priority: 'normal',
        address: '',
        phone: customerPhone || '',
        additionalDetails: '',
        assignmentType: providerId ? 'specific' : 'open'
      })
    } else if (mode === 'template' && templateData?.fields) {
      const initialData: Record<string, any> = {}
      templateData.fields.forEach((field: any) => {
        initialData[field.id] = field.defaultValue || ''
      })
      setFormData(initialData)
    }
  }, [mode, templateData, providerCategory, providerId, customerPhone])

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }))
  }

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return

    const newFiles = Array.from(files).filter(file => {
      // Check file type
      if (!file.type.startsWith('image/')) {
        alert('Моля, качете само изображения')
        return false
      }
      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert('Файлът е твърде голям. Максимален размер: 5MB')
        return false
      }
      return true
    })

    setScreenshots(prev => {
      const combined = [...prev, ...newFiles]
      if (combined.length > 5) {
        alert('Максимум 5 снимки')
        return prev
      }
      return combined
    })
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    handleFileUpload(e.dataTransfer.files)
  }

  const removeScreenshot = (index: number) => {
    setScreenshots(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (mode === 'direct') {
      // Validate required fields for direct mode
      if (!formData.description || !formData.preferredDate || !formData.address || !formData.phone) {
        alert('Моля, попълнете всички задължителни полета')
        return
      }
      
      onSubmit({
        ...formData,
        screenshots: screenshots
      })
    } else {
      // Template mode - submit template data
      onSubmit(formData)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 rounded-t-lg flex justify-between items-center">
          <h3 className="text-lg font-semibold">
            {mode === 'template' ? 'Попълни формата' : 'Създай заявка за услуга'}
          </h3>
          <button
            onClick={onClose}
            className="text-blue-200 hover:text-white"
            disabled={isSubmitting}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {mode === 'template' && templateData?.fields ? (
            // Template Mode - Dynamic form based on template
            <>
              <div className="mb-4">
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  {templateData.title || 'Информация за услугата'}
                </h4>
                {templateData.description && (
                  <p className="text-gray-600 text-sm mb-4">{templateData.description}</p>
                )}
              </div>

              {templateData.fields.map((field: any) => (
                <div key={field.id} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  
                  {field.type === 'text' && (
                    <input
                      type="text"
                      value={formData[field.id] || ''}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      placeholder={field.placeholder}
                      required={field.required}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                  
                  {field.type === 'textarea' && (
                    <textarea
                      value={formData[field.id] || ''}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      placeholder={field.placeholder}
                      required={field.required}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                  
                  {field.type === 'select' && (
                    <select
                      value={formData[field.id] || ''}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      required={field.required}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Изберете...</option>
                      {field.options?.map((option: any) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  )}
                  
                  {field.type === 'number' && (
                    <input
                      type="number"
                      value={formData[field.id] || ''}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      placeholder={field.placeholder}
                      required={field.required}
                      min={field.min}
                      max={field.max}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                  
                  {field.description && (
                    <p className="text-xs text-gray-500">{field.description}</p>
                  )}
                </div>
              ))}
            </>
          ) : (
            // Direct Mode - Standard case creation form
            <>
              <div className="mb-4">
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  Заявка за {providerName}
                </h4>
                <p className="text-gray-600 text-sm">
                  Попълнете информацията за услугата, която търсите
                </p>
              </div>

              {/* Service Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Тип услуга <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.serviceType || ''}
                  onChange={(e) => handleInputChange('serviceType', e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="electrician">Електротехник</option>
                  <option value="plumber">Водопроводчик</option>
                  <option value="hvac">Климатик</option>
                  <option value="carpenter">Дърводелец</option>
                  <option value="painter">Бояджия</option>
                  <option value="locksmith">Ключар</option>
                  <option value="cleaner">Почистване</option>
                  <option value="gardener">Градинар</option>
                  <option value="handyman">Майстор за всичко</option>
                  <option value="general">Друго</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Описание на проблема <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Опишете подробно какво трябва да се направи..."
                  required
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Предпочитана дата <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.preferredDate || ''}
                    onChange={(e) => handleInputChange('preferredDate', e.target.value)}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Предпочитано време
                  </label>
                  <select
                    value={formData.preferredTime || 'morning'}
                    onChange={(e) => handleInputChange('preferredTime', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="morning">Сутрин (8:00-12:00)</option>
                    <option value="afternoon">Следобед (12:00-17:00)</option>
                    <option value="evening">Вечер (17:00-20:00)</option>
                    <option value="flexible">Гъвкаво време</option>
                  </select>
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Приоритет
                </label>
                <select
                  value={formData.priority || 'normal'}
                  onChange={(e) => handleInputChange('priority', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Нисък</option>
                  <option value="normal">Нормален</option>
                  <option value="urgent">Спешен</option>
                </select>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Адрес <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.address || ''}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Въведете адреса, където да се извърши услугата"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Телефон за контакт <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="Въведете телефонен номер"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Screenshots Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Снимки (опционално)
                </label>
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e.target.files)}
                    className="hidden"
                    id="screenshot-upload"
                  />
                  <label htmlFor="screenshot-upload" className="cursor-pointer">
                    <div className="text-gray-600">
                      <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p>Кликнете или плъзнете снимки тук</p>
                      <p className="text-xs text-gray-500">Максимум 5 снимки, до 5MB всяка</p>
                    </div>
                  </label>
                </div>

                {/* Screenshot Preview */}
                {screenshots.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
                    {screenshots.map((file, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Screenshot ${index + 1}`}
                          className="w-full h-20 object-cover rounded border"
                        />
                        <button
                          type="button"
                          onClick={() => removeScreenshot(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Additional Details */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Допълнителни детайли
                </label>
                <textarea
                  value={formData.additionalDetails || ''}
                  onChange={(e) => handleInputChange('additionalDetails', e.target.value)}
                  placeholder="Допълнителна информация, специални изисквания..."
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Assignment Type */}
              {providerId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Тип заявка
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="assignmentType"
                        value="specific"
                        checked={formData.assignmentType === 'specific'}
                        onChange={(e) => handleInputChange('assignmentType', e.target.value)}
                        className="mr-2"
                      />
                      <span>Директно към {providerName}</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="assignmentType"
                        value="open"
                        checked={formData.assignmentType === 'open'}
                        onChange={(e) => handleInputChange('assignmentType', e.target.value)}
                        className="mr-2"
                      />
                      <span>Отворена заявка за всички специалисти</span>
                    </label>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
            >
              Отказ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Изпращане...</span>
                </>
              ) : (
                <span>{mode === 'template' ? 'Изпрати формата' : 'Създай заявка'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}