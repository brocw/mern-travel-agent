import { useState, useEffect } from 'react';
import PageTitle from '../components/PageTitle';
import LoggedInName from '../components/LoggedInName';
import Map from '../components/Map';
import PlacesList from '../components/PlacesList';
import EventsList from '../components/EventsList';
import TripPlanner from '../components/TripPlanner';
import { buildPath } from '../components/Path';
import { storeToken } from '../tokenStorage';

interface Place {
  name: string;
  address: string;
  rating?: number;
  type: string;
  lat: number;
  lng: number;
  placeId: string;
}

interface Event {
  name: string;
  date?: string;
  venue: string;
  ticketUrl: string;
  image?: string;
}

interface TripItem {
  type: 'place' | 'event';
  data: any;
}

const SearchPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState<any>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [tripItems, setTripItems] = useState<TripItem[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingTrip, setSavingTrip] = useState(false);

  // Get user data - token will be retrieved fresh before each API call
  const userData = localStorage.getItem('user_data');
  const user = userData ? JSON.parse(userData) : null;

  // Helper function to get the current token from localStorage (not a stale closure variable)
  const getToken = () => localStorage.getItem('token_data');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setMessage('Please enter a location');
      return;
    }

    setLoading(true);
    setMessage('');
    setPlaces([]);
    setEvents([]);
    setTripItems([]);

    try {
      console.log('Searching for location:', searchQuery);
      const currentToken = getToken();
      console.log('Token:', currentToken ? `${currentToken.substring(0, 20)}...` : 'No token');

      // Call searchLocation endpoint
      const searchResponse = await fetch(buildPath('api/searchLocation'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          search: searchQuery,
          jwtToken: currentToken,
        }),
      });

      const searchData = await searchResponse.json();
      console.log('Search Location Response:', searchData);

      if (searchData.error) {
        setMessage('Error searching location: ' + searchData.error);
        setLoading(false);
        return;
      }

      // Store location and update token
      setLocation({
        name: searchData.name,
        lat: searchData.lat,
        lng: searchData.lng,
      });

      console.log('Location found:', searchData.name, searchData.lat, searchData.lng);

      if (searchData.jwtToken) {
        storeToken({ accessToken: searchData.jwtToken });
      }

      // Fetch places
      console.log('Fetching places...');
      const placesToken = searchData.jwtToken || getToken();
      const placesResponse = await fetch(buildPath('api/getPlaces'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: searchData.lat,
          lng: searchData.lng,
          jwtToken: placesToken,
        }),
      });

      const placesData = await placesResponse.json();
      console.log('Places Response:', placesData);

      if (!placesData.error) {
        setPlaces(placesData.places || []);
        if (placesData.jwtToken) {
          storeToken({ accessToken: placesData.jwtToken });
        }
      } else {
        console.error('Places API Error:', placesData.error);
      }

      // Fetch events
      console.log('Fetching events...');
      const eventsToken = placesData.jwtToken || searchData.jwtToken || getToken();
      const eventsResponse = await fetch(buildPath('api/getEvents'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: searchQuery,
          jwtToken: eventsToken,
        }),
      });

      const eventsData = await eventsResponse.json();
      console.log('Events Response:', eventsData);

      if (!eventsData.error) {
        setEvents(eventsData.events || []);
        if (eventsData.jwtToken) {
          storeToken({ accessToken: eventsData.jwtToken });
        }
      } else {
        console.error('Events API Error:', eventsData.error);
      }

      setMessage(`Found ${placesData.places?.length || 0} places and ${eventsData.events?.length || 0} events`);
    } catch (error: any) {
      console.error('Search error:', error);
      setMessage('Error: ' + (error.message || 'Unknown error occurred'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddToTrip = (item: Place | Event) => {
    const isPlace = 'address' in item;
    const tripItem: TripItem = {
      type: isPlace ? 'place' : 'event',
      data: item,
    };
    setTripItems([...tripItems, tripItem]);
    setMessage(`Added "${item.name}" to trip`);
  };

  const handleRemoveFromTrip = (index: number) => {
    const newItems = tripItems.filter((_, i) => i !== index);
    setTripItems(newItems);
  };

  const handleCreateTrip = async (location: string, items: TripItem[]) => {
    setSavingTrip(true);
    try {
      const currentToken = getToken();

      // Create trip
      const tripResponse = await fetch(buildPath('api/createTrip'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          location: location,
          jwtToken: currentToken,
        }),
      });

      const tripData = await tripResponse.json();

      if (tripData.error) {
        setMessage(tripData.error);
        setSavingTrip(false);
        return;
      }

      if (tripData.jwtToken) {
        storeToken({ accessToken: tripData.jwtToken });
      }

      // Add items to trip
      let currentToken2 = tripData.jwtToken || getToken();
      for (const item of items) {
        const addResponse = await fetch(buildPath('api/addToTrip'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id,
            tripId: tripData.tripId,
            item: item,
            jwtToken: currentToken2,
          }),
        });

        const addData = await addResponse.json();
        if (addData.jwtToken) {
          currentToken2 = addData.jwtToken;
          storeToken({ accessToken: addData.jwtToken });
        }
      }

      setMessage('Trip created successfully!');
      setTripItems([]);
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage(error.message || 'Error creating trip');
    } finally {
      setSavingTrip(false);
    }
  };

  return (
    <div>
      <PageTitle />
      <LoggedInName />

      <div id="searchContainer">
        <form onSubmit={handleSearch}>
          <input
            type="text"
            id="locationInput"
            placeholder="Search a city or location (e.g., Orlando, New York)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="buttons" disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {message && (
          <p id="searchMessage" style={{ color: message.includes('Error') ? '#d32f2f' : '#333', marginTop: '10px' }}>
            {message}
          </p>
        )}
      </div>

      {location && (
        <div id="mainContent">
          <div id="mapAndPlaces">
            <div id="mapSection">
              <Map location={location} places={places} />
            </div>
            <div id="placesSection">
              <PlacesList places={places} onAddToTrip={handleAddToTrip} loading={loading} />
            </div>
          </div>

          <div id="eventsSection">
            <EventsList events={events} onAddToTrip={handleAddToTrip} loading={loading} />
          </div>

          <div id="tripSection">
            <TripPlanner
              location={location.name}
              items={tripItems}
              onRemoveItem={handleRemoveFromTrip}
              onCreateTrip={handleCreateTrip}
              saving={savingTrip}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
