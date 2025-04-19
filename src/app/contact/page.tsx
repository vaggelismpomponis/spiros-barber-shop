'use client'

import { useState, useEffect } from 'react'
import { MapPinIcon, PhoneIcon, EnvelopeIcon, ClockIcon } from '@heroicons/react/24/outline'
import dynamic from 'next/dynamic'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { ContactForm } from '../../components/ContactForm'

// Fix for default marker icon in react-leaflet
const icon = L.icon({
  iconUrl: '/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: '/marker-shadow.png',
  shadowSize: [41, 41]
})

// Dynamically import Map component to avoid SSR issues
const MapComponent = dynamic(() => import('./map').then(mod => mod.Map), {
  ssr: false
})

const barbershopCoordinates: [number, number] = [39.6363, 22.4184]

export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 text-center">Contact Us</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Get in Touch</h2>
          <div className="space-y-4 mb-6">
            <div>
              <h3 className="font-semibold">Address</h3>
              <p>Κοραή 17, Λάρισα 412 23</p>
            </div>
            <div>
              <h3 className="font-semibold">Phone</h3>
              <p>+30 2410 123 456</p>
            </div>
            <div>
              <h3 className="font-semibold">Hours</h3>
              <p>Monday - Saturday: 9:00 AM - 9:00 PM</p>
              <p>Sunday: Closed</p>
            </div>
          </div>
          <div className="h-[300px] rounded-lg overflow-hidden">
            <MapComponent position={barbershopCoordinates} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Send us a Message</h2>
          <ContactForm />
        </div>
      </div>
    </div>
  )
} 