import { useState } from 'react';

interface TripItem {
  type: 'place' | 'event';
  data: any;
}

interface TripPlannerProps {
  location: string;
  items: TripItem[];
  onRemoveItem: (index: number) => void;
  onCreateTrip: (location: string, items: TripItem[]) => Promise<void>;
  saving?: boolean;
}

const TripPlanner = ({
  location,
  items,
  onRemoveItem,
  onCreateTrip,
  saving,
}: TripPlannerProps) => {
  const [showPanel, setShowPanel] = useState(false);

  const handleCreateTrip = async () => {
    await onCreateTrip(location, items);
    setShowPanel(false);
  };

  return (
    <div id="tripPlannerContainer">
      <button
        className="buttons"
        onClick={() => setShowPanel(!showPanel)}
        style={{ marginBottom: '10px' }}
      >
        {showPanel ? 'Hide' : 'Show'} Trip Planner
      </button>

      {showPanel && (
        <div id="tripPlannerPanel" className="panel">
          <h3>Trip Itinerary</h3>
          <p><strong>Location:</strong> {location || 'Not selected'}</p>
          <h4>Items Added ({items.length})</h4>

          {items.length === 0 ? (
            <p style={{ color: '#666' }}>No items added yet. Click "Add to Trip" on places or events.</p>
          ) : (
            <div className="trip-items-list">
              {items.map((item, index) => (
                <div key={index} className="trip-item">
                  <div>
                    <p>
                      <strong>[{item.type.toUpperCase()}]</strong> {item.data.name || item.data}
                    </p>
                    {item.type === 'place' && item.data.address && (
                      <p style={{ fontSize: '0.9em', color: '#666' }}>{item.data.address}</p>
                    )}
                    {item.type === 'event' && item.data.date && (
                      <p style={{ fontSize: '0.9em', color: '#666' }}>{item.data.date}</p>
                    )}
                  </div>
                  <button
                    className="buttons remove-btn"
                    onClick={() => onRemoveItem(index)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            className="buttons"
            onClick={handleCreateTrip}
            disabled={!location || items.length === 0 || saving}
            style={{ marginTop: '15px', width: '100%' }}
          >
            {saving ? 'Creating Trip...' : 'Create & Save Trip'}
          </button>
        </div>
      )}
    </div>
  );
};

export default TripPlanner;
