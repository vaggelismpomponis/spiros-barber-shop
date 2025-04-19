'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import type { MapContainerProps, TileLayerProps, MarkerProps } from 'react-leaflet'
import L, { LatLngExpression, Icon as LeafletIcon } from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icons in react-leaflet
const icon: LeafletIcon = L.icon({
  iconUrl: '/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})

interface MapProps {
  position: LatLngExpression
  zoom?: number
}

export default function Map({ position, zoom = 13 }: MapProps) {
  return (
    <MapContainer
      center={position as [number, number]}
      zoom={zoom}
      scrollWheelZoom={false}
      style={{ height: '400px', width: '100%', borderRadius: '0.5rem' }}
      className="leaflet-container"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={position as [number, number]} icon={icon}>
        <Popup>
          Our Barbershop
        </Popup>
      </Marker>
    </MapContainer>
  )
} 