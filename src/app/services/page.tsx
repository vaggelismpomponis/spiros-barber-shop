'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Service {
  id: number
  name: string
  description: string
  duration: string
  price: number
  category: 'haircut' | 'beard' | 'combo'
}

const services: Service[] = [
  {
    id: 1,
    name: 'Classic Haircut',
    description: 'Traditional haircut with clippers and scissors, includes hot towel and styling',
    duration: '30 min',
    price: 25,
    category: 'haircut'
  },
  {
    id: 2,
    name: 'Beard Trim',
    description: 'Professional beard trimming and shaping with hot towel treatment',
    duration: '20 min',
    price: 15,
    category: 'beard'
  },
  {
    id: 3,
    name: 'Haircut & Beard Combo',
    description: 'Complete grooming package with haircut and beard trim',
    duration: '45 min',
    price: 35,
    category: 'combo'
  },
  {
    id: 4,
    name: 'Premium Fade',
    description: 'Precision fade haircut with detailed line-up and styling',
    duration: '45 min',
    price: 30,
    category: 'haircut'
  },
  {
    id: 5,
    name: 'Royal Shave',
    description: 'Traditional straight razor shave with hot towel and facial massage',
    duration: '30 min',
    price: 25,
    category: 'beard'
  },
  {
    id: 6,
    name: 'VIP Package',
    description: 'Premium haircut, beard trim, facial treatment, and head massage',
    duration: '60 min',
    price: 50,
    category: 'combo'
  }
]

export default function ServicesPage() {
  const [selectedCategory, setSelectedCategory] = useState<'all' | Service['category']>('all')

  const filteredServices = selectedCategory === 'all' 
    ? services 
    : services.filter(service => service.category === selectedCategory)

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Οι Υπηρεσίες μας
          </h1>
        </div>

        {/* Category Filter */}
        <div className="mt-8 flex flex-col xs:flex-row justify-center gap-2 xs:gap-4 w-full max-w-2xl mx-auto">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium w-full xs:w-auto ${
              selectedCategory === 'all'
                ? 'bg-[#1A1A1A] text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Όλες οι Υπηρεσίες μας 
          </button>
          <button
            onClick={() => setSelectedCategory('haircut')}
            className={`px-4 py-2 rounded-md text-sm font-medium w-full xs:w-auto ${
              selectedCategory === 'haircut'
                ? 'bg-[#1A1A1A] text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Κουρέματα
          </button>
          <button
            onClick={() => setSelectedCategory('beard')}
            className={`px-4 py-2 rounded-md text-sm font-medium w-full xs:w-auto ${
              selectedCategory === 'beard'
                ? 'bg-[#1A1A1A] text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Μούσι
          </button>
          <button
            onClick={() => setSelectedCategory('combo')}
            className={`px-4 py-2 rounded-md text-sm font-medium w-full xs:w-auto ${
              selectedCategory === 'combo'
                ? 'bg-[#1A1A1A] text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Combos
          </button>
        </div>

        {/* Services Grid */}
        <div className="mt-12 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredServices.map((service) => (
            <div
              key={service.id}
              className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full"
            >
              <div className="p-6 flex flex-col h-full">
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 break-words">
                      {service.name}
                    </h3>
                    <p className="mt-2 text-sm text-gray-500">
                      {service.description}
                    </p>
                  </div>
                  <span className="text-2xl font-bold text-gray-900 mt-2 sm:mt-0 sm:ml-4">
                    ${service.price}
                  </span>
                </div>
                <div className="mt-4 flex flex-col gap-2 xs:flex-row xs:justify-between xs:items-center">
                  <span className="text-sm text-gray-500">
                    Duration: {service.duration}
                  </span>
                  <Link
                    href="/bookings"
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#1A1A1A] hover:bg-gray-800 w-full xs:w-auto"
                  >
                    Κλείσε Ραντεβού
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 