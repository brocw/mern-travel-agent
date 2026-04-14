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
  if (loading) return (
    <div className="tt-list-loading">
      <div className="tt-list-spinner" />
      <p>Finding events near you...</p>
    </div>
  );

  if (events.length === 0) return (
    <div className="tt-list-empty">
      <span className="tt-list-empty-icon">🎟️</span>
      <p>No events found. Try adjusting your dates.</p>
    </div>
  );

  return (
    <div className="tt-results-grid">
      {events.map((event, index) => (
        <div key={index} className="tt-result-card">
          {event.image && (
            <div className="tt-result-card-img-wrap">
              <img src={event.image} alt={event.name} className="tt-result-card-img"
                onError={(e) => { (e.currentTarget as HTMLImageElement).parentElement!.style.display = 'none'; }} />
            </div>
          )}
          <div className="tt-result-card-body">
            <div className="tt-result-card-type">Event</div>
            <h4 className="tt-result-card-name">{event.name}</h4>
            {event.date && (
              <p className="tt-result-card-meta">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                {event.date}
              </p>
            )}
            <p className="tt-result-card-meta">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              {event.venue}
            </p>
            <div className="tt-result-card-actions">
              <a href={event.ticketUrl} target="_blank" rel="noopener noreferrer" className="tt-result-card-btn tt-result-card-btn-outline">Get Tickets ↗</a>
              <button className="tt-result-card-btn" onClick={() => onAddToTrip(event)}>+ Add to Trip</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default EventsList;