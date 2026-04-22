import { useState, useEffect } from 'react';
import { buildPath } from '../components/Path';
import { getAccessToken, storeToken } from '../tokenStorage';

interface TripItem {
  type: 'place' | 'event';
  data: any;
}

interface Trip {
  _id: string;
  Location: string;
  Items: TripItem[];
  CreatedAt: string;
}

const TripPage = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [expandedTrip, setExpandedTrip] = useState<string | null>(null);

  const userData = localStorage.getItem('user_data');
  const user = userData ? JSON.parse(userData) : null;
  const getToken = () => getAccessToken();

  useEffect(() => { loadTrips(); }, []);

  const showMessage = (msg: string, type: 'success' | 'error') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3000);
  };

  const loadTrips = async () => {
    setLoading(true);
    try {
      const response = await fetch(buildPath('api/getTrips'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, jwtToken: getToken() }),
      });
      const data = await response.json();
      if (data.error) {
        showMessage(data.error, 'error');
      } else {
        setTrips(data.trips);
        if (data.jwtToken) storeToken({ accessToken: data.jwtToken });
      }
    } catch (error: any) {
      showMessage(error.message || 'Error loading trips', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    if (!window.confirm('Are you sure you want to delete this trip?')) return;
    try {
      const response = await fetch(buildPath('api/deleteTrip'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, tripId, jwtToken: getToken() }),
      });
      const data = await response.json();
      if (data.error) {
        showMessage(data.error, 'error');
      } else {
        setTrips(trips.filter((t) => t._id !== tripId));
        showMessage('Trip deleted', 'success');
        if (data.jwtToken) storeToken({ accessToken: data.jwtToken });
      }
    } catch (error: any) {
      showMessage(error.message || 'Error deleting trip', 'error');
    }
  };

  const handleRemoveItem = async (tripId: string, itemIndex: number) => {
    try {
      const response = await fetch(buildPath('api/removeFromTrip'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, tripId, itemIndex, jwtToken: getToken() }),
      });
      const data = await response.json();
      if (data.error) {
        showMessage(data.error, 'error');
      } else {
        setTrips(trips.map((trip) =>
          trip._id === tripId
            ? { ...trip, Items: trip.Items.filter((_, i) => i !== itemIndex) }
            : trip
        ));
        showMessage('Item removed', 'success');
        if (data.jwtToken) storeToken({ accessToken: data.jwtToken });
      }
    } catch (error: any) {
      showMessage(error.message || 'Error removing item', 'error');
    }
  };

  const doLogout = () => {
    localStorage.removeItem('user_data');
    localStorage.removeItem('token_data');
    window.location.href = '/';
  };

  const typeIcon = (type: string, dataType?: string) => {
    if (dataType === 'flight') return '✈️';
    if (dataType === 'hotel') return '🏨';
    return type === 'place' ? '📍' : '🎟️';
  };
  const typeLabel = (type: string, dataType?: string) => {
    if (dataType === 'flight') return 'Flight';
    if (dataType === 'hotel') return 'Hotel';
    return type === 'place' ? 'Place' : 'Event';
  };

  return (
    <div className="tt-trips-page">

      {/* ── Navbar ── */}
      <nav className="tt-trips-nav">
        <div className="tt-trips-nav-inner">
          <a href="/account" className="tt-trips-nav-brand">
            <span style={{ color: 'var(--tt-navy)', fontWeight: 900, fontSize: '1.4rem', letterSpacing: '-0.03em' }}>
              Trip<span style={{ color: 'var(--tt-steel)' }}>tastic!</span>
            </span>
          </a>
          <div className="tt-trips-nav-links">
            <a href="/search" className="tt-trips-nav-link">🔍 Explore</a>
            <a href="/trips" className="tt-trips-nav-link active">🗺️ My Trips</a>
          </div>
          <div className="tt-trips-nav-right">
            <span className="tt-trips-nav-user">
              👤 {user?.firstName} {user?.lastName}
            </span>
            <button className="tt-trips-nav-logout" onClick={doLogout}>
              Log Out
            </button>
          </div>
        </div>
      </nav>

      {/* ── Page content ── */}
      <div className="tt-trips-content">

        {/* Header */}
        <div className="tt-trips-header">
          <div>
            <h1 className="tt-trips-title">My Trips</h1>
            <p className="tt-trips-subtitle">
              {loading ? 'Loading your adventures...' : `${trips.length} trip${trips.length !== 1 ? 's' : ''} planned`}
            </p>
          </div>
          <a href="/search" className="tt-trips-new-btn">
            + Plan New Trip
          </a>
        </div>

        {/* Toast message */}
        {message && (
          <div className={`tt-trips-toast ${messageType === 'error' ? 'tt-trips-toast-error' : 'tt-trips-toast-success'}`}>
            {messageType === 'success' ? '✓' : '⚠'} {message}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="tt-trips-loading">
            <div className="tt-trips-spinner" />
            <p>Loading your trips...</p>
          </div>
        ) : trips.length === 0 ? (
          /* Empty state */
          <div className="tt-trips-empty">
            <div className="tt-trips-empty-icon">🗺️</div>
            <h2>No trips yet</h2>
            <p>Search for a destination and start building your itinerary.</p>
            <a href="/search" className="tt-trips-new-btn">
              Plan Your First Trip
            </a>
          </div>
        ) : (
          /* Trip cards */
          <div className="tt-trips-grid">
            {trips.map((trip) => (
              <div key={trip._id} className="tt-trip-card">

                {/* Card header */}
                <div className="tt-trip-card-header">
                  <div className="tt-trip-card-icon">✈️</div>
                  <div className="tt-trip-card-info">
                    <h3 className="tt-trip-card-title">{trip.Location}</h3>
                    <p className="tt-trip-card-date">
                      Created {new Date(trip.CreatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <span className="tt-trip-card-badge">
                    {trip.Items.length} item{trip.Items.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Divider */}
                <div className="tt-trip-card-divider" />

                {/* Items toggle */}
                <button
                  className="tt-trip-card-toggle"
                  onClick={() => setExpandedTrip(expandedTrip === trip._id ? null : trip._id)}
                >
                  <span>{expandedTrip === trip._id ? 'Hide' : 'Show'} itinerary</span>
                  <span className="tt-trip-toggle-arrow">{expandedTrip === trip._id ? '▲' : '▼'}</span>
                </button>

                {/* Expanded items */}
                {expandedTrip === trip._id && (
                  <div className="tt-trip-items">
                    {trip.Items.length === 0 ? (
                      <p className="tt-trip-items-empty">No items added yet.</p>
                    ) : (
                      trip.Items.map((item, index) => (
                        <div key={index} className="tt-trip-item">
                          <div className="tt-trip-item-icon">{typeIcon(item.type, item.data?.type)}</div>
                          <div className="tt-trip-item-body">
                            <div className="tt-trip-item-type">{typeLabel(item.type, item.data?.type)}</div>
                            <div className="tt-trip-item-name">{item.data.name || item.data}</div>
                            {item.data.address && (
                              <div className="tt-trip-item-detail">📍 {item.data.address}</div>
                            )}
                            {item.data.date && (
                              <div className="tt-trip-item-detail">📅 {item.data.date}</div>
                            )}
                            {item.data.venue && (
                              <div className="tt-trip-item-detail">🎤 {item.data.venue}</div>
                            )}
                          </div>
                          <button
                            className="tt-trip-item-remove"
                            onClick={() => handleRemoveItem(trip._id, index)}
                            title="Remove item"
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
                <a href={`/search?q=${encodeURIComponent(trip.Location)}&tripId=${trip._id}`}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.875rem',
                    background: 'var(--tt-navy)',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    textAlign: 'center',
                    textDecoration: 'none',
                    marginBottom: '0.5rem',
                    transition: 'all 0.2s',
                  }}
                >
                  ✏️ Add More Items
                </a>
                {/* Delete button */}
                <button
                  className="tt-trip-card-delete"
                  onClick={() => handleDeleteTrip(trip._id)}
                >
                  🗑 Delete Trip
                </button>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TripPage;