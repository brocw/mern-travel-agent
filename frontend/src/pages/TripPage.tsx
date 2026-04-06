import { useState, useEffect } from 'react';
import PageTitle from '../components/PageTitle';
import LoggedInName from '../components/LoggedInName';
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

  // Get user data - token will be retrieved fresh before each API call
  const userData = localStorage.getItem('user_data');
  const user = userData ? JSON.parse(userData) : null;

  // Always send the raw JWT string, not the serialized token object.
  const getToken = () => getAccessToken();

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    setLoading(true);
    try {
      const response = await fetch(buildPath('api/getTrips'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          jwtToken: getToken(),
        }),
      });

      const data = await response.json();

      if (data.error) {
        setMessage(data.error);
      } else {
        setTrips(data.trips);
        if (data.jwtToken) {
          storeToken({ accessToken: data.jwtToken });
        }
      }
    } catch (error: any) {
      setMessage(error.message || 'Error loading trips');
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
        body: JSON.stringify({
          userId: user?.id,
          tripId: tripId,
          jwtToken: getToken(),
        }),
      });

      const data = await response.json();

      if (data.error) {
        setMessage(data.error);
      } else {
        setTrips(trips.filter((trip) => trip._id !== tripId));
        setMessage('Trip deleted successfully');
        setTimeout(() => setMessage(''), 3000);
        if (data.jwtToken) {
          storeToken({ accessToken: data.jwtToken });
        }
      }
    } catch (error: any) {
      setMessage(error.message || 'Error deleting trip');
    }
  };

  const handleRemoveItem = async (tripId: string, itemIndex: number) => {
    try {
      const response = await fetch(buildPath('api/removeFromTrip'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          tripId: tripId,
          itemIndex: itemIndex,
          jwtToken: getToken(),
        }),
      });

      const data = await response.json();

      if (data.error) {
        setMessage(data.error);
      } else {
        // Update local state
        const updatedTrips = trips.map((trip) => {
          if (trip._id === tripId) {
            return {
              ...trip,
              Items: trip.Items.filter((_, i) => i !== itemIndex),
            };
          }
          return trip;
        });
        setTrips(updatedTrips);
        setMessage('Item removed from trip');
        setTimeout(() => setMessage(''), 3000);
        if (data.jwtToken) {
          storeToken({ accessToken: data.jwtToken });
        }
      }
    } catch (error: any) {
      setMessage(error.message || 'Error removing item');
    }
  };

  return (
    <div>
      <PageTitle />
      <LoggedInName />

      <div id="tripsContainer">
        <h2>My Trips</h2>

        {message && (
          <p id="tripMessage" style={{ color: message.includes('Error') ? '#d32f2f' : '#333', marginBottom: '15px' }}>
            {message}
          </p>
        )}

        {loading ? (
          <p>Loading trips...</p>
        ) : trips.length === 0 ? (
          <p style={{ color: '#666' }}>No trips created yet. Search for a location and create a trip to get started!</p>
        ) : (
          <div id="tripsList">
            {trips.map((trip) => (
              <div key={trip._id} className="trip-card">
                <h3>{trip.Location}</h3>
                <p><small>Created: {new Date(trip.CreatedAt).toLocaleDateString()}</small></p>

                <h4>Itinerary ({trip.Items.length} items)</h4>
                {trip.Items.length === 0 ? (
                  <p style={{ color: '#999' }}>No items in this trip</p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {trip.Items.map((item, index) => (
                      <li key={index} style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #eee' }}>
                        <div>
                          <strong>[{item.type.toUpperCase()}]</strong> {item.data.name || item.data}
                          {item.data.address && (
                            <p style={{ fontSize: '0.9em', color: '#666', margin: '5px 0 0 0' }}>
                              📍 {item.data.address}
                            </p>
                          )}
                          {item.data.date && (
                            <p style={{ fontSize: '0.9em', color: '#666', margin: '5px 0 0 0' }}>
                              📅 {item.data.date}
                            </p>
                          )}
                          {item.data.venue && (
                            <p style={{ fontSize: '0.9em', color: '#666', margin: '5px 0 0 0' }}>
                              🎤 {item.data.venue}
                            </p>
                          )}
                        </div>
                        <button
                          className="buttons remove-btn"
                          onClick={() => handleRemoveItem(trip._id, index)}
                          style={{ marginTop: '8px' }}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <button
                  className="buttons delete-btn"
                  onClick={() => handleDeleteTrip(trip._id)}
                  style={{ marginTop: '15px', width: '100%', background: '#d32f2f', color: 'white' }}
                >
                  Delete Trip
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
