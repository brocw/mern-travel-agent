import { useEffect, useState } from 'react';

interface User {
  firstName: string;
  lastName: string;
  id: number;
}

const AccountPage = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user_data');
    if (!userData) {
      window.location.href = '/';
      return;
    }
    setUser(JSON.parse(userData));
  }, []);

  const doLogout = () => {
    localStorage.removeItem('user_data');
    localStorage.removeItem('token_data');
    window.location.href = '/';
  };

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : '?';

  return (
    <div className="tt-account-page">

      {/* ── Navbar ── */}
      <nav className="tt-trips-nav">
        <div className="tt-trips-nav-inner">
          <a href="/account" className="tt-trips-nav-brand">
            <span style={{ color: 'var(--tt-navy)', fontWeight: 900, fontSize: '1.4rem', letterSpacing: '-0.03em' }}>
              Trip<span style={{ color: 'var(--tt-steel)' }}>tastic!</span>
            </span>
          </a>
          <div className="tt-trips-nav-links">
            <a href="/search" className="tt-trips-nav-link">🔍 Explore</a>
            <a href="/trips" className="tt-trips-nav-link">🗺️ My Trips</a>
            <a href="/account" className="tt-trips-nav-link active">👤 Account</a>
          </div>
          <div className="tt-trips-nav-right">
            <span className="tt-trips-nav-user">
              👤 {user?.firstName} {user?.lastName}
            </span>
            <button className="tt-trips-nav-logout" onClick={doLogout}>
              Log Out
            </button>
          </div>
        </div>
      </nav>

      {/* ── Page Content ── */}
      <div className="tt-account-content">

        {/* Welcome Hero */}
        <div className="tt-account-hero">
          <div className="tt-account-avatar">{initials}</div>
          <div className="tt-account-hero-text">
            <h1 className="tt-account-welcome">
              Welcome back, {user?.firstName}! 👋
            </h1>
            <p className="tt-account-welcome-sub">
              Ready for your next adventure? Pick up where you left off.
            </p>
          </div>
        </div>

        {/* Navigation Cards */}
        <div className="tt-account-cards">

          {/* My Trips Card */}
          <a href="/trips" className="tt-account-card tt-account-card--trips">
            <div className="tt-account-card-icon">🗺️</div>
            <div className="tt-account-card-body">
              <h2 className="tt-account-card-title">My Trips</h2>
              <p className="tt-account-card-desc">
                View and manage all your saved itineraries, places, flights, and hotels.
              </p>
            </div>
            <div className="tt-account-card-arrow">→</div>
          </a>

          {/* Build My Trip Card */}
          <a href="/search" className="tt-account-card tt-account-card--wizard">
            <div className="tt-account-card-icon">✈️</div>
            <div className="tt-account-card-body">
              <h2 className="tt-account-card-title">Build My Trip</h2>
              <p className="tt-account-card-desc">
                Plan a new adventure with our trip wizard — destinations, activities, flights and more.
              </p>
            </div>
            <div className="tt-account-card-arrow">→</div>
          </a>

        </div>

        {/* Quick Actions */}
        <div className="tt-account-quick">
          <h3 className="tt-account-quick-title">Quick Actions</h3>
          <div className="tt-account-quick-grid">
            <a href="/search" className="tt-account-quick-btn">
              <span>🔍</span> Explore Destinations
            </a>
            <a href="/trips" className="tt-account-quick-btn">
              <span>📋</span> View Saved Trips
            </a>
            <button className="tt-account-quick-btn tt-account-quick-btn--logout" onClick={doLogout}>
              <span>🚪</span> Sign Out
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AccountPage;