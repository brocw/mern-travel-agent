import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

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
      // Redirect directly to backend which will redirect back here with success param
      if (process.env.NODE_ENV != 'development') {
        window.location.href = `http://cop-4331-22.com/verifyEmail?token=${token}`;
      } else {
        window.location.href = `http://localhost:5000/verifyEmail?token=${token}`;
      }
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
