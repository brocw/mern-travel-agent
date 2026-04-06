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

interface PlacesListProps {
  places: Place[];
  onAddToTrip: (place: Place) => void;
  loading?: boolean;
}

const PlacesList = ({ places, onAddToTrip, loading }: PlacesListProps) => {
  const fallbackImage = 'https://via.placeholder.com/300x200?text=No+Image';

  return (
    <div id="placesListContainer">
      <h3>Things To Do</h3>
      {loading && <p>Loading places...</p>}
      {!loading && places.length === 0 && <p>No places found. Search for a location first.</p>}
      <div id="placesList" className="scrollable-list">
        {places.map((place, index) => (
          <div key={index} className="card-item">
            <img
              src={place.image || fallbackImage}
              alt={place.name}
              className="place-image"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = fallbackImage;
              }}
            />
            <h4>{place.name}</h4>
            <p><strong>Address:</strong> {place.address}</p>
            {place.rating && <p><strong>Rating:</strong> ⭐ {place.rating}</p>}
            <p><strong>Type:</strong> {place.type.replace(/_/g, ' ')}</p>
            <button
              className="buttons add-btn"
              onClick={() => onAddToTrip(place)}
            >
              Add to Trip
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlacesList;
