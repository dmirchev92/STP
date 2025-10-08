'use client'

import { Hero } from '@/components/Hero'
import { ServiceCategories } from '@/components/ServiceCategories'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import PendingSurveys from '@/components/PendingSurveys'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
      <Header />
      
      <main>
        <Hero />
        
        {/* Pending Surveys for authenticated customers */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <PendingSurveys />
        </div>
        
        <ServiceCategories />
      </main>
      
      <Footer />
    </div>
  )
}

