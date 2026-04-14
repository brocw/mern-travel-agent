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
  if (loading) return (
    <div className="tt-list-loading">
      <div className="tt-list-spinner" />
      <p>Finding the best spots...</p>
    </div>
  );

  if (places.length === 0) return (
    <div className="tt-list-empty">
      <span className="tt-list-empty-icon">📍</span>
      <p>No places found. Try a different location or filter.</p>
    </div>
  );

  return (
    <div className="tt-results-grid">
      {places.map((place, index) => (
        <div key={index} className="tt-result-card">
          <div className="tt-result-card-img-wrap">
            <img
              src={place.image || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&q=80'}
              alt={place.name}
              className="tt-result-card-img"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&q=80'; }}
            />
            {place.rating && (
              <div className="tt-result-card-rating">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="#FFD580" stroke="#FFD580" strokeWidth="1">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                {place.rating}
              </div>
            )}
          </div>
          <div className="tt-result-card-body">
            <div className="tt-result-card-type">{place.type.replace(/_/g, ' ')}</div>
            <h4 className="tt-result-card-name">{place.name}</h4>
            <p className="tt-result-card-meta">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              {place.address}
            </p>
            <button className="tt-result-card-btn" onClick={() => onAddToTrip(place)}>+ Add to Trip</button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PlacesList;