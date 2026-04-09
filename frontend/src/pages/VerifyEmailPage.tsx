import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { buildPath } from "../components/Path";

function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState("Verifying your email...");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const token = searchParams.get("token");
    const successParam = searchParams.get("success");

    if (successParam === "true") {
      setSuccess(true);
      setMessage("Email verified successfully! You can now log in.");
      return;
    }

    if (successParam === "false") {
      setMessage("Verification failed. The link may have expired. Please register again.");
      return;
    }

    if (token) {
      fetch(buildPath(`api/verifyEmail?token=${token}`), { method: "POST" })
        .then((response) => {
          const url = new URL(response.url);
          const result = url.searchParams.get("success");
          if (result === "true") {
            setSuccess(true);
            setMessage("Email verified successfully! You can now log in.");
          } else {
            setMessage("Verification failed. The link may have expired. Please register again.");
          }
        })
        .catch(() => {
          setMessage("An error occurred during verification. Please try again.");
        });
    }
  }, [searchParams]);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      fontFamily: "Arial, sans-serif",
      backgroundColor: "#1a1a1a",
      color: "white"
    }}>
      <h1>TripTastic</h1>
      <div style={{
        backgroundColor: "#2a2a2a",
        padding: "40px",
        borderRadius: "10px",
        textAlign: "center",
        maxWidth: "500px"
      }}>
        <h2>{success ? "✅ Email Verified!" : "📧 Email Verification"}</h2>
        <p>{message}</p>
        {success && (
          <button
            onClick={() => window.location.href = "/"}
            style={{
              backgroundColor: "#4CAF50",
              color: "white",
              padding: "12px 24px",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              fontSize: "16px",
              marginTop: "20px"
            }}
          >
            Go to Login
          </button>
        )}
      </div>
    </div>
  );
}

export default VerifyEmailPage;
