import { useState } from "react";
import { buildPath } from "../components/Path";

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: any) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(buildPath("api/forgotPassword"), {
        method: "POST",
        body: JSON.stringify({ email }),
        headers: { "Content-Type": "application/json" },
      });

      const res = JSON.parse(await response.text());

      if (res.error) {
        setMessage(res.error);
        setLoading(false);
        return;
      }

      setSubmitted(true);
    } catch (error: any) {
      setMessage("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="th-login-modal-overlay">
      <div className="th-login-modal" onClick={(e) => e.stopPropagation()}>

        <button
          className="th-login-close"
          onClick={() => window.location.href = "/"}
          aria-label="Back"
        >
          ×
        </button>

        <div className="th-login-header">
          <h2 className="th-login-title">Forgot Password?</h2>
          <p className="th-login-subtitle">
            Enter your email and we'll send you a reset link
          </p>
        </div>

        {submitted ? (
          <div className="tt-register-success">
            <div className="tt-register-success-icon">✓</div>
            <h3>Check your email!</h3>
            <p>If that email is registered, you'll receive a password reset link shortly.</p>
            <button
              className="th-login-btn"
              onClick={() => window.location.href = "/"}
              style={{ marginTop: "20px" }}
            >
              Back to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="th-login-form">
            <div className="th-login-field">
              <label className="th-login-label">Email Address</label>
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
                  Sending...
                </span>
              ) : (
                <>
                  Send Reset Link
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </>
              )}
            </button>
          </form>
        )}

        <div className="th-login-divider">
          <span>Remember your password?</span>
        </div>

        <button
          className="th-login-register-btn"
          onClick={() => window.location.href = "/"}
          type="button"
        >
          Back to Sign In
        </button>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;