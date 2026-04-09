import React, { useState } from "react";
import { buildPath } from "./Path";
import { storeToken } from "../tokenStorage";
import { jwtDecode } from "jwt-decode";
import type { JwtPayload } from "jwt-decode";
import triptasticLogo from "../assets/triptastic-logo.png";

interface MyJwtPayload extends JwtPayload {
  firstName: string;
  lastName: string;
  userId: number;
}

interface LoginProps {
  onClose?: () => void;
}

function Login({ onClose }: LoginProps) {
  const [message, setMessage] = useState("");
  const [loginName, setLoginName] = React.useState("");
  const [loginPassword, setPassword] = React.useState("");
  const [loading, setLoading] = useState(false);

  async function doLogin(event: any): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    var obj = { login: loginName, password: loginPassword };
    var js = JSON.stringify(obj);

    try {
      const response = await fetch(buildPath("api/login"), {
        method: "POST",
        body: js,
        headers: { "Content-Type": "application/json" },
      });

      var res = JSON.parse(await response.text());

      if (res.error && res.error.length > 0) {
        setMessage(res.error);
        setLoading(false);
        return;
      }

      const { accessToken } = res;
      storeToken(res);

      const decoded = jwtDecode(accessToken) as MyJwtPayload;

      try {
        var ud = decoded;
        var userId = ud.userId;
        var firstName = ud.firstName;
        var lastName = ud.lastName;

        if (!userId || userId <= 0) {
          setMessage("User/Password combination incorrect.");
          setLoading(false);
        } else {
          var user = { firstName: firstName, lastName: lastName, id: userId };
          localStorage.setItem("user_data", JSON.stringify(user));
          window.location.href = "/search";
        }
      } catch (e) {
        console.log(e);
        setLoading(false);
      }
    } catch (error: any) {
      setMessage("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="th-login-modal-overlay" onClick={onClose}>
      <div className="th-login-modal" onClick={(e) => e.stopPropagation()}>

        {/* Close button */}
        {onClose && (
          <button className="th-login-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        )}

        {/* Header */}
        <div className="th-login-header">
          <img src={triptasticLogo} alt="Triptastic" className="th-login-logo-img" />
          <h2 className="th-login-title">Welcome back!</h2>
          <p className="th-login-subtitle">Sign in to continue your journey</p>
        </div>

        {/* Form */}
        <form onSubmit={doLogin} className="th-login-form">
          <div className="th-login-field">
            <label className="th-login-label">Username</label>
            <div className="th-login-input-wrap">
              <svg className="th-login-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              <input
                type="text"
                className="th-login-input"
                placeholder="Enter your username"
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="th-login-field">
            <label className="th-login-label">Password</label>
            <div className="th-login-input-wrap">
              <svg className="th-login-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input
                type="password"
                className="th-login-input"
                placeholder="Enter your password"
                value={loginPassword}
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
                Signing in...
              </span>
            ) : (
              <>
                Sign In
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </>
            )}
          </button>
        </form>

        <div className="th-login-divider">
          <span>New to Triptastic?</span>
        </div>

        <button
          className="th-login-register-btn"
          onClick={() => (window.location.href = "/register")}
          type="button"
        >
          Create an account
        </button>
      </div>
    </div>
  );
}

export default Login;