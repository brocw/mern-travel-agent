interface Event {
  name: string;
  date?: string;
  venue: string;
  ticketUrl: string;
  image?: string;
}

interface EventsListProps {
  events: Event[];
  onAddToTrip: (event: Event) => void;
  loading?: boolean;
}

const EventsList = ({ events, onAddToTrip, loading }: EventsListProps) => {
  return (
    <div id="eventsListContainer">
      <h3>Events & Concerts</h3>
      {loading && <p>Loading events...</p>}
      {!loading && events.length === 0 && <p>No events found. Search for a location first.</p>}
      <div id="eventsList" className="scrollable-list">
        {events.map((event, index) => (
          <div key={index} className="card-item">
            {event.image && (
              <img
                src={event.image}
                alt={event.name}
                style={{ width: '100%', maxHeight: '150px', objectFit: 'cover', borderRadius: '4px', marginBottom: '10px' }}
              />
            )}
            <h4>{event.name}</h4>
            {event.date && <p><strong>Date:</strong> {event.date}</p>}
            <p><strong>Venue:</strong> {event.venue}</p>
            <a
              href={event.ticketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="buttons"
              style={{ display: 'inline-block', marginRight: '10px' }}
            >
              Get Tickets
            </a>
            <button
              className="buttons add-btn"
              onClick={() => onAddToTrip(event)}
            >
              Add to Trip
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventsList;
