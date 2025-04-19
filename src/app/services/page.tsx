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
            Our Services
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-gray-500 sm:mt-4">
            Professional haircuts and grooming services for the modern gentleman
          </p>
        </div>

        {/* Category Filter */}
        <div className="mt-8 flex justify-center space-x-4">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              selectedCategory === 'all'
                ? 'bg-black text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            All Services
          </button>
          <button
            onClick={() => setSelectedCategory('haircut')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              selectedCategory === 'haircut'
                ? 'bg-black text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Haircuts
          </button>
          <button
            onClick={() => setSelectedCategory('beard')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              selectedCategory === 'beard'
                ? 'bg-black text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Beard
          </button>
          <button
            onClick={() => setSelectedCategory('combo')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              selectedCategory === 'combo'
                ? 'bg-black text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Combos
          </button>
        </div>

        {/* Services Grid */}
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {filteredServices.map((service) => (
            <div
              key={service.id}
              className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {service.name}
                    </h3>
                    <p className="mt-2 text-sm text-gray-500">
                      {service.description}
                    </p>
                  </div>
                  <span className="text-2xl font-bold text-gray-900">
                    ${service.price}
                  </span>
                </div>
                <div className="mt-4 flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    Duration: {service.duration}
                  </span>
                  <Link
                    href="/bookings"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800"
                  >
                    Book Now
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