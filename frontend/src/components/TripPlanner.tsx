import { useState, useEffect } from 'react';
interface TripItem {
  type: 'place' | 'event';
  data: any;
}

interface FlightSlot {
  type: 'flight' | 'driving' | 'figure-it-out' | null;
  label?: string;
  price?: string;
  airline?: string;
  departure?: string;
  arrival?: string;
}

interface HotelSlot {
  type: 'hotel' | 'i-know-a-place' | 'surprise' | null;
  name?: string;
  address?: string;
}

interface TripPlannerProps {
  location: string;
  items: TripItem[];
  onRemoveItem: (index: number) => void;
  onCreateTrip: (location: string, items: TripItem[]) => Promise<void>;
  saving?: boolean;
  onToggle?: () => void;
  isOpen?: boolean;
  onOpenFlights?: () => void;
  onOpenHotels?: () => void;
  pendingFlight?: { direction: 'outbound' | 'return'; label: string; airline: string; price: string } | null;
  onFlightConsumed?: () => void;
  pendingHotel?: { name: string; address: string } | null;
  onHotelConsumed?: () => void;
}

const TripPlanner = ({
  location,
  items,
  onRemoveItem,
  onCreateTrip,
  saving,
  onToggle,
  isOpen,
  onOpenFlights,
  onOpenHotels,
  pendingFlight,
  onFlightConsumed,
  pendingHotel,
  onHotelConsumed,
}: TripPlannerProps) => {
  const [outboundFlight, setOutboundFlight] = useState<FlightSlot>({ type: null });
  const [numDays, setNumDays] = useState(1);
  const [itemDays, setItemDays] = useState<Record<number, number>>({});
  const [returnFlight, setReturnFlight] = useState<FlightSlot>({ type: null });
  const [hotel, setHotel] = useState<HotelSlot>({ type: null });
  const [showOutboundOptions, setShowOutboundOptions] = useState(false);
  const [showReturnOptions, setShowReturnOptions] = useState(false);
  const [showHotelOptions, setShowHotelOptions] = useState(false);
  const getItemDay = (index: number) => itemDays[index] || 1;
  const setItemDay = (index: number, day: number) => {
    setItemDays(prev => ({ ...prev, [index]: day }));
  };
  const dayGroups = Array.from({ length: numDays }, (_, i) => i + 1).map(day => ({
    day,
    items: items.map((item, idx) => ({ item, idx })).filter(({ idx }) => getItemDay(idx) === day),
  }));
  const closeAll = () => { setShowOutboundOptions(false); setShowReturnOptions(false); setShowHotelOptions(false); };
  useEffect(() => {
    if (pendingFlight) {
      const slot: FlightSlot = {
        type: 'flight',
        label: pendingFlight.label,
        airline: pendingFlight.airline,
        price: pendingFlight.price,
      };
      if (pendingFlight.direction === 'outbound') {
        setOutboundFlight(slot);
      } else {
        setReturnFlight(slot);
      }
      onFlightConsumed?.();
    }
  }, [pendingFlight]);

  useEffect(() => {
    if (pendingHotel) {
      setHotel({ type: 'hotel', name: pendingHotel.name, address: pendingHotel.address });
      onHotelConsumed?.();
    }
  }, [pendingHotel]);
  const FlightSlotUI = ({
    slot,
    emptyLabel,
    showOptions,
    onShowOptions,
    onClear,
    onDriving,
    onFigureItOut,
    directionLabel,
  }: {
    slot: FlightSlot;
    emptyLabel: string;
    showOptions: boolean;
    onShowOptions: () => void;
    onClear: () => void;
    onDriving: () => void;
    onFigureItOut: () => void;
    directionLabel: string;
  }) => {
    if (slot.type === 'flight') return (
      <div className="tt-planner-slot tt-planner-slot-filled">
        <div className="tt-planner-slot-icon">✈️</div>
        <div className="tt-planner-slot-info">
          <div className="tt-planner-slot-type">Flight {directionLabel}</div>
          <div className="tt-planner-slot-name">{slot.label}</div>
          {slot.airline && <div className="tt-planner-slot-detail">{slot.airline}{slot.price ? ` · ${slot.price}` : ''}</div>}
          {slot.departure && <div className="tt-planner-slot-detail">{slot.departure} → {slot.arrival}</div>}
        </div>
        <button className="tt-planner-slot-clear" onClick={onClear}>✕</button>
      </div>
    );

    if (slot.type === 'driving') return (
      <div className="tt-planner-slot tt-planner-slot-filled tt-planner-slot-casual">
        <div className="tt-planner-slot-icon">🚗</div>
        <div className="tt-planner-slot-info">
          <div className="tt-planner-slot-type">{directionLabel}</div>
          <div className="tt-planner-slot-name">Driving</div>
        </div>
        <button className="tt-planner-slot-clear" onClick={onClear}>✕</button>
      </div>
    );

    if (slot.type === 'figure-it-out') return (
      <div className="tt-planner-slot tt-planner-slot-filled tt-planner-slot-casual">
        <div className="tt-planner-slot-icon">🤷</div>
        <div className="tt-planner-slot-info">
          <div className="tt-planner-slot-type">{directionLabel}</div>
          <div className="tt-planner-slot-name">I'll figure it out</div>
        </div>
        <button className="tt-planner-slot-clear" onClick={onClear}>✕</button>
      </div>
    );

    return (
      <div className="tt-planner-slot-empty-wrap">
        <button className="tt-planner-slot-empty" onClick={onShowOptions}>
          <div className="tt-planner-slot-empty-icon">✈️</div>
          <div className="tt-planner-slot-empty-text">
            <span className="tt-planner-slot-empty-label">{emptyLabel}</span>
            <span className="tt-planner-slot-empty-hint">Tap to add</span>
          </div>
          <span className="tt-planner-slot-empty-plus">+</span>
        </button>
        {showOptions && (
          <div className="tt-planner-slot-options">
            <button className="tt-planner-slot-option" onClick={() => { closeAll(); onOpenFlights?.(); }}>
              <span>✈️</span> Search for a flight
            </button>
            <button className="tt-planner-slot-option" onClick={() => { onDriving(); closeAll(); }}>
              <span>🚗</span> I'm driving
            </button>
            <button className="tt-planner-slot-option" onClick={() => { onFigureItOut(); closeAll(); }}>
              <span>🤷</span> I'll figure it out
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="tt-trip-planner">
      <div className="tt-trip-planner-header" onClick={onToggle}>
        <div className="tt-trip-planner-header-left">
          <span className="tt-trip-planner-icon">🧳</span>
          <div>
            <h3 className="tt-trip-planner-title">Trip Planner</h3>
            <p className="tt-trip-planner-loc">{location || 'No location selected'}</p>
          </div>
        </div>
        <div className="tt-trip-planner-header-right">
          {items.length > 0 && <span className="tt-trip-planner-count">{items.length}</span>}
          <span className="tt-trip-planner-chevron">{isOpen ? '▲' : '▼'}</span>
        </div>
      </div>

      {isOpen && (
        <div className="tt-trip-planner-body">

          <div className="tt-planner-section-label">Getting There</div>

          <FlightSlotUI
            slot={outboundFlight}
            emptyLabel="How are you getting there?"
            showOptions={showOutboundOptions}
            onShowOptions={() => { closeAll(); setShowOutboundOptions(true); }}
            onClear={() => setOutboundFlight({ type: null })}
            onDriving={() => setOutboundFlight({ type: 'driving' })}
            onFigureItOut={() => setOutboundFlight({ type: 'figure-it-out' })}
            directionLabel="Outbound"
          />

          <FlightSlotUI
            slot={returnFlight}
            emptyLabel="How are you getting back?"
            showOptions={showReturnOptions}
            onShowOptions={() => { closeAll(); setShowReturnOptions(true); }}
            onClear={() => setReturnFlight({ type: null })}
            onDriving={() => setReturnFlight({ type: 'driving' })}
            onFigureItOut={() => setReturnFlight({ type: 'figure-it-out' })}
            directionLabel="Return"
          />

          <div className="tt-planner-section-label" style={{ marginTop: '0.5rem' }}>Where You're Staying</div>

          {hotel.type === 'hotel' ? (
            <div className="tt-planner-slot tt-planner-slot-filled">
              <div className="tt-planner-slot-icon">🏨</div>
              <div className="tt-planner-slot-info">
                <div className="tt-planner-slot-type">Hotel</div>
                <div className="tt-planner-slot-name">{hotel.name}</div>
                {hotel.address && <div className="tt-planner-slot-detail">{hotel.address}</div>}
              </div>
              <button className="tt-planner-slot-clear" onClick={() => setHotel({ type: null })}>✕</button>
            </div>
          ) : hotel.type === 'i-know-a-place' ? (
            <div className="tt-planner-slot tt-planner-slot-filled tt-planner-slot-casual">
              <div className="tt-planner-slot-icon">🤝</div>
              <div className="tt-planner-slot-info">
                <div className="tt-planner-slot-type">Accommodation</div>
                <div className="tt-planner-slot-name">I know a place</div>
              </div>
              <button className="tt-planner-slot-clear" onClick={() => setHotel({ type: null })}>✕</button>
            </div>
          ) : hotel.type === 'surprise' ? (
            <div className="tt-planner-slot tt-planner-slot-filled tt-planner-slot-casual">
              <div className="tt-planner-slot-icon">🎲</div>
              <div className="tt-planner-slot-info">
                <div className="tt-planner-slot-type">Accommodation</div>
                <div className="tt-planner-slot-name">Surprise me 🎲</div>
              </div>
              <button className="tt-planner-slot-clear" onClick={() => setHotel({ type: null })}>✕</button>
            </div>
          ) : (
            <div className="tt-planner-slot-empty-wrap">
              <button className="tt-planner-slot-empty" onClick={() => { closeAll(); setShowHotelOptions(true); }}>
                <div className="tt-planner-slot-empty-icon">🏨</div>
                <div className="tt-planner-slot-empty-text">
                  <span className="tt-planner-slot-empty-label">Where are you staying?</span>
                  <span className="tt-planner-slot-empty-hint">Tap to add</span>
                </div>
                <span className="tt-planner-slot-empty-plus">+</span>
              </button>
              {showHotelOptions && (
                <div className="tt-planner-slot-options">
                  <button className="tt-planner-slot-option" onClick={() => { closeAll(); onOpenHotels?.(); }}>
                    <span>🏨</span> Browse hotels
                  </button>
                  <button className="tt-planner-slot-option" onClick={() => { setHotel({ type: 'i-know-a-place' }); closeAll(); }}>
                    <span>🤝</span> I know a place
                  </button>
                  <button className="tt-planner-slot-option" onClick={() => { setHotel({ type: 'surprise' }); closeAll(); }}>
                    <span>🎲</span> Surprise me
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="tt-planner-section-label" style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Your Itinerary</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={() => setNumDays(Math.max(1, numDays - 1))}
                style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--tt-ice)', color: 'var(--tt-navy)', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--tt-purple)' }}
              >−</button>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--tt-navy)' }}>{numDays} day{numDays > 1 ? 's' : ''}</span>
              <button
                onClick={() => setNumDays(numDays + 1)}
                style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--tt-ice)', color: 'var(--tt-navy)', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--tt-purple)' }}
              >+</button>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="tt-trip-planner-empty">
              <p>No items yet.</p>
              <p>Click <strong>+ Add to Trip</strong> on any place or event.</p>
            </div>
          ) : (
            <div className="tt-trip-planner-items">
              {dayGroups.map(({ day, items: dayItems }) => (
                <div key={day}>
                  <div style={{ padding: '0.5rem 0.75rem', margin: '0.5rem 0 0.25rem', background: 'var(--tt-ice)', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--tt-navy)', letterSpacing: '0.03em' }}>
                    Day {day}
                  </div>
                  {dayItems.length === 0 && (
                    <p style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', color: 'var(--tt-subtle)', fontStyle: 'italic' }}>
                      No items assigned to this day
                    </p>
                  )}
                  {dayItems.map(({ item, idx }) => (
                    <div key={idx} className="tt-trip-planner-item">
                      <span className="tt-trip-planner-item-icon">{item.data?.type === 'flight' ? '✈️' : item.type === 'place' ? '📍' : '🎟️'}</span>
                      <div className="tt-trip-planner-item-info">
                        <div className="tt-trip-planner-item-type">{item.data?.type === 'flight' ? 'Flight' : item.type === 'place' ? 'Place' : 'Event'}</div>
                        <div className="tt-trip-planner-item-name">{item.data.name || item.data}</div>
                        {item.data.address && <div className="tt-trip-planner-item-detail">{item.data.address}</div>}
                        {item.data.date && <div className="tt-trip-planner-item-detail">{item.data.date}</div>}
                      </div>
                      <select
                        value={getItemDay(idx)}
                        onChange={e => setItemDay(idx, Number(e.target.value))}
                        style={{ width: '52px', padding: '0.25rem', borderRadius: '0.5rem', border: '1px solid var(--tt-purple)', fontSize: '0.75rem', color: 'var(--tt-navy)', background: 'white' }}
                      >
                        {Array.from({ length: numDays }, (_, i) => (
                          <option key={i + 1} value={i + 1}>D{i + 1}</option>
                        ))}
                      </select>
                      <button className="tt-trip-planner-remove" onClick={() => onRemoveItem(idx)}>✕</button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          <button
            className="tt-trip-planner-save-btn"
            onClick={() => {
              const allItems = [...items];
              if (outboundFlight.type === 'flight') {
                allItems.unshift({ type: 'place', data: { name: outboundFlight.label, address: outboundFlight.airline, type: 'flight' } });
              }
              if (hotel.type === 'hotel') {
                allItems.unshift({ type: 'place', data: { name: hotel.name, address: hotel.address, type: 'hotel' } });
              }
              if (returnFlight.type === 'flight') {
                allItems.push({ type: 'place', data: { name: returnFlight.label, address: returnFlight.airline, type: 'flight' } });
              }
              onCreateTrip(location, allItems);
            }}
            disabled={!location || (items.length === 0 && outboundFlight.type !== 'flight' && returnFlight.type !== 'flight' && hotel.type !== 'hotel') || saving}
          >
            {saving ? (
              <><span className="tt-trip-planner-spinner" /> Saving...</>
            ) : (
              <>Save Trip <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default TripPlanner;