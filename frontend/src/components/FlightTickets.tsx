import { useState } from 'react';
import { buildPath } from './Path';
import { getAccessToken, storeToken } from '../tokenStorage';

interface FlightLeg {
  departure_airport?: { id?: string; name?: string; time?: string };
  arrival_airport?: { id?: string; name?: string; time?: string };
  airline?: string;
  flight_number?: string;
  departure_token?: string;
  booking_token?: string;
}

interface FlightResult {
  price?: number | string;
  total_duration?: number;
  flights?: FlightLeg[];
  layovers?: Array<{ duration?: number; name?: string }>;
  departure_token?: string;
  booking_token?: string;
}

interface BookingOption {
  name?: string;
  source?: string;
  link?: string;
  url?: string;
  booking_url?: string;
  price?: number | string;
}

interface FlightTicketsProps {
  defaultReturnDate?: string;
  defaultOutboundDate?: string;
  onAddToTrip?: (flightData: any) => void;
}

const minutesToDuration = (minutes?: number) => {
  if (!minutes && minutes !== 0) return 'N/A';
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};

const FlightTickets = ({ defaultOutboundDate = '', defaultReturnDate = '', onAddToTrip }: FlightTicketsProps) => {  const [departureId, setDepartureId] = useState('');
  const [arrivalId, setArrivalId] = useState('');
  const [outboundDate, setOutboundDate] = useState(defaultOutboundDate);
  const [returnDate, setReturnDate] = useState(defaultReturnDate);
  const [tripType, setTripType] = useState<1 | 2>(1);
  const [adults, setAdults] = useState(1);
  const [travelClass, setTravelClass] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [outboundResults, setOutboundResults] = useState<FlightResult[]>([]);
  const [returnResults, setReturnResults] = useState<FlightResult[]>([]);
  const [bookingOptions, setBookingOptions] = useState<BookingOption[]>([]);

  const getDepartureToken = (f: FlightResult) => f.departure_token || f.flights?.[0]?.departure_token || '';
  const getBookingToken = (f: FlightResult) => f.booking_token || f.flights?.[0]?.booking_token || '';
  const getBookingLink = (o: BookingOption) => o.url || o.link || o.booking_url || '';

  const callFlightApi = async (payload: Record<string, unknown>) => {
    const response = await fetch(buildPath('api/searchFlights'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, jwtToken: getAccessToken() }),
    });
    const data = await response.json();
    if (data.jwtToken) storeToken({ accessToken: data.jwtToken });
    return data;
  };

  const handleFlightSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!departureId || !arrivalId || !outboundDate) {
      setError('Please fill departure airport, arrival airport, and departure date.');
      return;
    }
    if (tripType === 1 && !returnDate) {
      setError('Please select a return date for round trips.');
      return;
    }
    setLoading(true);
    try {
      const data = await callFlightApi({ departureId, arrivalId, outboundDate, returnDate: tripType === 1 ? returnDate : undefined, tripType, adults, travelClass });
      if (data.error) { setError(data.error); setOutboundResults([]); setReturnResults([]); setBookingOptions([]); }
      else { setOutboundResults(data.flights || []); setReturnResults([]); setBookingOptions([]); }
    } catch (err: any) {
      setError(err.message || 'Unable to search flights.');
    } finally { setLoading(false); }
  };

  const handleGetReturnFlights = async (flight: FlightResult) => {
    const departureToken = getDepartureToken(flight);
    if (!departureToken) { setError('No departure token found.'); return; }
    setLoading(true); setError('');
    try {
      const data = await callFlightApi({ departureId, arrivalId, outboundDate, returnDate: tripType === 1 ? returnDate : undefined, tripType, adults, travelClass, departureToken });
      if (data.error) { setError(data.error); setReturnResults([]); }
      else { setReturnResults(data.flights || []); setBookingOptions([]); }
    } catch (err: any) { setError(err.message || 'Unable to load return flights.'); }
    finally { setLoading(false); }
  };

  const handleGetBookingOptions = async (flight: FlightResult) => {
    const bookingToken = getBookingToken(flight);
    if (!bookingToken) { setError('No booking token found.'); return; }
    setLoading(true); setError('');
    try {
      const data = await callFlightApi({ departureId, arrivalId, outboundDate, returnDate: tripType === 1 ? returnDate : undefined, tripType, adults, travelClass, bookingToken });
      if (data.error) { setError(data.error); setBookingOptions([]); }
      else setBookingOptions(data.bookingOptions || []);
    } catch (err: any) { setError(err.message || 'Unable to load booking options.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="tt-flights-container">
      <h3 className="tt-flights-title">✈️ Flight Search</h3>
      <p className="tt-flights-subtitle">Enter airport IATA codes and your dates to find available flights.</p>

      <form onSubmit={handleFlightSearch} className="tt-flights-form">
        <div className="tt-flights-row">
          <div className="tt-flights-field">
            <label className="tt-flights-label">From</label>
            <input type="text" className="tt-flights-input" value={departureId}
              onChange={e => setDepartureId(e.target.value.toUpperCase())} maxLength={3} placeholder="MCO" required />
          </div>
          <div className="tt-flights-field">
            <label className="tt-flights-label">To</label>
            <input type="text" className="tt-flights-input" value={arrivalId}
              onChange={e => setArrivalId(e.target.value.toUpperCase())} maxLength={3} placeholder="JFK" required />
          </div>
          <div className="tt-flights-field">
            <label className="tt-flights-label">Depart</label>
            <input type="date" className="tt-flights-input" value={outboundDate} onChange={e => setOutboundDate(e.target.value)} required />
          </div>
          {tripType === 1 && (
            <div className="tt-flights-field">
              <label className="tt-flights-label">Return</label>
              <input type="date" className="tt-flights-input" value={returnDate} onChange={e => setReturnDate(e.target.value)} required />
            </div>
          )}
        </div>

        <div className="tt-flights-row">
          <select className="tt-flights-select" value={tripType} onChange={e => setTripType(Number(e.target.value) as 1 | 2)}>
            <option value={1}>Round Trip</option>
            <option value={2}>One Way</option>
          </select>
          <select className="tt-flights-select" value={adults} onChange={e => setAdults(Number(e.target.value))}>
            {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} Adult{n > 1 ? 's' : ''}</option>)}
          </select>
          <select className="tt-flights-select" value={travelClass} onChange={e => setTravelClass(Number(e.target.value) as 1|2|3|4)}>
            <option value={1}>Economy</option>
            <option value={2}>Premium Economy</option>
            <option value={3}>Business</option>
            <option value={4}>First</option>
          </select>
          <button type="submit" className="tt-flights-submit" disabled={loading}>
            {loading ? <><span className="tt-trip-planner-spinner" /> Searching...</> : 'Find Flights'}
          </button>
        </div>
      </form>

      {error && <div className="tt-flights-error">⚠ {error}</div>}

      {!loading && outboundResults.length > 0 && (
        <div className="tt-flights-results">
          <h4 className="tt-flights-results-heading">Outbound Flights</h4>
          {outboundResults.map((flight, idx) => (
            <div key={idx} className="tt-flight-card">
              <div className="tt-flight-card-top">
                <div className="tt-flight-card-route">
                  <span className="tt-flight-airport">{flight.flights?.[0]?.departure_airport?.id || departureId}</span>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--tt-steel)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                  <span className="tt-flight-airport">{flight.flights?.[0]?.arrival_airport?.id || arrivalId}</span>
                </div>
                <div className="tt-flight-price">{flight.price ? `$${flight.price}` : 'N/A'}</div>
              </div>
              <div className="tt-flight-card-meta">
                {flight.flights?.[0]?.airline && <span>{flight.flights[0].airline}</span>}
                <span>·</span>
                <span>{minutesToDuration(flight.total_duration)}</span>
                {flight.flights?.[0]?.departure_airport?.time && (
                  <><span>·</span><span>{flight.flights[0].departure_airport.time} → {flight.flights[0].arrival_airport?.time}</span></>
                )}
              </div>
              <button className="tt-flights-action-btn" onClick={() => handleGetReturnFlights(flight)} disabled={loading || !getDepartureToken(flight)}>
                Select — Get Return Flights →
              </button>
              {onAddToTrip && (
                <button
                  className="tt-flights-action-btn"
                  style={{ marginTop: '0.5rem', background: 'var(--tt-navy)', color: 'white' }}
                  onClick={() => onAddToTrip({
                    name: `Flight: ${flight.flights?.[0]?.departure_airport?.id || departureId} → ${flight.flights?.[0]?.arrival_airport?.id || arrivalId}`,
                    address: `${flight.flights?.[0]?.airline || 'Unknown airline'} · ${minutesToDuration(flight.total_duration)} · ${flight.price ? `$${flight.price}` : 'N/A'}`,
                    type: 'flight',
                  })}
                >
                  🧳 Save to Trip
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && returnResults.length > 0 && (
        <div className="tt-flights-results">
          <h4 className="tt-flights-results-heading">Return Flights</h4>
          {returnResults.map((flight, idx) => (
            <div key={idx} className="tt-flight-card">
              <div className="tt-flight-card-top">
                <div className="tt-flight-card-route">
                  <span className="tt-flight-airport">{flight.flights?.[0]?.departure_airport?.id || arrivalId}</span>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--tt-steel)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                  <span className="tt-flight-airport">{flight.flights?.[0]?.arrival_airport?.id || departureId}</span>
                </div>
                <div className="tt-flight-price">{flight.price ? `$${flight.price}` : 'N/A'}</div>
              </div>
              <div className="tt-flight-card-meta">
                {flight.flights?.[0]?.airline && <span>{flight.flights[0].airline}</span>}
                <span>·</span><span>{minutesToDuration(flight.total_duration)}</span>
              </div>
              <button className="tt-flights-action-btn" onClick={() => handleGetBookingOptions(flight)} disabled={loading || !getBookingToken(flight)}>
                Select — Get Booking Links →
              </button>
              {onAddToTrip && (
                <button
                  className="tt-flights-action-btn"
                  style={{ marginTop: '0.5rem', background: 'var(--tt-navy)', color: 'white' }}
                  onClick={() => onAddToTrip({
                    name: `Return: ${flight.flights?.[0]?.departure_airport?.id || arrivalId} → ${flight.flights?.[0]?.arrival_airport?.id || departureId}`,
                    address: `${flight.flights?.[0]?.airline || 'Unknown airline'} · ${minutesToDuration(flight.total_duration)} · ${flight.price ? `$${flight.price}` : 'N/A'}`,
                    type: 'flight',
                  })}
                >
                  🧳 Save to Trip
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && bookingOptions.length > 0 && (
        <div className="tt-flights-results">
          <h4 className="tt-flights-results-heading">Book Your Flight</h4>
          {bookingOptions.map((option, idx) => (
            <div key={idx} className="tt-flight-card tt-flight-card-booking">
              <div className="tt-flight-card-top">
                <span className="tt-flight-provider">{option.name || option.source || `Option ${idx + 1}`}</span>
                {option.price && <div className="tt-flight-price">{option.price}</div>}
              </div>
              {getBookingLink(option) ? (
                <a href={getBookingLink(option)} target="_blank" rel="noopener noreferrer" className="tt-flights-action-btn tt-flights-book-btn">
                  Book Now ↗
                </a>
              ) : (
                <p className="tt-flight-no-link">No booking link available.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FlightTickets;