'use client'

import React, { useEffect } from 'react'
import { Header } from '../../components/Header'
import Cal, { getCalApi } from "@calcom/embed-react"

export default function BookingPage() {
  useEffect(() => {
    (async function () {
      const cal = await getCalApi()
      // Configure the Cal.com embed
      cal("ui", {
        styles: { branding: { brandColor: "#000000" } },
      })
    })()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 text-center">Book Your Appointment</h1>
        
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-4 h-[800px]">
          <Cal 
            calLink="spiros-barber-shop"
            style={{width: '100%', height: '100%', border: 'none'}}
            config={{
              theme: 'light',
            }}
          />
        </div>
      </main>
    </div>
  )
} 