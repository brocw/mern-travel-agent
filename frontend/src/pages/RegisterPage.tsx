import Register from "../components/Register";
import heroBg from "../assets/hero-bg.png";
// import triptasticLogo from "../assets/triptastic-logo.png";

const RegisterPage = () => {
  return (
    <div className="tt-register-page">
      {/* Hero background */}
      <img src={heroBg} alt="Travel" className="tt-register-bg" />
      <div className="tt-register-overlay" />

      {/* Top nav */}
      <header className="th-landing-nav">
        <div className="th-landing-nav-logo">
          <span className="th-landing-nav-brand-text">
            <span className="th-landing-nav-brand-trip">Trip</span>
            <span className="th-landing-nav-brand-tastic">tastic!</span>
          </span>
        </div>
      </header>

      {/* Centered card */}
      <div className="tt-register-center">
        <Register />
      </div>

      {/* Footer */}
      <div className="tt-register-footer">
        © 2026 Triptastic · Built for explorers everywhere
      </div>
    </div>
  );
};

export default RegisterPage;
