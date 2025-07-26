import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card } from '@/components/ui/card';

/**
 * LocationMap Component
 * 
 * Displays a map with numbered circle markers for probable locations.
 * Features:
 * - Shows only numbered circles as markers (no pin icons)
 * - Selected location has larger, highlighted circle with golden border
 * - Auto-centers (fly-to) map when a location is selected
 * - Handles location selection via click events
 * - selectedLocation prop managed by parent component
 */

delete (L.Icon.Default.prototype as { _getIconUrl?: () => string })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LocationMapProps {
  latitude?: number;
  longitude?: number;
  locations?: Array<{
    name: string;
    lat: number;
    lng: number;
    confidence: number;
  }>;
  selectedLocation?: {
    name: string;
    lat: number;
    lng: number;
    confidence: number;
  };
  onLocationSelect?: (location: { name: string; lat: number; lng: number }) => void;
}

// Cerchio numerato per location NON selezionata
const createProbableLocationIcon = (index: number) => {
  return L.divIcon({
    className: 'location-marker',
    html: `<div style="
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: hsl(217 91% 60%);
      border: 3px solid white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 14px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">${index + 1}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

// Cerchio numerato per location SELEZIONATA (più grande, evidenziato)
const createSelectedLocationIcon = (index: number) => {
  return L.divIcon({
    className: 'selected-location-marker',
    html: `<div style="
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #2563eb;
      border: 4px solid #fbbf24;
      box-shadow: 0 0 14px 4px #fbbf24, 0 2px 8px rgba(0,0,0,0.3);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-weight: bold;
      font-size: 22px;
      transition: all 0.3s;
      z-index:1000;
    ">${index + 1}</div>`,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
};

// Seleziona e centra la mappa sul luogo
const FlyToSelectedLocation: React.FC<{ selectedLocation?: any }> = ({ selectedLocation }) => {
  const map = useMap();
  const prev = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (selectedLocation && (
      !prev.current ||
      prev.current.lat !== selectedLocation.lat ||
      prev.current.lng !== selectedLocation.lng
    )) {
      map.flyTo([selectedLocation.lat, selectedLocation.lng], 15, { duration: 1 });
      prev.current = { lat: selectedLocation.lat, lng: selectedLocation.lng };
    }
  }, [selectedLocation, map]);

  return null;
};

const LocationMap: React.FC<LocationMapProps> = ({
  latitude,
  longitude,
  locations = [],
  selectedLocation,
  onLocationSelect
}) => {
  const center: [number, number] =
    selectedLocation
      ? [selectedLocation.lat, selectedLocation.lng]
      : [latitude || 41.9028, longitude || 12.4964];

  const zoom = selectedLocation ? 15 : latitude && longitude ? 14 : 2;

  return (
    <Card className="overflow-hidden bg-gradient-card border-border/50 shadow-design-md">
      <div className="w-full h-96 rounded-lg" style={{ minHeight: '400px' }}>
        <MapContainer
          center={center}
          zoom={zoom}
          scrollWheelZoom={true}
          className="w-full h-full rounded-lg"
          attributionControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FlyToSelectedLocation selectedLocation={selectedLocation} />

          {/* Marker per posizioni probabili - solo cerchi numerati */}
          {locations.map((location, index) => {
            const isSelected = selectedLocation?.name === location.name;
            return (
              <Marker
                key={`${location.lat}-${location.lng}-${index}`}
                position={[location.lat, location.lng]}
                icon={isSelected
                  ? createSelectedLocationIcon(index)
                  : createProbableLocationIcon(index)
                }
                eventHandlers={{
                  click: () => {
                    onLocationSelect?.(location);
                  },
                }}
              >
                <Popup>
                  <div className="text-sm p-2">
                    <strong>{location.name}</strong><br />
                    <span className="text-green-600">Confidenza: {location.confidence}%</span><br />
                    <small className="text-gray-500">
                      {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                    </small>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </Card>
  );
};

export default LocationMap;