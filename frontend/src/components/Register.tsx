import { useState } from "react";
import { buildPath } from "./Path";
import triptasticLogo from "../assets/triptastic-logo.png";

function Register() {
  const [message, setMessage] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function doRegister(event: any): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    var obj = {
      firstName: firstName,
      lastName: lastName,
      login: username,
      email: email,
      password: password,
    };

    try {
      const response = await fetch(buildPath("api/register"), {
        method: "POST",
        body: JSON.stringify(obj),
        headers: { "Content-Type": "application/json" },
      });

      var res = JSON.parse(await response.text());

      if (res.error) {
        setMessage(res.error);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => { window.location.href = "/"; }, 3000);

    } catch (error: any) {
      setMessage("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="tt-register-card">

      {/* Close button */}
      <button className="th-login-close" onClick={() => window.location.href = "/"} aria-label="Back">
        ×
      </button>

      {/* Logo + header */}
      <div className="th-login-header">
        <img src={triptasticLogo} alt="Triptastic" className="tt-register-logo-img" />
        <h2 className="th-login-title">Create your account</h2>
        <p className="th-login-subtitle">Join thousands of travelers on Triptastic</p>
      </div>

      {success ? (
        <div className="tt-register-success">
          <div className="tt-register-success-icon">✓</div>
          <h3>You're in!</h3>
          <p>Check your email to verify your account. Redirecting you to sign in...</p>
        </div>
      ) : (
        <form onSubmit={doRegister} className="th-login-form">

          {/* First Name */}
          <div className="th-login-field">
            <label className="th-login-label">First Name</label>
            <div className="th-login-input-wrap">
              <svg className="th-login-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              <input
                type="text"
                className="th-login-input"
                placeholder="Enter your first name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Last Name */}
          <div className="th-login-field">
            <label className="th-login-label">Last Name</label>
            <div className="th-login-input-wrap">
              <svg className="th-login-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              <input
                type="text"
                className="th-login-input"
                placeholder="Enter your last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Username */}
          <div className="th-login-field">
            <label className="th-login-label">Username</label>
            <div className="th-login-input-wrap">
              <svg className="th-login-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              <input
                type="text"
                className="th-login-input"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Email */}
          <div className="th-login-field">
            <label className="th-login-label">Email</label>
            <div className="th-login-input-wrap">
              <svg className="th-login-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
              </svg>
              <input
                type="email"
                className="th-login-input"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="th-login-field">
            <label className="th-login-label">Password</label>
            <div className="th-login-input-wrap">
              <svg className="th-login-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input
                type="password"
                className="th-login-input"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {message && (
            <div className="th-login-error">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {message}
            </div>
          )}

          <button type="submit" className="th-login-btn" disabled={loading}>
            {loading ? (
              <span className="th-login-btn-loading">
                <span className="th-login-spinner" />
                Creating account...
              </span>
            ) : (
              <>
                Create Account
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </>
            )}
          </button>
        </form>
      )}

      <div className="th-login-divider">
        <span>Already have an account?</span>
      </div>

      <button
        className="th-login-register-btn"
        onClick={() => window.location.href = "/"}
        type="button"
      >
        Sign In
      </button>
    </div>
  );
}

export default Register;