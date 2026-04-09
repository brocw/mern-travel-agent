const sgMail = require("@sendgrid/mail");
const jwt = require("jsonwebtoken");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

exports.sendVerificationEmail = async function (email, userId) {

  const token = jwt.sign(
    { userId: userId },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "1d" }
  );

  const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`;

  const msg = {
    to: email,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject: "Verify Your Email - Travel Planner",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to Travel Planner!</h2>
        <p>Thanks for registering. Please verify your email by clicking the button below:</p>
        <a href="${verifyUrl}" style="
          display: inline-block;
          background-color: #4CAF50;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
        ">Verify Email</a>
        <p>Or copy and paste this link into your browser:</p>
        <p style="color: #666; word-break: break-all;">${verifyUrl}</p>
        <p>This link expires in 24 hours.</p>
        <p>If you did not register, please ignore this email.</p>
      </div>
    `,
  };

  await sgMail.send(msg);
  return token;
};