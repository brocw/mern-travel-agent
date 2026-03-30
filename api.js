require("express");
require("mongodb");

exports.setApp = function (app, client) {
  app.post("/api/addCard", async (req, res, next) => {
    // incoming: userId, color
    // outgoing: error
    var token = require("./createJWT.js");
    const { userId, card, jwtToken } = req.body;

    try {
      if (token.isExpired(jwtToken)) {
        var r = { error: "The JWT is not longer valid.", jwtToken: "" };
        res.status(200).json(r);
        return;
      }
    } catch (e) {
      console.log(e.message);
    }

    const newCard = { Card: card, UserId: userId };
    var error = "";

    try {
      const db = client.db("COP4331Cards");
      const result = db.collection("Cards").insertOne(newCard);
    } catch (e) {
      error = e.toString();
    }

    var refreshedToken = null;
    try {
      refreshedToken = token.refresh(jwtToken);
    } catch (e) {
      console.log(e.message);
    }

    var ret = { error: error, jwtToken: refreshedToken };
    res.status(200).json(ret);
  });

  app.post("/api/register", async (req, res, next) => {
    // incoming: firstName, lastName, login, email, password
    // outgoing: id, firstName, lastName, error, accessToken

    var error = "";

    console.log(req.body);

    const { firstName, lastName, login, email, password } = req.body;

    const db = client.db("COP4331Cards");

    // Check if user already exists
    const existingUser = await db
      .collection("Users")
      .findOne({ Login: login });

    if (existingUser) {
      res.status(200).json({ error: "Username already exists." });
      return;
    }

    const existingEmail = await db
      .collection("Users")
      .findOne({ Email: email });

    if (existingEmail) {
      res.status(200).json({ error: "Email already exists." });
      return;
    }

    try {
      // Get the next userId
      const userCount = await db.collection("Users").countDocuments();
      const newUserId = userCount + 1;

      const newUser = {
        UserId: newUserId,
        FirstName: firstName,
        LastName: lastName,
        Login: login,
        Email: email,
        Password: password,
      };

      await db.collection("Users").insertOne(newUser);

      const token = require("./createJWT.js");
      const ret = token.createToken(firstName, lastName, newUserId);
      res.status(200).json(ret);
    } catch (e) {
      res.status(200).json({ error: e.message });
    }
  });

  app.post("/api/login", async (req, res, next) => {
    // incoming: login, password
    // outgoing: id, firstName, lastName, error

    var error = "";

    console.log(req.body);

    const { login, password } = req.body;

    const db = client.db("COP4331Cards");
    const results = await db
      .collection("Users")
      .find({ Login: login, Password: password })
      .toArray();

    var id = -1;
    var fn = "";
    var ln = "";

    var ret;

    if (results.length > 0) {
      // console.log(results);
      id = results[0].UserId;
      fn = results[0].FirstName;
      ln = results[0].LastName;

      try {
        const token = require("./createJWT.js");
        ret = token.createToken(fn, ln, id);
      } catch (e) {
        ret = { error: e.message };
      }
    } else {
      ret = { error: "Login/Password incorrect." };
    }

    res.status(200).json(ret);
  });

  app.post("/api/searchCards", async (req, res, next) => {
    // incoming: userId, search
    // outgoing: results[], error
    var token = require("./createJWT.js");
    var error = "";

    const { userId, search, jwtToken } = req.body;
    try {
      if (token.isExpired(jwtToken)) {
        var r = { error: "The JWT is no longer valid.", jwtToken: "" };
        res.status(200).json(r);
        return;
      }
    } catch (e) {
      console.log(e.message);
    }

    var _search = search.trim();

    const db = client.db("COP4331Cards");
    const results = await db
      .collection("Cards")
      .find({ Card: { $regex: _search + ".*", $options: "i" } })
      .toArray();

    var _ret = [];
    for (var i = 0; i < results.length; i++) {
      _ret.push(results[i].Card);
    }

    var refreshedToken = null;
    try {
      refreshedToken = token.refresh(jwtToken);
    } catch (e) {
      console.log(e.message);
    }

    var ret = { results: _ret, error: error, jwtToken: refreshedToken };
    res.status(200).json(ret);
  });
};
