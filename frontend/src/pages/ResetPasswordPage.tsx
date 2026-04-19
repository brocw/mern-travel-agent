import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { buildPath } from "../components/Path";

function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const token = searchParams.get("token");

  async function handleSubmit(event: any) {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(buildPath("api/resetPassword"), {
        method: "POST",
        body: JSON.stringify({ token, newPassword }),
        headers: { "Content-Type": "application/json" },
      });

      const res = JSON.parse(await response.text());

      if (res.error) {
        setMessage(res.error);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        window.location.href = "/";
      }, 3000);

    } catch (error: any) {
      setMessage("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="th-login-modal-overlay">
        <div className="th-login-modal">
          <div className="th-login-header">
            <h2 className="th-login-title">Invalid Link</h2>
            <p className="th-login-subtitle">This reset link is invalid or has expired.</p>
          </div>
          <button
            className="th-login-btn"
            onClick={() => window.location.href = "/forgot-password"}
          >
            Request a new link
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="th-login-modal-overlay">
      <div className="th-login-modal" onClick={(e) => e.stopPropagation()}>

        <div className="th-login-header">
          <h2 className="th-login-title">Reset Password</h2>
          <p className="th-login-subtitle">Enter your new password below</p>
        </div>

        {success ? (
          <div className="tt-register-success">
            <div className="tt-register-success-icon">✓</div>
            <h3>Password Reset!</h3>
            <p>Your password has been updated. Redirecting you to sign in...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="th-login-form">
            <div className="th-login-field">
              <label className="th-login-label">New Password</label>
              <div className="th-login-input-wrap">
                <svg className="th-login-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  type="password"
                  className="th-login-input"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="th-login-field">
              <label className="th-login-label">Confirm Password</label>
              <div className="th-login-input-wrap">
                <svg className="th-login-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  type="password"
                  className="th-login-input"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                  Resetting...
                </span>
              ) : (
                <>
                  Reset Password
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default ResetPasswordPage;