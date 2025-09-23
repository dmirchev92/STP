import { Hero } from '@/components/Hero'
import { SearchSection } from '@/components/SearchSection'
import { ServiceCategories } from '@/components/ServiceCategories'
import { HowItWorks } from '@/components/HowItWorks'
import { Testimonials } from '@/components/Testimonials'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main>
        <Hero />
        <SearchSection />
        <ServiceCategories />
        <HowItWorks />
        <Testimonials />
      </main>
      
      <Footer />
    </div>
  )
}

