const sgMail = require("@sendgrid/mail");
const jwt = require("jsonwebtoken");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

exports.sendPasswordResetEmail = async function (email, userId) {
  const token = jwt.sign(
    { userId: userId },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "1h" }
  );

  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;

  const msg = {
    to: email,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject: "Reset Your Password - TripTastic",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Reset Your Password</h2>
        <p>We received a request to reset your TripTastic password.</p>
        <p>Click the button below to reset it. This link expires in <strong>1 hour</strong>.</p>
        <a href="${resetUrl}" style="
          display: inline-block;
          background-color: #4CAF50;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
        ">Reset Password</a>
        <p>Or copy and paste this link into your browser:</p>
        <p style="color: #666; word-break: break-all;">${resetUrl}</p>
        <p>If you did not request a password reset, please ignore this email.</p>
      </div>
    `,
  };

  await sgMail.send(msg);
  return token;
};