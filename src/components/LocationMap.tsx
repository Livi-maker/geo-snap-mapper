import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card } from '@/components/ui/card';

// Fix for default markers in Leaflet with React
delete (L.Icon.Default.prototype as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const createNumberedIcon = (number: number, isSelected: boolean = false) => {
  const size = isSelected ? 48 : 30;
  const backgroundColor = isSelected ? '#2563eb' : 'hsl(217 91% 60%)';
  const borderColor = isSelected ? '#fbbf24' : 'white';
  const borderWidth = isSelected ? '4px' : '3px';
  const boxShadow = isSelected
    ? '0 0 14px 4px #fbbf24, 0 2px 8px rgba(0,0,0,0.3)'
    : '0 2px 8px rgba(0,0,0,0.3)';
  const fontSize = isSelected ? '16px' : '12px';

  return L.divIcon({
    className: `numbered-marker ${isSelected ? 'selected' : ''}`,
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: ${backgroundColor};
      border: ${borderWidth} solid ${borderColor};
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: ${fontSize};
      box-shadow: ${boxShadow};
      transition: all 0.3s ease;
      z-index: ${isSelected ? 1000 : 500};
      cursor: pointer;
    ">${number}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
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
  } | null;
  onLocationSelect?: (location: { name: string; lat: number; lng: number }) => void;
}

const LocationMap: React.FC<LocationMapProps> = ({
  latitude,
  longitude,
  locations = [],
  selectedLocation,
  onLocationSelect
}) => {
  // Default center (Rome, Italy) if no coordinates provided
  const defaultCenter: [number, number] = [41.9028, 12.4964];

  // Use selected location coordinates if available, otherwise use provided coordinates, otherwise default
  const center: [number, number] = selectedLocation
    ? [selectedLocation.lat, selectedLocation.lng]
    : latitude && longitude
    ? [latitude, longitude]
    : defaultCenter;

  const zoom = selectedLocation || (latitude && longitude) ? 14 : 6;

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

          {/* Component to fly to selected location */}
          <FlyToSelectedLocation selectedLocation={selectedLocation} />

          {/* Probable locations markers */}
          {locations.map((location, index) => {
            const isSelected = selectedLocation &&
              selectedLocation.lat === location.lat &&
              selectedLocation.lng === location.lng &&
              selectedLocation.name === location.name;

            return (
              <Marker
                key={`${location.name}-${index}`}
                position={[location.lat, location.lng]}
                icon={createNumberedIcon(index + 1, isSelected)}
                eventHandlers={{
                  click: () => onLocationSelect && onLocationSelect(location),
                }}
              />
            );
          })}
        </MapContainer>
      </div>
    </Card>
  );
};

export default LocationMap;