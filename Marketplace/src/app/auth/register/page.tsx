'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import NeighborhoodSelect from '@/components/NeighborhoodSelect'

interface RegistrationData {
  email: string
  password: string
  confirmPassword: string
  firstName: string
  lastName: string
  phoneNumber: string
  userType: 'customer' | 'service_provider'
  // SP specific fields
  companyName?: string
  serviceCategory?: string
  neighborhood?: string
  acceptTerms: boolean
}

const serviceCategories = [
  'Електротехник',
  'Водопроводчик', 
  'Климатик',
  'Строител',
  'Мебелист',
  'Боядисване',
  'Почистване',
  'Градинарство',
  'Автосервиз',
  'Друго'
]

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<RegistrationData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    userType: 'customer',
    companyName: '',
    serviceCategory: '',
    neighborhood: '',
    acceptTerms: false
  })

  const handleInputChange = (field: keyof RegistrationData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validatePassword = (password: string): boolean => {
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)
    const hasMinLength = password.length >= 8
    
    return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar && hasMinLength
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.email || !formData.password || !formData.firstName || !formData.lastName || !formData.phoneNumber) {
      alert('Моля попълнете всички задължителни полета')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      alert('Паролите не съвпадат')
      return
    }

    if (!validatePassword(formData.password)) {
      alert('Паролата трябва да съдържа поне 8 символа, главна буква, малка буква, цифра и специален символ')
      return
    }

    if (formData.userType === 'service_provider' && (!formData.companyName || !formData.serviceCategory)) {
      alert('Моля попълнете всички полета за доставчик на услуги')
      return
    }

    if (!formData.acceptTerms) {
      alert('Трябва да приемете условията за ползване')
      return
    }

    setLoading(true)
    try {
      // Format phone number to Bulgarian format if needed
      let phoneNumber = formData.phoneNumber
      if (!phoneNumber.startsWith('+359')) {
        // Remove leading 0 if present and add +359
        phoneNumber = phoneNumber.startsWith('0') 
          ? '+359' + phoneNumber.substring(1)
          : '+359' + phoneNumber
      }

      const registrationPayload = {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: phoneNumber,
        role: formData.userType === 'service_provider' ? 'tradesperson' : 'customer',
        ...(formData.userType === 'service_provider' && {
          serviceCategory: formData.serviceCategory,
          companyName: formData.companyName
        }),
        gdprConsents: ['essential_service']
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationPayload)
      })

      const result = await response.json()

      if (result.success) {
        // Store auth token
        if (result.data?.tokens?.accessToken) {
          localStorage.setItem('auth_token', result.data.tokens.accessToken)
          localStorage.setItem('user_data', JSON.stringify(result.data.user))
        }
        
        alert('Регистрацията е успешна!')
        router.push('/auth/login?registered=true')
      } else {
        console.error('Registration failed:', result)
        alert(result.error?.message || 'Грешка при регистрация')
      }
    } catch (error) {
      console.error('Registration error:', error)
      alert('Възникна грешка при регистрацията')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Industrial background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-200/20 to-slate-200/20 rounded-lg blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-gradient-to-br from-orange-200/20 to-slate-200/20 rounded-lg blur-3xl"></div>
      </div>
      
      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => router.back()}
            className="flex items-center text-slate-600 hover:text-slate-800 transition-colors"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Назад
          </button>
        </div>
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-r from-blue-600 to-orange-500 flex items-center justify-center shadow-lg">
            <span className="text-3xl">🔧</span>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Създайте акаунт
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Или{' '}
          <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-800 transition-colors">
            влезте в съществуващ акаунт
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* User Type Selection */}
            <div>
              <label className="text-base font-medium text-gray-900">
                Тип акаунт
              </label>
              <div className="mt-4 space-y-4">
                <div className="flex items-center">
                  <input
                    id="customer"
                    name="userType"
                    type="radio"
                    checked={formData.userType === 'customer'}
                    onChange={() => handleInputChange('userType', 'customer')}
                    className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                  />
                  <label htmlFor="customer" className="ml-3 block text-sm font-medium text-gray-700">
                    Клиент - търся услуги
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="service_provider"
                    name="userType"
                    type="radio"
                    checked={formData.userType === 'service_provider'}
                    onChange={() => handleInputChange('userType', 'service_provider')}
                    className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                  />
                  <label htmlFor="service_provider" className="ml-3 block text-sm font-medium text-gray-700">
                    Доставчик на услуги - предлагам услуги
                  </label>
                </div>
              </div>
            </div>

            {/* Personal Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  Име *
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Иван"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Фамилия *
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Петров"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Имейл адрес *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="ivan@example.com"
              />
            </div>

            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                Телефон *
              </label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                required
                value={formData.phoneNumber}
                onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="+359xxxxxxxxx"
              />
            </div>

            {/* Service Provider specific fields */}
            {formData.userType === 'service_provider' && (
              <>
                <div>
                  <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                    Име на компанията *
                  </label>
                  <input
                    id="companyName"
                    name="companyName"
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => handleInputChange('companyName', e.target.value)}
                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="Вашата компания ООД"
                  />
                </div>

                <div>
                  <label htmlFor="serviceCategory" className="block text-sm font-medium text-gray-700">
                    Категория услуги *
                  </label>
                  <select
                    id="serviceCategory"
                    name="serviceCategory"
                    required
                    value={formData.serviceCategory}
                    onChange={(e) => handleInputChange('serviceCategory', e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="">Изберете категория</option>
                    {serviceCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Neighborhood field for all users */}
            <div>
              <label htmlFor="neighborhood" className="block text-sm font-medium text-gray-700">
                Квартал в София
              </label>
              <select
                id="neighborhood"
                name="neighborhood"
                value={formData.neighborhood}
                onChange={(e) => handleInputChange('neighborhood', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="">Изберете квартал</option>
                <option value="7-и – 11-и километър">7-и – 11-и километър</option>
                <option value="Абдовица">Абдовица</option>
                <option value="Аерогарата">Аерогарата</option>
                <option value="Американски колеж (вилна зона)">Американски колеж (вилна зона)</option>
                <option value="БАН IV километър">БАН IV километър</option>
                <option value="Банишора">Банишора</option>
                <option value="Барите">Барите</option>
                <option value="Батареята">Батареята</option>
                <option value="Белите брези (квартал)">Белите брези (квартал)</option>
                <option value="Бенковски (квартал)">Бенковски (квартал)</option>
                <option value="Борово (квартал)">Борово (квартал)</option>
                <option value="Ботунец">Ботунец</option>
                <option value="Ботунец 1">Ботунец 1</option>
                <option value="Ботунец 2">Ботунец 2</option>
                <option value="Бояна (квартал на София)">Бояна (квартал на София)</option>
                <option value="Бункера">Бункера</option>
                <option value="Бъкстон">Бъкстон</option>
                <option value="Васил Левски (квартал на София)">Васил Левски (квартал на София)</option>
                <option value="Витоша (квартал)">Витоша (квартал)</option>
                <option value="Воденицата">Воденицата</option>
                <option value="Военна рампа">Военна рампа</option>
                <option value="Враждебна">Враждебна</option>
                <option value="Връбница-1">Връбница-1</option>
                <option value="Връбница-2">Връбница-2</option>
                <option value="Гевгелийски квартал">Гевгелийски квартал</option>
                <option value="Гео Милев (квартал)">Гео Милев (квартал)</option>
                <option value="Горна баня">Горна баня</option>
                <option value="Горна баня (вилна зона)">Горна баня (вилна зона)</option>
                <option value="Горубляне">Горубляне</option>
                <option value="Гоце Делчев (квартал)">Гоце Делчев (квартал)</option>
                <option value="Градина (квартал)">Градина (квартал)</option>
                <option value="Група-Зоопарк">Група-Зоопарк</option>
                <option value="Гърдова глава">Гърдова глава</option>
                <option value="Дианабад">Дианабад</option>
                <option value="Дианабад (промишлена зона)">Дианабад (промишлена зона)</option>
                <option value="Димитър Миленков (квартал)">Димитър Миленков (квартал)</option>
                <option value="Долни Смърдан">Долни Смърдан</option>
                <option value="Драгалевци">Драгалевци</option>
                <option value="Дружба (квартал на София)">Дружба (квартал на София)</option>
                <option value="Друмо">Друмо</option>
                <option value="Дървеница">Дървеница</option>
                <option value="Експериментален">Експериментален</option>
                <option value="Западен парк (квартал)">Западен парк (квартал)</option>
                <option value="Захарна фабрика">Захарна фабрика</option>
                <option value="Зона Б-18">Зона Б-18</option>
                <option value="Зона Б-19">Зона Б-19</option>
                <option value="Зона Б-5">Зона Б-5</option>
                <option value="Зона Б-5-3">Зона Б-5-3</option>
                <option value="Иван Вазов">Иван Вазов</option>
                <option value="Изгрев">Изгрев</option>
                <option value="Изток">Изток</option>
                <option value="Илинден">Илинден</option>
                <option value="Илиянци">Илиянци</option>
                <option value="Искър">Искър</option>
                <option value="Канала">Канала</option>
                <option value="Карпузица">Карпузица</option>
                <option value="Килиите">Килиите</option>
                <option value="Киноцентъра">Киноцентъра</option>
                <option value="Княжево">Княжево</option>
                <option value="Красна поляна 1">Красна поляна 1</option>
                <option value="Красна поляна 2">Красна поляна 2</option>
                <option value="Красна поляна 3">Красна поляна 3</option>
                <option value="Красно село">Красно село</option>
                <option value="Кремиковци">Кремиковци</option>
                <option value="Крива река">Крива река</option>
                <option value="Кръстова вада">Кръстова вада</option>
                <option value="Лагера">Лагера</option>
                <option value="Лев Толстой (жилищен комплекс)">Лев Толстой (жилищен комплекс)</option>
                <option value="Левски В">Левски В</option>
                <option value="Левски Г">Левски Г</option>
                <option value="Лозенец (квартал на София)">Лозенец (квартал на София)</option>
                <option value="Люлин (вилна зона)">Люлин (вилна зона)</option>
                <option value="Люлин (квартал)">Люлин (квартал)</option>
                <option value="Мала кория">Мала кория</option>
                <option value="Малинова долина">Малинова долина</option>
                <option value="Малинова долина (жилищен комплекс)">Малинова долина (жилищен комплекс)</option>
                <option value="Манастирски ливади">Манастирски ливади</option>
                <option value="Манастирски ливади (жилищен комплекс)">Манастирски ливади (жилищен комплекс)</option>
                <option value="Манастирски ливади - Б">Манастирски ливади - Б</option>
                <option value="Младост 1">Младост 1</option>
                <option value="Младост 1А">Младост 1А</option>
                <option value="Младост 2">Младост 2</option>
                <option value="Младост 3">Младост 3</option>
                <option value="Младост 4">Младост 4</option>
                <option value="Могилата (вилна зона)">Могилата (вилна зона)</option>
                <option value="Модерно предградие">Модерно предградие</option>
                <option value="Модерно предградие (промишлена зона)">Модерно предградие (промишлена зона)</option>
                <option value="Надежда I">Надежда I</option>
                <option value="Надежда II">Надежда II</option>
                <option value="Надежда III">Надежда III</option>
                <option value="Надежда IV">Надежда IV</option>
                <option value="Национален киноцентър">Национален киноцентър</option>
                <option value="Нова махала – Враждебна">Нова махала – Враждебна</option>
                <option value="Нови силози">Нови силози</option>
                <option value="Обеля">Обеля</option>
                <option value="Обеля 1">Обеля 1</option>
                <option value="Обеля 2">Обеля 2</option>
                <option value="Овча купел">Овча купел</option>
                <option value="Овча купел (жилищен комплекс)">Овча купел (жилищен комплекс)</option>
                <option value="Орландовци">Орландовци</option>
                <option value="Парк Бакърени гробища">Парк Бакърени гробища</option>
                <option value="Подлозище">Подлозище</option>
                <option value="Подуяне">Подуяне</option>
                <option value="Полигона (квартал)">Полигона (квартал)</option>
                <option value="Равнище (квартал)">Равнище (квартал)</option>
                <option value="Разсадник-Коньовица">Разсадник-Коньовица</option>
                <option value="Резиденция Бояна (квартал)">Резиденция Бояна (квартал)</option>
                <option value="Република (квартал)">Република (квартал)</option>
                <option value="Република-2">Република-2</option>
                <option value="Света Троица (квартал)">Света Троица (квартал)</option>
                <option value="Свобода (квартал)">Свобода (квартал)</option>
                <option value="Секулица (квартал)">Секулица (квартал)</option>
                <option value="Сердика (жилищен комплекс)">Сердика (жилищен комплекс)</option>
                <option value="Сеславци">Сеславци</option>
                <option value="Симеоново">Симеоново</option>
                <option value="Славия (квартал)">Славия (квартал)</option>
                <option value="Слатина (промишлена зона)">Слатина (промишлена зона)</option>
                <option value="Смърдана">Смърдана</option>
                <option value="Средец (промишлена зона)">Средец (промишлена зона)</option>
                <option value="Стрелбище (квартал)">Стрелбище (квартал)</option>
                <option value="Студентски град">Студентски град</option>
                <option value="Сухата река">Сухата река</option>
                <option value="Суходол (квартал)">Суходол (квартал)</option>
                <option value="Толева махала">Толева махала</option>
                <option value="Требич">Требич</option>
                <option value="Триъгълника-Надежда">Триъгълника-Надежда</option>
                <option value="Трънска махала">Трънска махала</option>
                <option value="Факултета">Факултета</option>
                <option value="Филиповци (жилищен комплекс)">Филиповци (жилищен комплекс)</option>
                <option value="Филиповци (квартал)">Филиповци (квартал)</option>
                <option value="Фондови жилища">Фондови жилища</option>
                <option value="Фохар">Фохар</option>
                <option value="Хаджи Димитър (жилищен комплекс)">Хаджи Димитър (жилищен комплекс)</option>
                <option value="Хаджи Димитър (промишлена зона)">Хаджи Димитър (промишлена зона)</option>
                <option value="Хиподрума">Хиподрума</option>
                <option value="Хладилника">Хладилника</option>
                <option value="Хладилника (промишлена зона)">Хладилника (промишлена зона)</option>
                <option value="Христо Ботев (квартал на София)">Христо Ботев (квартал на София)</option>
                <option value="Христо Смирненски (жилищен комплекс)">Христо Смирненски (жилищен комплекс)</option>
                <option value="Център на София">Център на София</option>
                <option value="Челопечене">Челопечене</option>
                <option value="Чепинско шосе">Чепинско шосе</option>
                <option value="Черния кос">Черния кос</option>
                <option value="Черно конче">Черно конче</option>
                <option value="Южен парк (квартал)">Южен парк (квартал)</option>
                <option value="Яворов (жилищен комплекс)">Яворов (жилищен комплекс)</option>
                <option value="Япаджа">Япаджа</option>
              </select>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Парола *
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="••••••••"
              />
              <p className="mt-1 text-xs text-gray-500">
                Поне 8 символа, главна буква, малка буква, цифра и специален символ
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Потвърдете паролата *
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="••••••••"
              />
            </div>

            <div className="flex items-center">
              <input
                id="acceptTerms"
                name="acceptTerms"
                type="checkbox"
                checked={formData.acceptTerms}
                onChange={(e) => handleInputChange('acceptTerms', e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="acceptTerms" className="ml-2 block text-sm text-gray-900">
                Съгласявам се с{' '}
                <a href="#" className="text-indigo-600 hover:text-indigo-500">
                  условията за ползване
                </a>
              </label>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Създаване...' : 'Създайте акаунт'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
