import { useEffect, useRef } from 'react';

interface Place {
  name: string;
  address: string;
  rating?: number;
  type: string;
  lat: number;
  lng: number;
  placeId: string;
  image?: string;
}

interface Location {
  name: string;
  lat: number;
  lng: number;
}

interface MapProps {
  location: Location | null;
  places: Place[];
}

declare global {
  interface Window {
    google: any;
  }
}

const Map = ({ location, places }: MapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    console.log('Map component mounted/updated. Location:', location, 'mapRef current:', mapRef.current);

    // Load Google Maps API script
    if (!window.google) {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      console.log('API Key from env:', apiKey ? `Found: ${apiKey.substring(0, 5)}...` : 'NOT FOUND');

      if (!apiKey) {
        console.warn('Google Maps API key not found. Map will display placeholder.');
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (location) {
          initializeMap();
        }
      };
      script.onerror = () => {
        console.error('Failed to load Google Maps API script');
      };
      document.head.appendChild(script);
    } else if (location && !mapInstanceRef.current) {
      initializeMap();
    }
  }, [location]);

  useEffect(() => {
    if (location && mapInstanceRef.current && window.google) {
      updateMap();
    }
  }, [location, places]);

  const initializeMap = () => {
    if (!mapRef.current || !location || !window.google) return;

    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      zoom: 13,
      center: { lat: location.lat, lng: location.lng },
      mapTypeControl: true,
      streetViewControl: false,
    });

    // Add main location marker
    new window.google.maps.Marker({
      position: { lat: location.lat, lng: location.lng },
      map: mapInstanceRef.current,
      title: location.name,
      icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
    });

    // Add place markers
    places.forEach((place) => {
      const marker = new window.google.maps.Marker({
        position: { lat: place.lat, lng: place.lng },
        map: mapInstanceRef.current,
        title: place.name,
      });
      markersRef.current.push(marker);
    });
  };

  const updateMap = () => {
    if (!mapInstanceRef.current || !location || !window.google) return;

    // Clear old place markers
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    // Update map center
    mapInstanceRef.current.setCenter({ lat: location.lat, lng: location.lng });

    // Add new place markers
    places.forEach((place) => {
      const marker = new window.google.maps.Marker({
        position: { lat: place.lat, lng: place.lng },
        map: mapInstanceRef.current,
        title: place.name,
      });
      markersRef.current.push(marker);
    });
  };

  if (!location) {
    return (
      <div
        id="mapContainer"
        style={{
          width: '100%',
          height: '400px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f0f0f0',
        }}
      >
        <p style={{ color: '#666', textAlign: 'center' }}>
          Search for a location to display map
        </p>
      </div>
    );
  }

  return (
    <div
      id="mapContainer"
      ref={mapRef}
      style={{
        width: '100%',
        height: '400px',
        border: '1px solid #ccc',
        borderRadius: '4px',
      }}
    />
  );
};

export default Map;