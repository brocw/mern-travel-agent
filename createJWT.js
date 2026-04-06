const jwt = require("jsonwebtoken");
require("dotenv").config();

exports.createToken = function (fn, ln, id) {
  return _createToken(fn, ln, id);
};

const _createToken = function (fn, ln, id) {
  try {
    const user = { userId: id, firstName: fn, lastName: ln };
    const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET);
    return { accessToken };
  } catch (e) {
    return { error: e.message };
  }
};

exports.isExpired = function (token) {
  try {
    if (!token || typeof token !== "string") return true;
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    return false;
  } catch (err) {
    console.log("Token verification error:", err.message);
    return true;
  }
};

exports.refresh = function (token) {
  try {
    if (!token || typeof token !== "string") {
      console.log("Token refresh error: No valid token provided");
      return "";
    }

    const decoded = jwt.decode(token);
    if (!decoded) {
      console.log("Token refresh error: Invalid token structure");
      return "";
    }

    const userId = decoded.userId;
    const firstName = decoded.firstName;
    const lastName = decoded.lastName;

    const refreshed = _createToken(firstName, lastName, userId);
    return refreshed.accessToken || "";
  } catch (e) {
    console.log("Token refresh error:", e.message);
    return "";
  }
};