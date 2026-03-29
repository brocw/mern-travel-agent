import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";

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
  location: Location;
  places: Place[];
}

const containerStyle = {
  width: "100%",
  height: "600px",
};

const libraries: ("places")[] = ["places"];

const Map = ({ location, places }: MapProps) => {
  return (
    <div style={{ width: "100%", height: "600px" }}>
      <LoadScript
        googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
        libraries={libraries}
      >
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={{ lat: location.lat, lng: location.lng }}
          zoom={12}
        >
          <Marker
            position={{ lat: location.lat, lng: location.lng }}
            title={location.name}
          />

          {places.map((place, index) => (
            <Marker
              key={place.placeId || index}
              position={{ lat: place.lat, lng: place.lng }}
              title={place.name}
            />
          ))}
        </GoogleMap>
      </LoadScript>
    </div>
  );
};

export default Map;