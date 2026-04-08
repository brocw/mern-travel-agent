import { useState } from 'react';
import PageTitle from '../components/PageTitle';
import LoggedInName from '../components/LoggedInName';
import Map from '../components/Map';
import PlacesList from '../components/PlacesList';
import EventsList from '../components/EventsList';
import TripPlanner from '../components/TripPlanner';
import FlightTickets from '../components/FlightTickets';
import { buildPath } from '../components/Path';
import { storeToken, getAccessToken } from '../tokenStorage';

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
  const [placeFilter, setPlaceFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState<any>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [tripItems, setTripItems] = useState<TripItem[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingTrip, setSavingTrip] = useState(false);

  const userData = localStorage.getItem('user_data');
  const user = userData ? JSON.parse(userData) : null;

  const getToken = () => getAccessToken();

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
      const currentToken = getToken();

      const searchResponse = await fetch(buildPath('api/searchLocation'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          search: searchQuery,
          jwtToken: currentToken,
        }),
      });

      const searchData = await searchResponse.json();

      if (searchData.error) {
        setMessage('Error searching location: ' + searchData.error);
        setLoading(false);
        return;
      }

      setLocation({
        name: searchData.name,
        lat: searchData.lat,
        lng: searchData.lng,
      });

      if (searchData.jwtToken) {
        storeToken({ accessToken: searchData.jwtToken });
      }

      const placesResponse = await fetch(buildPath('api/getPlaces'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: searchData.lat,
          lng: searchData.lng,
          search: searchQuery,
          type: placeFilter,
          jwtToken: searchData.jwtToken || getToken(),
        }),
      });

      const placesData = await placesResponse.json();

      if (!placesData.error) {
        setPlaces(placesData.places || []);
        if (placesData.jwtToken) {
          storeToken({ accessToken: placesData.jwtToken });
        }
      } else {
        console.error('Places API Error:', placesData.error);
      }

      const eventsResponse = await fetch(buildPath('api/getEvents'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: searchQuery,
          startDate,
          endDate,
          jwtToken: placesData.jwtToken || searchData.jwtToken || getToken(),
        }),
      });

      const eventsData = await eventsResponse.json();

      if (!eventsData.error) {
        setEvents(eventsData.events || []);
        if (eventsData.jwtToken) {
          storeToken({ accessToken: eventsData.jwtToken });
        }
      } else {
        console.error('Events API Error:', eventsData.error);
      }

      setMessage(
        `Found ${placesData.places?.length || 0} places and ${eventsData.events?.length || 0} events`
      );
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
    setTripItems((prev) => [...prev, tripItem]);
    setMessage(`Added "${item.name}" to trip`);
  };

  const handleRemoveFromTrip = (index: number) => {
    setTripItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateTrip = async (locationName: string, items: TripItem[]) => {
    setSavingTrip(true);

    try {
      const currentToken = getToken();

      const tripResponse = await fetch(buildPath('api/createTrip'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          location: locationName,
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
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input
              type="text"
              id="locationInput"
              placeholder="Search a city or location (e.g., Orlando, New York)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1 }}
            />

            <select
              value={placeFilter}
              onChange={(e) => setPlaceFilter(e.target.value)}
              style={{ padding: '10px' }}
            >
              <option value="all">All</option>
              <option value="things_to_do">Things to Do</option>
              <option value="restaurant">Restaurants</option>
              <option value="cafe">Cafes</option>
              <option value="park">Parks</option>
              <option value="museum">Museums</option>
              <option value="bar">Bars</option>
            </select>

            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ padding: '10px' }}
            />

            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ padding: '10px' }}
            />

            <button type="submit" className="buttons" disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {message && (
          <p
            id="searchMessage"
            style={{
              color: message.includes('Error') ? '#d32f2f' : '#333',
              marginTop: '10px',
            }}
          >
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
              <PlacesList
                places={places}
                onAddToTrip={handleAddToTrip}
                loading={loading}
              />
            </div>
          </div>

          <div id="eventsSection">
            <EventsList
              events={events}
              onAddToTrip={handleAddToTrip}
              loading={loading}
            />
          </div>

          <div id="eventsSection">
            <FlightTickets
              defaultOutboundDate={startDate}
              defaultReturnDate={endDate}
            />
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