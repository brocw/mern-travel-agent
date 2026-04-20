import { useState, useEffect } from 'react';
import Map from '../components/Map';
import PlacesList from '../components/PlacesList';
import EventsList from '../components/EventsList';
import TripPlanner from '../components/TripPlanner';
import TripWizard from '../components/TripWizard';
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

type Tab = 'places' | 'hotels' | 'events' | 'flights';

const SearchPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [placeFilter, setPlaceFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState<any>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [hotels, setHotels] = useState<Place[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [tripItems, setTripItems] = useState<TripItem[]>([]);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [loading, setLoading] = useState(false);
  const [hotelsLoading, setHotelsLoading] = useState(false);
  const [savingTrip, setSavingTrip] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('places');
  const [showTripPanel, setShowTripPanel] = useState(false);
  const [showWizard, setShowWizard] = useState(true);
  const [pendingFlight, setPendingFlight] = useState<any>(null);
  const [pendingHotel, setPendingHotel] = useState<any>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) {
      setShowWizard(false);
      runSearch(q);
    }
  }, []);

  const userData = localStorage.getItem('user_data');
  const user = userData ? JSON.parse(userData) : null;
  const getToken = () => getAccessToken();

  const doLogout = () => {
    localStorage.removeItem('user_data');
    localStorage.removeItem('token_data');
    window.location.href = '/';
  };

  const runSearch = async (query: string) => {
    if (!query.trim()) return;
    setSearchQuery(query);
    setShowWizard(false);
    setLoading(true);
    setMessage('');
    setPlaces([]);
    setHotels([]);
    setEvents([]);
    setTripItems([]);
    setLocation(null);

    try {
      const currentToken = getToken();
      const searchResponse = await fetch(buildPath('api/searchLocation'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ search: query, jwtToken: currentToken }),
      });
      const searchData = await searchResponse.json();
      if (searchData.error) {
        setMessage('Error: ' + searchData.error);
        setMessageType('error');
        setLoading(false);
        return;
      }
      setLocation({ name: searchData.name, lat: searchData.lat, lng: searchData.lng });
      if (searchData.jwtToken) storeToken({ accessToken: searchData.jwtToken });

      const placesResponse = await fetch(buildPath('api/getPlaces'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: searchData.lat, lng: searchData.lng,
          search: query, type: placeFilter,
          jwtToken: searchData.jwtToken || getToken(),
        }),
      });
      const placesData = await placesResponse.json();
      if (!placesData.error) {
        setPlaces(placesData.places || []);
        if (placesData.jwtToken) storeToken({ accessToken: placesData.jwtToken });
      }

      const eventsResponse = await fetch(buildPath('api/getEvents'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: query, startDate, endDate,
          jwtToken: placesData.jwtToken || searchData.jwtToken || getToken(),
        }),
      });
      const eventsData = await eventsResponse.json();
      if (!eventsData.error) {
        setEvents(eventsData.events || []);
        if (eventsData.jwtToken) storeToken({ accessToken: eventsData.jwtToken });
      }

      setHotelsLoading(true);
      const hotelsResponse = await fetch(buildPath('api/getPlaces'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: searchData.lat, lng: searchData.lng,
          search: query, type: 'lodging',
          jwtToken: eventsData.jwtToken || placesData.jwtToken || searchData.jwtToken || getToken(),
        }),
      });
      const hotelsData = await hotelsResponse.json();
      if (!hotelsData.error) {
        setHotels(hotelsData.places || []);
        if (hotelsData.jwtToken) storeToken({ accessToken: hotelsData.jwtToken });
      }
      setHotelsLoading(false);

      setMessage(`Found ${placesData.places?.length || 0} places · ${eventsData.events?.length || 0} events · ${hotelsData.places?.length || 0} hotels`);
      setMessageType('success');
    } catch (error: any) {
      setMessage('Error: ' + (error.message || 'Unknown error'));
      setMessageType('error');
    } finally {
      setLoading(false);
      setHotelsLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await runSearch(searchQuery);
  };

  const handleAddToTrip = (item: Place | Event) => {
    const isPlace = 'address' in item;
    // If it's a lodging/hotel, send to hotel slot
    if (isPlace && (item as Place).type === 'lodging') {
      setPendingHotel({ name: (item as Place).name, address: (item as Place).address });
      setMessage(`Added "${item.name}" to Where You're Staying`);
      setMessageType('success');
      setShowTripPanel(true);
      return;
    }
    setTripItems(prev => [...prev, { type: isPlace ? 'place' : 'event', data: item }]);
    setMessage(`Added "${item.name}" to your trip`);
    setMessageType('success');
    setShowTripPanel(true);
  };

  const handleRemoveFromTrip = (index: number) => {
    setTripItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateTrip = async (locationName: string, items: TripItem[]) => {
    setSavingTrip(true);
    try {
      const tripResponse = await fetch(buildPath('api/createTrip'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, location: locationName, jwtToken: getToken() }),
      });
      const tripData = await tripResponse.json();
      if (tripData.error) { setMessage(tripData.error); setMessageType('error'); setSavingTrip(false); return; }
      if (tripData.jwtToken) storeToken({ accessToken: tripData.jwtToken });

      let tok = tripData.jwtToken || getToken();
      for (const item of items) {
        const addRes = await fetch(buildPath('api/addToTrip'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user?.id, tripId: tripData.tripId, item, jwtToken: tok }),
        });
        const addData = await addRes.json();
        if (addData.jwtToken) { tok = addData.jwtToken; storeToken({ accessToken: addData.jwtToken }); }
      }

      setMessage('Trip saved! View it in My Trips.');
      setMessageType('success');
      setTripItems([]);
      setShowTripPanel(false);
      setTimeout(() => setMessage(''), 4000);
    } catch (error: any) {
      setMessage(error.message || 'Error creating trip');
      setMessageType('error');
    } finally {
      setSavingTrip(false);
    }
  };

  const tabs: { id: Tab; label: string; emoji: string; count?: number }[] = [
    { id: 'places', label: 'Places', emoji: '📍', count: places.length },
    { id: 'hotels', label: 'Hotels', emoji: '🏨', count: hotels.length },
    { id: 'events', label: 'Events', emoji: '🎟️', count: events.length },
    { id: 'flights', label: 'Flights', emoji: '✈️' },
  ];

  return (
    <div className="tt-search-page">
      <nav className="tt-search-nav">
        <div className="tt-search-nav-inner">
          <a href="/" className="tt-search-nav-brand">
            <span className="tt-search-nav-brand-trip">Trip</span>
            <span className="tt-search-nav-brand-tastic">tastic!</span>
          </a>
          <div className="tt-search-nav-links">
            <a href="/search" className="tt-search-nav-link active">🔍 Explore</a>
            <a href="/trips" className="tt-search-nav-link">🗺️ My Trips</a>
          </div>
          <div className="tt-search-nav-right">
            {tripItems.length > 0 && (
              <button className="tt-search-trip-btn" onClick={() => setShowTripPanel(p => !p)}>
                🧳 Trip ({tripItems.length})
              </button>
            )}
            <span className="tt-search-nav-user">👤 {user?.firstName} {user?.lastName}</span>
            <button className="tt-search-nav-logout" onClick={doLogout}>Log Out</button>
          </div>
        </div>
      </nav>

      {showWizard ? (
        <div className="tt-wizard-page">
          <TripWizard onDestinationSelected={runSearch} />
          <button className="tt-wizard-skip" onClick={() => setShowWizard(false)}>
            Skip — just search →
          </button>
        </div>
      ) : (
        <>
          <div className="tt-search-bar-section">
            <form className="tt-search-form" onSubmit={handleSearch}>
              <button type="button" className="tt-search-wizard-btn" onClick={() => setShowWizard(true)} title="Back to trip wizard">
                🗺️
              </button>
              <div className="tt-search-input-group">
                <svg className="tt-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  className="tt-search-input"
                  placeholder="Search destinations, cities, landmarks..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <select className="tt-search-select" value={placeFilter} onChange={e => setPlaceFilter(e.target.value)}>
                <option value="all">All Types</option>
                <option value="things_to_do">Things to Do</option>
                <option value="restaurant">Restaurants</option>
                <option value="cafe">Cafes</option>
                <option value="park">Parks</option>
                <option value="museum">Museums</option>
                <option value="bar">Bars</option>
              </select>
              <input type="date" className="tt-search-date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              <input type="date" className="tt-search-date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              <button type="submit" className="tt-search-submit" disabled={loading}>
                {loading ? <span className="tt-search-loading-dot" /> : <>Search <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></>}
              </button>
            </form>
            {message && (
              <div className={`tt-search-message tt-search-message-${messageType}`}>
                {messageType === 'success' && '✓ '}{messageType === 'error' && '⚠ '}{message}
              </div>
            )}
          </div>

          {location ? (
            <div className="tt-search-main">
              <div className="tt-search-left">
                <div className="tt-search-location-header">
                  <div className="tt-search-location-pin">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                  </div>
                  <h2 className="tt-search-location-name">{location.name}</h2>
                </div>
                <div className="tt-search-map-wrap">
                  <Map location={location} places={places} />
                </div>
                <div className="tt-search-tabs">
                  {tabs.map(tab => (
                    <button key={tab.id} className={`tt-search-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
                      {tab.emoji} {tab.label}
                      {tab.count !== undefined && tab.count > 0 && <span className="tt-search-tab-count">{tab.count}</span>}
                    </button>
                  ))}
                </div>
                <div className="tt-search-tab-content">
                  {activeTab === 'places' && <PlacesList places={places} onAddToTrip={handleAddToTrip} loading={loading} />}
                  {activeTab === 'hotels' && <PlacesList places={hotels} onAddToTrip={handleAddToTrip} loading={hotelsLoading} />}
                  {activeTab === 'events' && <EventsList events={events} onAddToTrip={handleAddToTrip} loading={loading} />}
                  {activeTab === 'flights' && (
                    <FlightTickets
                      defaultOutboundDate={startDate}
                      defaultReturnDate={endDate}
                      onAddToTrip={(flightData: any) => {
                        const isReturn = flightData.name?.startsWith('Return:');
                        setPendingFlight({
                          direction: isReturn ? 'return' : 'outbound',
                          label: flightData.name,
                          airline: flightData.address,
                          price: '',
                        });
                        setMessage(`Added flight to Getting There`);
                        setMessageType('success');
                        setShowTripPanel(true);
                      }}
                    />
                  )}
                </div>
              </div>
              <div className={`tt-search-sidebar ${showTripPanel ? 'open' : ''}`}>
                <TripPlanner
                  location={location.name}
                  items={tripItems}
                  onRemoveItem={handleRemoveFromTrip}
                  onCreateTrip={handleCreateTrip}
                  saving={savingTrip}
                  onToggle={() => setShowTripPanel(p => !p)}
                  isOpen={showTripPanel}
                  onOpenFlights={() => { setActiveTab('flights'); setShowTripPanel(false); }}
                  onOpenHotels={() => { setActiveTab('hotels'); setShowTripPanel(false); }}
                  pendingFlight={pendingFlight}
                  onFlightConsumed={() => setPendingFlight(null)}
                  pendingHotel={pendingHotel}
                  onHotelConsumed={() => setPendingHotel(null)}
                />
              </div>
            </div>
          ) : (
            <div className="tt-search-empty">
              <div className="tt-search-empty-visual">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--tt-purple)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </div>
              <h2 className="tt-search-empty-title">Where to next?</h2>
              <p className="tt-search-empty-desc">Search a city or destination above to discover places, events, and flights.</p>
              <div className="tt-search-empty-suggestions">
                {['Paris', 'Tokyo', 'New York', 'Bali', 'Rome'].map(city => (
                  <button key={city} className="tt-search-suggestion-chip" onClick={() => runSearch(city)}>{city}</button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SearchPage;