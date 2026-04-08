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
}

const minutesToDuration = (minutes?: number) => {
  if (!minutes && minutes !== 0) return 'N/A';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
};

const FlightTickets = ({ defaultOutboundDate = '', defaultReturnDate = '' }: FlightTicketsProps) => {
  const [departureId, setDepartureId] = useState('');
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

  const getDepartureToken = (flight: FlightResult) =>
    flight.departure_token || flight.flights?.[0]?.departure_token || '';

  const getBookingToken = (flight: FlightResult) =>
    flight.booking_token || flight.flights?.[0]?.booking_token || '';

  const getBookingLink = (option: BookingOption) =>
    option.url || option.link || option.booking_url || '';

  const callFlightApi = async (payload: Record<string, unknown>) => {
    const response = await fetch(buildPath('api/searchFlights'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, jwtToken: getAccessToken() }),
    });

    const data = await response.json();
    if (data.jwtToken) {
      storeToken({ accessToken: data.jwtToken });
    }
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
      const data = await callFlightApi({
        departureId,
        arrivalId,
        outboundDate,
        returnDate: tripType === 1 ? returnDate : undefined,
        tripType,
        adults,
        travelClass,
      });

      if (data.error) {
        setError(data.error);
        setOutboundResults([]);
        setReturnResults([]);
        setBookingOptions([]);
      } else {
        setOutboundResults(data.flights || []);
        setReturnResults([]);
        setBookingOptions([]);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to search flights.');
      setOutboundResults([]);
      setReturnResults([]);
      setBookingOptions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGetReturnFlights = async (flight: FlightResult) => {
    const departureToken = getDepartureToken(flight);
    if (!departureToken) {
      setError('No departure token found for this flight option.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await callFlightApi({
        departureId,
        arrivalId,
        outboundDate,
        returnDate: tripType === 1 ? returnDate : undefined,
        tripType,
        adults,
        travelClass,
        departureToken,
      });

      if (data.error) {
        setError(data.error);
        setReturnResults([]);
      } else {
        setReturnResults(data.flights || []);
        setBookingOptions([]);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to load return flights.');
      setReturnResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGetBookingOptions = async (flight: FlightResult) => {
    const bookingToken = getBookingToken(flight);
    if (!bookingToken) {
      setError('No booking token found for this return flight option.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await callFlightApi({
        departureId,
        arrivalId,
        outboundDate,
        returnDate: tripType === 1 ? returnDate : undefined,
        tripType,
        adults,
        travelClass,
        bookingToken,
      });

      if (data.error) {
        setError(data.error);
        setBookingOptions([]);
      } else {
        setBookingOptions(data.bookingOptions || []);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to load booking options.');
      setBookingOptions([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="flightTicketsContainer">
      <h3>Flight Tickets</h3>
      <p style={{ marginTop: 0, color: '#555' }}>
        Enter departure and arrival airport codes plus your travel dates to search available flights.
      </p>
      <form onSubmit={handleFlightSearch} style={{ display: 'grid', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <label style={{ display: 'grid', gap: '4px' }}>
            <span>Departure Airport</span>
          <input
            type="text"
            value={departureId}
            onChange={(e) => setDepartureId(e.target.value.toUpperCase())}
            maxLength={3}
            placeholder="IATA code (e.g. MCO)"
            required
            style={{ padding: '10px', minWidth: '180px' }}
          />
          </label>
          <label style={{ display: 'grid', gap: '4px' }}>
            <span>Arrival Airport</span>
          <input
            type="text"
            value={arrivalId}
            onChange={(e) => setArrivalId(e.target.value.toUpperCase())}
            maxLength={3}
            placeholder="IATA code (e.g. JFK)"
            required
            style={{ padding: '10px', minWidth: '180px' }}
          />
          </label>
          <label style={{ display: 'grid', gap: '4px' }}>
            <span>Departure Date</span>
          <input
            type="date"
            value={outboundDate}
            onChange={(e) => setOutboundDate(e.target.value)}
            required
            style={{ padding: '10px' }}
          />
          </label>
          {tripType === 1 && (
            <label style={{ display: 'grid', gap: '4px' }}>
              <span>Return Date</span>
            <input
              type="date"
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              required={tripType === 1}
              style={{ padding: '10px' }}
            />
            </label>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <select
            value={tripType}
            onChange={(e) => setTripType(Number(e.target.value) as 1 | 2)}
            style={{ padding: '10px' }}
          >
            <option value={1}>Round Trip</option>
            <option value={2}>One Way</option>
          </select>

          <select
            value={adults}
            onChange={(e) => setAdults(Number(e.target.value))}
            style={{ padding: '10px' }}
          >
            {[1, 2, 3, 4, 5, 6].map((count) => (
              <option key={count} value={count}>
                {count} Adult{count > 1 ? 's' : ''}
              </option>
            ))}
          </select>

          <select
            value={travelClass}
            onChange={(e) => setTravelClass(Number(e.target.value) as 1 | 2 | 3 | 4)}
            style={{ padding: '10px' }}
          >
            <option value={1}>Economy</option>
            <option value={2}>Premium Economy</option>
            <option value={3}>Business</option>
            <option value={4}>First</option>
          </select>

          <button type="submit" className="buttons" disabled={loading}>
            {loading ? 'Searching Flights...' : 'Find Flights'}
          </button>
        </div>
      </form>

      {error && <p style={{ color: '#d32f2f', marginTop: '10px' }}>{error}</p>}

      {!loading && !error && outboundResults.length > 0 && (
        <div className="scrollable-list" style={{ marginTop: '12px', maxHeight: '420px' }}>
          {outboundResults.map((flight, idx) => (
            <div key={idx} className="card-item">
              <h4>Outbound Option {idx + 1}</h4>
              <p>
                <strong>Price:</strong> {flight.price ?? 'N/A'}
              </p>
              <p>
                <strong>Total Duration:</strong> {minutesToDuration(flight.total_duration)}
              </p>
              {flight.flights?.[0] && (
                <p>
                  <strong>Airline:</strong> {flight.flights[0].airline || 'N/A'}
                </p>
              )}
              {flight.flights?.[0]?.departure_airport && flight.flights?.[0]?.arrival_airport && (
                <p>
                  <strong>Route:</strong> {flight.flights[0].departure_airport?.id} ({flight.flights[0].departure_airport?.time}) to {flight.flights[0].arrival_airport?.id} ({flight.flights[0].arrival_airport?.time})
                </p>
              )}
              <button
                type="button"
                className="buttons"
                onClick={() => handleGetReturnFlights(flight)}
                disabled={loading || !getDepartureToken(flight)}
              >
                Get Return Flights
              </button>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && returnResults.length > 0 && (
        <div className="scrollable-list" style={{ marginTop: '12px', maxHeight: '420px' }}>
          <h4>Return Flight Options</h4>
          {returnResults.map((flight, idx) => (
            <div key={`return-${idx}`} className="card-item">
              <h4>Return Option {idx + 1}</h4>
              <p>
                <strong>Price:</strong> {flight.price ?? 'N/A'}
              </p>
              <p>
                <strong>Total Duration:</strong> {minutesToDuration(flight.total_duration)}
              </p>
              {flight.flights?.[0] && (
                <p>
                  <strong>Airline:</strong> {flight.flights[0].airline || 'N/A'}
                </p>
              )}
              <button
                type="button"
                className="buttons"
                onClick={() => handleGetBookingOptions(flight)}
                disabled={loading || !getBookingToken(flight)}
              >
                Get Booking Links
              </button>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && bookingOptions.length > 0 && (
        <div className="scrollable-list" style={{ marginTop: '12px', maxHeight: '420px' }}>
          <h4>Booking Options</h4>
          {bookingOptions.map((option, idx) => (
            <div key={`book-${idx}`} className="card-item">
              <p>
                <strong>Provider:</strong> {option.name || option.source || `Option ${idx + 1}`}
              </p>
              {option.price && (
                <p>
                  <strong>Price:</strong> {option.price}
                </p>
              )}
              {getBookingLink(option) ? (
                <a
                  href={getBookingLink(option)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="buttons"
                  style={{ display: 'inline-block' }}
                >
                  Buy Ticket
                </a>
              ) : (
                <p>No booking link available for this option.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FlightTickets;