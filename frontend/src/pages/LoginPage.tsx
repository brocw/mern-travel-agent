import { useState } from "react";
import Login from "../components/Login";
import triptasticLogo from "../assets/triptastic-logo.png";
import heroBg from "../assets/hero-bg.png";

const SANTORINI =
  "https://images.unsplash.com/photo-1601581875309-fafbf2d3ed3a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=95&w=1200";
const BALI =
  "https://images.unsplash.com/photo-1555400038-63f5ba517a47?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=95&w=1200";
const PARIS =
  "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=95&w=1200";

const quickActivities = [
  { label: "Beaches", emoji: "🏖️" },
  { label: "Hiking", emoji: "🏔️" },
  { label: "Food Tours", emoji: "🍜" },
  { label: "Nightlife", emoji: "🌙" },
  { label: "Museums", emoji: "🏛️" },
  { label: "World Wonders", emoji: "🌍" },
];

const featured = [
  { name: "Santorini, Greece", img: SANTORINI, rating: 4.9, tag: "Romantic" },
  { name: "Bali, Indonesia", img: BALI, rating: 4.8, tag: "Adventure" },
  { name: "Paris, France", img: PARIS, rating: 4.9, tag: "Culture" },
];

const features = [
  {
    emoji: "✈️",
    title: "All-in-One Planner",
    desc: "Flights, hotels, and activities — all in one place.",
    color: "#2196A6",
  },
  {
    emoji: "⚡",
    title: "Instant Itineraries",
    desc: "Build day-by-day plans in seconds with smart suggestions.",
    color: "#F4845F",
  },
  {
    emoji: "🛡️",
    title: "Travel with Confidence",
    desc: "Real-time alerts and reservation backup at your fingertips.",
    color: "#5B8A5E",
  },
];

const LoginPage = () => {
  const [showLogin, setShowLogin] = useState(false);

  return (
    <div className="th-landing">
      {/* ── Navbar ── */}
      <header className="th-landing-nav">
        <div className="th-landing-nav-logo">
          <span className="th-landing-nav-brand-text">
            <span className="th-landing-nav-brand-trip">Trip</span>
            <span className="th-landing-nav-brand-tastic">tastic!</span>
          </span>
        </div>
        <div className="th-landing-nav-links">
          <a href="/search" className="th-landing-nav-link">Explore</a>
          <a href="/trips" className="th-landing-nav-link">My Trips</a>
          <button className="th-landing-nav-signin" onClick={() => setShowLogin(true)}>
            Sign In
          </button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="th-hero">
        <img src={heroBg} alt="Travel" className="th-hero-bg" />
        <div className="th-hero-overlay" />

        <div className="th-hero-content">
          <div className="th-hero-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B0ACD7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            Your digital travel agent
          </div>

          <h1 className="th-hero-title">
            Stop planning<br />
            <span style={{ color: "#5D83A8" }}>Start going</span>
          </h1>

          <p className="th-hero-subtitle">
            Discover destinations, build itineraries, and travel smarter — all in one place.
          </p>

          {/* Search bar */}
          <form className="th-hero-search" onSubmit={(e) => { e.preventDefault(); setShowLogin(true); }}>
            <div className="th-hero-search-input-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4A5568" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input type="text" className="th-hero-search-input" placeholder="Search destinations, activities, cities..." />
            </div>
            <button type="submit" className="th-hero-search-btn">
              Search
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>
          </form>

          {/* Quick filters */}
          <div className="th-hero-filters">
            {quickActivities.map(({ label, emoji }) => (
              <button key={label} className="th-hero-filter-chip" onClick={() => setShowLogin(true)}>
                <span>{emoji}</span> {label}
              </button>
            ))}
          </div>

          {/* CTAs */}
          <div className="th-hero-ctas">
            <button className="th-hero-cta-primary" onClick={() => setShowLogin(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              Explore Trips
            </button>
            <button className="th-hero-cta-secondary" onClick={() => setShowLogin(true)}>
              Start Planning
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="th-hero-scroll">
          <span>Scroll to explore</span>
          <div className="th-hero-scroll-mouse">
            <div className="th-hero-scroll-dot" />
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="th-features">
        <div className="th-section-inner">
          <div className="th-section-header">
            <h2 className="th-section-title">Trip smarter, not harder</h2>
            <p className="th-section-sub">Everything you need for the perfect trip, all in one app.</p>
          </div>
          <div className="th-features-grid">
            {features.map(({ emoji, title, desc, color }) => (
              <div key={title} className="th-feature-card">
                <div className="th-feature-icon" style={{ background: `${color}18` }}>
                  <span style={{ fontSize: "1.4rem" }}>{emoji}</span>
                </div>
                <h3 className="th-feature-title">{title}</h3>
                <p className="th-feature-desc">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Destinations ── */}
      <section className="th-destinations">
        <div className="th-section-inner">
          <div className="th-destinations-header">
            <div>
              <h2 className="th-section-title">Featured Destinations</h2>
              <p className="th-section-sub" style={{ marginTop: "0.25rem" }}>
                Hand-picked for unforgettable experiences
              </p>
            </div>
            <button className="th-destinations-viewall" onClick={() => setShowLogin(true)}>
              View all
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
          <div className="th-destinations-grid">
            {featured.map(({ name, img, rating, tag }) => (
              <button key={name} className="th-destination-card" onClick={() => setShowLogin(true)}>
                <img src={img} alt={name} className="th-destination-img" />
                <div className="th-destination-overlay" />
                <div className="th-destination-tag">{tag}</div>
                <div className="th-destination-info">
                  <p className="th-destination-name">{name}</p>
                  <div className="th-destination-rating">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#B0ACD7" stroke="#B0ACD7" strokeWidth="1">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                    <span>{rating}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="th-cta-banner">
        <div className="th-section-inner">
          <div className="th-cta-inner">
            <div className="th-cta-glow" />
            <h2 className="th-cta-title">Ready for your next adventure?</h2>
            <p className="th-cta-sub">
              Join thousands of travelers who plan smarter with Triptastic.
            </p>
            <button className="th-cta-btn" onClick={() => setShowLogin(true)}>
              Get Started Free
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="th-footer">
        © 2026 Triptastic · Built for explorers everywhere
      </footer>

      {/* ── Login Modal ── */}
      {showLogin && <Login onClose={() => setShowLogin(false)} />}
    </div>
  );
};

export default LoginPage;