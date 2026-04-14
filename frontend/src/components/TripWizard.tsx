import { useState } from 'react';

interface TripWizardProps {
  onDestinationSelected: (destination: string) => void;
}

const activityDestinations: Record<string, { name: string; emoji: string; desc: string }[]> = {
  beach: [
    { name: 'Miami, Florida', emoji: '🌴', desc: 'Vibrant nightlife & white sand beaches' },
    { name: 'Cancun, Mexico', emoji: '🏖️', desc: 'Crystal clear Caribbean waters' },
    { name: 'Honolulu, Hawaii', emoji: '🌺', desc: 'Tropical paradise & surf culture' },
    { name: 'Barcelona, Spain', emoji: '🇪🇸', desc: 'Mediterranean beaches & architecture' },
  ],
  hiking: [
    { name: 'Denver, Colorado', emoji: '🏔️', desc: 'Gateway to Rocky Mountain trails' },
    { name: 'Banff, Canada', emoji: '🦌', desc: 'Stunning alpine lakes & glaciers' },
    { name: 'Queenstown, New Zealand', emoji: '🇳🇿', desc: 'Adventure capital of the world' },
    { name: 'Moab, Utah', emoji: '🪨', desc: 'Red rock canyons & arches' },
  ],
  food: [
    { name: 'New Orleans, Louisiana', emoji: '🎷', desc: 'Creole cuisine & jazz culture' },
    { name: 'Tokyo, Japan', emoji: '🍜', desc: 'World-class sushi & ramen' },
    { name: 'Rome, Italy', emoji: '🍝', desc: 'Pasta, pizza & centuries of flavor' },
    { name: 'Mexico City, Mexico', emoji: '🌮', desc: 'Street tacos & vibrant markets' },
  ],
  nightlife: [
    { name: 'Las Vegas, Nevada', emoji: '🎰', desc: 'The entertainment capital of the world' },
    { name: 'Ibiza, Spain', emoji: '🎵', desc: 'World-famous clubs & beach parties' },
    { name: 'New York City, New York', emoji: '🗽', desc: 'The city that never sleeps' },
    { name: 'Berlin, Germany', emoji: '🎶', desc: 'Legendary underground club scene' },
  ],
  culture: [
    { name: 'Paris, France', emoji: '🗼', desc: 'Art, fashion & timeless elegance' },
    { name: 'Kyoto, Japan', emoji: '⛩️', desc: 'Ancient temples & tea ceremonies' },
    { name: 'Florence, Italy', emoji: '🎨', desc: 'Renaissance art & architecture' },
    { name: 'Cairo, Egypt', emoji: '🏛️', desc: 'Pyramids & ancient civilization' },
  ],
  shopping: [
    { name: 'Dubai, UAE', emoji: '🛍️', desc: 'World\'s largest malls & luxury brands' },
    { name: 'Milan, Italy', emoji: '👗', desc: 'Fashion capital of the world' },
    { name: 'New York City, New York', emoji: '🗽', desc: 'Fifth Avenue & designer boutiques' },
    { name: 'Seoul, South Korea', emoji: '🇰🇷', desc: 'K-fashion & beauty shopping paradise' },
  ],
  adventure: [
    { name: 'Queenstown, New Zealand', emoji: '🪂', desc: 'Bungee jumping & skydiving' },
    { name: 'Costa Rica', emoji: '🌿', desc: 'Zip-lining & rainforest adventures' },
    { name: 'Reykjavik, Iceland', emoji: '🌋', desc: 'Northern lights & glacier hikes' },
    { name: 'Interlaken, Switzerland', emoji: '🏔️', desc: 'Extreme sports in the Alps' },
  ],
  relaxation: [
    { name: 'Bali, Indonesia', emoji: '🧘', desc: 'Wellness retreats & rice terraces' },
    { name: 'Santorini, Greece', emoji: '🏛️', desc: 'Cliffside sunsets & thermal springs' },
    { name: 'Maldives', emoji: '🐠', desc: 'Overwater bungalows & turquoise lagoons' },
    { name: 'Sedona, Arizona', emoji: '🌅', desc: 'Red rock vortexes & spa retreats' },
  ],
};

const activities = [
  { id: 'beach', label: 'Beach & Sun', emoji: '🏖️' },
  { id: 'hiking', label: 'Hiking & Nature', emoji: '🏔️' },
  { id: 'food', label: 'Food & Dining', emoji: '🍜' },
  { id: 'nightlife', label: 'Nightlife', emoji: '🌙' },
  { id: 'culture', label: 'Culture & Art', emoji: '🎨' },
  { id: 'shopping', label: 'Shopping', emoji: '🛍️' },
  { id: 'adventure', label: 'Adventure', emoji: '🪂' },
  { id: 'relaxation', label: 'Relaxation', emoji: '🧘' },
];

type WizardStep = 'mode' | 'destination-input' | 'activity-select' | 'destination-recommendations';

const TripWizard = ({ onDestinationSelected }: TripWizardProps) => {
  const [step, setStep] = useState<WizardStep>('mode');
  const [destinationInput, setDestinationInput] = useState('');
  const [selectedActivity, setSelectedActivity] = useState('');

  const handleActivitySelect = (activityId: string) => {
    setSelectedActivity(activityId);
    setStep('destination-recommendations');
  };

  const handleDestinationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (destinationInput.trim()) {
      onDestinationSelected(destinationInput.trim());
    }
  };

  return (
    <div className="tt-wizard">
      {step === 'mode' && (
        <div className="tt-wizard-mode">
          <div className="tt-wizard-header">
            <h2 className="tt-wizard-title">Let's plan your trip ✈️</h2>
            <p className="tt-wizard-subtitle">How would you like to start?</p>
          </div>
          <div className="tt-wizard-mode-cards">
            <button className="tt-wizard-mode-card" onClick={() => setStep('destination-input')}>
              <div className="tt-wizard-mode-card-icon">🗺️</div>
              <h3 className="tt-wizard-mode-card-title">I know where I want to go</h3>
              <p className="tt-wizard-mode-card-desc">Search a specific city or destination and we'll find things to do, hotels, flights and more.</p>
              <span className="tt-wizard-mode-card-cta">Enter destination →</span>
            </button>
            <button className="tt-wizard-mode-card" onClick={() => setStep('activity-select')}>
              <div className="tt-wizard-mode-card-icon">🎯</div>
              <h3 className="tt-wizard-mode-card-title">I know what I want to do</h3>
              <p className="tt-wizard-mode-card-desc">Tell us what kind of experience you're after and we'll recommend the perfect destinations.</p>
              <span className="tt-wizard-mode-card-cta">Pick an activity →</span>
            </button>
          </div>
        </div>
      )}

      {step === 'destination-input' && (
        <div className="tt-wizard-step">
          <button className="tt-wizard-back" onClick={() => setStep('mode')}>← Back</button>
          <div className="tt-wizard-header">
            <h2 className="tt-wizard-title">Where to? 🗺️</h2>
            <p className="tt-wizard-subtitle">Enter a city, country, or landmark</p>
          </div>
          <form className="tt-wizard-input-form" onSubmit={handleDestinationSubmit}>
            <div className="tt-wizard-input-wrap">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--tt-subtle)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              <input
                type="text"
                className="tt-wizard-input"
                placeholder="e.g. Paris, Tokyo, New York..."
                value={destinationInput}
                onChange={e => setDestinationInput(e.target.value)}
                autoFocus
              />
            </div>
            <button type="submit" className="tt-wizard-submit" disabled={!destinationInput.trim()}>
              Let's go →
            </button>
          </form>
          <div className="tt-wizard-suggestions">
            <p className="tt-wizard-suggestions-label">Popular destinations</p>
            <div className="tt-wizard-suggestion-chips">
              {['Paris', 'Tokyo', 'New York', 'Bali', 'Rome', 'London', 'Bangkok', 'Dubai'].map(city => (
                <button key={city} className="tt-search-suggestion-chip" onClick={() => onDestinationSelected(city)}>{city}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 'activity-select' && (
        <div className="tt-wizard-step">
          <button className="tt-wizard-back" onClick={() => setStep('mode')}>← Back</button>
          <div className="tt-wizard-header">
            <h2 className="tt-wizard-title">What's your vibe? 🎯</h2>
            <p className="tt-wizard-subtitle">Pick the experience you're after and we'll find your perfect destination</p>
          </div>
          <div className="tt-wizard-activity-grid">
            {activities.map(activity => (
              <button key={activity.id} className="tt-wizard-activity-card" onClick={() => handleActivitySelect(activity.id)}>
                <span className="tt-wizard-activity-emoji">{activity.emoji}</span>
                <span className="tt-wizard-activity-label">{activity.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'destination-recommendations' && selectedActivity && (
        <div className="tt-wizard-step">
          <button className="tt-wizard-back" onClick={() => setStep('activity-select')}>← Back</button>
          <div className="tt-wizard-header">
            <h2 className="tt-wizard-title">Perfect picks for you {activities.find(a => a.id === selectedActivity)?.emoji}</h2>
            <p className="tt-wizard-subtitle">Based on your interest in {activities.find(a => a.id === selectedActivity)?.label.toLowerCase()}</p>
          </div>
          <div className="tt-wizard-recs-grid">
            {(activityDestinations[selectedActivity] || []).map(dest => (
              <button key={dest.name} className="tt-wizard-rec-card" onClick={() => onDestinationSelected(dest.name)}>
                <div className="tt-wizard-rec-emoji">{dest.emoji}</div>
                <div className="tt-wizard-rec-info">
                  <h4 className="tt-wizard-rec-name">{dest.name}</h4>
                  <p className="tt-wizard-rec-desc">{dest.desc}</p>
                </div>
                <span className="tt-wizard-rec-arrow">→</span>
              </button>
            ))}
          </div>
          <div className="tt-wizard-or"><span>or</span></div>
          <button className="tt-wizard-manual-btn" onClick={() => setStep('destination-input')}>
            Enter a different destination
          </button>
        </div>
      )}
    </div>
  );
};

export default TripWizard;