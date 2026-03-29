const jwt = require("jsonwebtoken");
require("dotenv").config();

exports.createToken = function (fn, ln, id) {
  return _createToken(fn, ln, id);
};

_createToken = function (fn, ln, id) {
  try {
    const expiration = new Date();
    const user = { userId: id, firstName: fn, lastName: ln };

    console.log(process.env.ACCESS_TOKEN_SECRET);

    // Uses the default value - see MERN C for further values
    const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET);

    var ret = { accessToken: accessToken };
  } catch (e) {
    var ret = { error: e.message };
  }

  return ret;
};

exports.isExpired = function (token) {
  try {
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    return false; // Token is valid
  } catch (err) {
    console.log("Token verification error:", err.message);
    return true; // Token is expired or invalid
  }
};

exports.refresh = function (token) {
  try {
    if (!token) {
      console.log('Token refresh error: No token provided');
      return { error: 'No token provided' };
    }
    var ud = jwt.decode(token, { complete: true });
    if (!ud || !ud.payload) {
      console.log('Token refresh error: Invalid token structure');
      return { error: 'Invalid token structure' };
    }
    var userId = ud.payload.userId;
    var firstName = ud.payload.firstName;
    var lastName = ud.payload.lastName;
    return _createToken(firstName, lastName, userId);
  } catch (e) {
    console.log('Token refresh error:', e.message);
    return { error: 'Token refresh failed: ' + e.message };
  }
};
