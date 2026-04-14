import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { buildPath } from "../components/Path";

function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState("Verifying your email...");
  const [success, setSuccess] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = searchParams.get("token");
    const successParam = searchParams.get("success");

    if (successParam === "true") { setSuccess(true); setMessage("Email verified! You can now sign in."); setChecked(true); return; }
    if (successParam === "false") { setMessage("Verification failed. The link may have expired."); setChecked(true); return; }

    if (token) {
      fetch(buildPath(`api/verifyEmail?token=${token}`), { method: "POST" })
        .then(response => {
          const url = new URL(response.url);
          if (url.searchParams.get("success") === "true") { setSuccess(true); setMessage("Email verified! You can now sign in."); }
          else setMessage("Verification failed. The link may have expired.");
        })
        .catch(() => setMessage("An error occurred. Please try again."))
        .finally(() => setChecked(true));
    } else {
      setChecked(true);
    }
  }, [searchParams]);

  return (
    <div className="tt-verify-page">
      <div className="tt-verify-card">
        <a href="/" className="tt-verify-brand">
          <span className="tt-search-nav-brand-trip">Trip</span>
          <span className="tt-search-nav-brand-tastic">tastic!</span>
        </a>

        <div className="tt-verify-icon">
          {!checked ? '⏳' : success ? '✅' : '❌'}
        </div>

        <h2 className="tt-verify-title">
          {!checked ? 'Verifying...' : success ? 'Email Verified!' : 'Verification Failed'}
        </h2>
        <p className="tt-verify-message">{message}</p>

        {checked && (
          <button className="tt-verify-btn" onClick={() => window.location.href = "/"}>
            {success ? 'Go to Sign In' : 'Back to Home'}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export default VerifyEmailPage;