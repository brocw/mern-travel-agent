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

  app.post("/api/searchLocation", async (req, res, next) => {
    // incoming: search, jwtToken
    // outgoing: lat, lng, name, error, jwtToken
    var token = require("./createJWT.js");
    var error = "";

    const { search, jwtToken } = req.body;
    try {
      if (token.isExpired(jwtToken)) {
        var r = { error: "The JWT is not longer valid.", jwtToken: "" };
        res.status(200).json(r);
        return;
      }
    } catch (e) {
      console.log(e.message);
    }

    // Mock data for common cities (for testing without needing API key)
    const mockLocations = {
      'orlando': { lat: 28.5421, lng: -81.3723, name: 'Orlando, FL, USA' },
      'new york': { lat: 40.7128, lng: -74.0060, name: 'New York, NY, USA' },
      'los angeles': { lat: 34.0522, lng: -118.2437, name: 'Los Angeles, CA, USA' },
      'chicago': { lat: 41.8781, lng: -87.6298, name: 'Chicago, IL, USA' },
      'san francisco': { lat: 37.7749, lng: -122.4194, name: 'San Francisco, CA, USA' },
      'seattle': { lat: 47.6062, lng: -122.3321, name: 'Seattle, WA, USA' },
      'miami': { lat: 25.7617, lng: -80.1918, name: 'Miami, FL, USA' },
      'boston': { lat: 42.3601, lng: -71.0589, name: 'Boston, MA, USA' },
      'denver': { lat: 39.7392, lng: -104.9903, name: 'Denver, CO, USA' },
      'austin': { lat: 30.2672, lng: -97.7431, name: 'Austin, TX, USA' },
    };

    try {
      const searchLower = search.toLowerCase().trim();
      var locationData = null;

      // First try mock data (for testing)
      if (mockLocations[searchLower]) {
        locationData = mockLocations[searchLower];
        console.log('Using mock location data for:', search);
      } else {
        // Try real Google Maps API
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        console.log('Geocoding request for:', search, 'with key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NO KEY');

        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
            search
          )}&key=${apiKey}`
        );
        const data = await response.json();

        console.log('Geocoding API response:', data);

        if (data.results && data.results.length > 0) {
          const location = data.results[0];
          locationData = {
            lat: location.geometry.location.lat,
            lng: location.geometry.location.lng,
            name: location.formatted_address,
          };
          console.log('Location found:', locationData.name, locationData.lat, locationData.lng);
        } else {
          console.log('Geocoding failed. Status:', data.status, 'Message:', data.error_message);
        }
      }

      if (locationData) {
        var refreshedToken = null;
        try {
          refreshedToken = token.refresh(jwtToken);
        } catch (e) {
          console.log(e.message);
        }

        var ret = { ...locationData, error: "", jwtToken: refreshedToken };
        res.status(200).json(ret);
      } else {
        var refreshedToken = null;
        try {
          refreshedToken = token.refresh(jwtToken);
        } catch (e) {
          console.log('Token refresh failed:', e.message);
        }
        var ret = { error: "Location not found. Try: Orlando, New York, Los Angeles, Chicago, etc.", jwtToken: refreshedToken };
        res.status(200).json(ret);
      }
    } catch (e) {
      error = e.toString();
      console.log('Geocoding endpoint error:', error);
      var refreshedToken = null;
      try {
        refreshedToken = token.refresh(jwtToken);
      } catch (e2) {
        console.log('Token refresh failed:', e2.message);
      }
      var ret = { error: error, jwtToken: refreshedToken };
      res.status(200).json(ret);
    }
  });

  app.post("/api/getPlaces", async (req, res, next) => {
    // incoming: lat, lng, jwtToken
    // outgoing: places[], error, jwtToken
    var token = require("./createJWT.js");
    var error = "";

    const { lat, lng, jwtToken } = req.body;
    try {
      if (token.isExpired(jwtToken)) {
        var r = { error: "The JWT is not longer valid.", jwtToken: "" };
        res.status(200).json(r);
        return;
      }
    } catch (e) {
      console.log(e.message);
    }

    // Mock places for testing
    const mockPlaces = [
      { name: 'Downtown Museums', address: 'Museum District', rating: 4.7, type: 'museum', lat: lat + 0.02, lng: lng + 0.02, placeId: 'mock1' },
      { name: 'Central Park Recreation', address: 'Central Park Area', rating: 4.8, type: 'park', lat: lat - 0.01, lng: lng - 0.01, placeId: 'mock2' },
      { name: 'Historic District Cafe', address: 'Historic District', rating: 4.5, type: 'restaurant', lat: lat + 0.01, lng: lng - 0.02, placeId: 'mock3' },
      { name: 'Waterfront Dining', address: 'Waterfront Promenade', rating: 4.6, type: 'restaurant', lat: lat - 0.02, lng: lng + 0.01, placeId: 'mock4' },
      { name: 'Art Gallery Downtown', address: 'Arts District', rating: 4.4, type: 'museum', lat: lat, lng: lng + 0.02, placeId: 'mock5' },
    ];

    try {
      console.log('Fetching places for:', lat, lng);

      // Try real API first
      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (apiKey && apiKey !== 'your_google_places_api_key_here') {
        const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
        url.searchParams.append('location', `${lat},${lng}`);
        url.searchParams.append('radius', '5000');
        url.searchParams.append('type', 'restaurant|cafe|museum|park|tourist_attraction');
        url.searchParams.append('key', apiKey);

        const response = await fetch(url.toString());
        const data = await response.json();

        console.log('Places API Response:', data);

        if (data.results && data.results.length > 0) {
          var places = data.results.map((place) => ({
            name: place.name,
            address: place.vicinity,
            rating: place.rating,
            type: place.types[0],
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng,
            placeId: place.place_id,
          }));

          var refreshedToken = null;
          try {
            refreshedToken = token.refresh(jwtToken);
          } catch (e) {
            console.log(e.message);
          }

          var ret = { places, error: "", jwtToken: refreshedToken };
          res.status(200).json(ret);
          return;
        }
      }

      // Use mock data as fallback
      console.log('Using mock places data');
      var refreshedToken = null;
      try {
        refreshedToken = token.refresh(jwtToken);
      } catch (e) {
        console.log(e.message);
      }

      var ret = { places: mockPlaces, error: "", jwtToken: refreshedToken };
      res.status(200).json(ret);
    } catch (e) {
      error = e.toString();
      console.log('Places API Error:', error);

      // Return mock data on error
      var refreshedToken = null;
      try {
        refreshedToken = token.refresh(jwtToken);
      } catch (e2) {
        console.log(e2.message);
      }
      var ret = { places: mockPlaces, error: "", jwtToken: refreshedToken };
      res.status(200).json(ret);
    }
  });

  app.post("/api/getEvents", async (req, res, next) => {
    // incoming: location, jwtToken
    // outgoing: events[], error, jwtToken
    var token = require("./createJWT.js");
    var error = "";

    const { location, jwtToken } = req.body;
    try {
      if (token.isExpired(jwtToken)) {
        var r = { error: "The JWT is not longer valid.", jwtToken: "" };
        res.status(200).json(r);
        return;
      }
    } catch (e) {
      console.log(e.message);
    }

    // Mock events for testing
    const mockEvents = [
      { name: 'Live Jazz Concert', date: '2026-04-15', venue: 'Downtown Concert Hall', ticketUrl: '#', image: 'https://via.placeholder.com/300x200?text=Jazz+Concert' },
      { name: 'Rock Festival 2026', date: '2026-05-20', venue: 'City Park Amphitheater', ticketUrl: '#', image: 'https://via.placeholder.com/300x200?text=Rock+Festival' },
      { name: 'Comedy Night Show', date: '2026-04-10', venue: 'Comedy Club Downtown', ticketUrl: '#', image: 'https://via.placeholder.com/300x200?text=Comedy' },
      { name: 'Electronic Music Festival', date: '2026-06-01', venue: 'Waterfront Venue', ticketUrl: '#', image: 'https://via.placeholder.com/300x200?text=EDM+Festival' },
      { name: 'Broadway Show', date: '2026-04-25', venue: 'Theater District', ticketUrl: '#', image: 'https://via.placeholder.com/300x200?text=Broadway' },
    ];

    try {
      console.log('Fetching events for:', location);

      // Try real API first
      const apiKey = process.env.TICKETMASTER_API_KEY;
      if (apiKey && apiKey !== 'your_ticketmaster_api_key_here') {
        const response = await fetch(
          `https://app.ticketmaster.com/discovery/v2/events.json?city=${encodeURIComponent(
            location
          )}&apikey=${apiKey}&size=10`
        );
        const data = await response.json();

        console.log('Events API Response:', data);

        var events = [];
        if (data._embedded && data._embedded.events) {
          events = data._embedded.events.map((event) => ({
            name: event.name,
            date: event.dates?.start?.localDate,
            venue:
              event._embedded?.venues?.[0]?.name || "Location not available",
            ticketUrl: event.url,
            image: event.images?.[0]?.url,
          }));

          var refreshedToken = null;
          try {
            refreshedToken = token.refresh(jwtToken);
          } catch (e) {
            console.log(e.message);
          }

          var ret = { events, error: "", jwtToken: refreshedToken };
          res.status(200).json(ret);
          return;
        }
      }

      // Use mock data as fallback
      console.log('Using mock events data');
      var refreshedToken = null;
      try {
        refreshedToken = token.refresh(jwtToken);
      } catch (e) {
        console.log(e.message);
      }

      var ret = { events: mockEvents, error: "", jwtToken: refreshedToken };
      res.status(200).json(ret);
    } catch (e) {
      error = e.toString();
      console.log('Events API Error:', error);

      // Return mock data on error
      var refreshedToken = null;
      try {
        refreshedToken = token.refresh(jwtToken);
      } catch (e2) {
        console.log(e2.message);
      }
      var ret = { events: mockEvents, error: "", jwtToken: refreshedToken };
      res.status(200).json(ret);
    }
  });

  app.post("/api/createTrip", async (req, res, next) => {
    // incoming: userId, location, jwtToken
    // outgoing: tripId, error, jwtToken
    var token = require("./createJWT.js");
    var error = "";

    const { userId, location, jwtToken } = req.body;
    try {
      if (token.isExpired(jwtToken)) {
        var r = { error: "The JWT is not longer valid.", jwtToken: "" };
        res.status(200).json(r);
        return;
      }
    } catch (e) {
      console.log(e.message);
    }

    try {
      const db = client.db("COP4331Cards");
      const newTrip = {
        UserId: userId,
        Location: location,
        Items: [],
        CreatedAt: new Date(),
      };

      const result = await db.collection("Trips").insertOne(newTrip);
      const tripId = result.insertedId.toString();

      var refreshedToken = null;
      try {
        refreshedToken = token.refresh(jwtToken);
      } catch (e) {
        console.log(e.message);
      }

      var ret = { tripId, error: "", jwtToken: refreshedToken };
      res.status(200).json(ret);
    } catch (e) {
      error = e.toString();
      var refreshedToken = null;
      try {
        refreshedToken = token.refresh(jwtToken);
      } catch (e2) {
        console.log('Token refresh failed:', e2.message);
      }
      var ret = { error: error, jwtToken: refreshedToken };
      res.status(200).json(ret);
    }
  });

  app.post("/api/addToTrip", async (req, res, next) => {
    // incoming: userId, tripId, item, jwtToken
    // outgoing: error, jwtToken
    var token = require("./createJWT.js");
    var error = "";

    const { userId, tripId, item, jwtToken } = req.body;
    try {
      if (token.isExpired(jwtToken)) {
        var r = { error: "The JWT is not longer valid.", jwtToken: "" };
        res.status(200).json(r);
        return;
      }
    } catch (e) {
      console.log(e.message);
    }

    try {
      const db = client.db("COP4331Cards");
      const ObjectId = require("mongodb").ObjectId;

      await db
        .collection("Trips")
        .updateOne(
          { _id: new ObjectId(tripId), UserId: userId },
          { $push: { Items: item } }
        );

      var refreshedToken = null;
      try {
        refreshedToken = token.refresh(jwtToken);
      } catch (e) {
        console.log(e.message);
      }

      var ret = { error: "", jwtToken: refreshedToken };
      res.status(200).json(ret);
    } catch (e) {
      error = e.toString();
      var refreshedToken = null;
      try {
        refreshedToken = token.refresh(jwtToken);
      } catch (e2) {
        console.log('Token refresh failed:', e2.message);
      }
      var ret = { error: error, jwtToken: refreshedToken };
      res.status(200).json(ret);
    }
  });

  app.post("/api/getTrips", async (req, res, next) => {
    // incoming: userId, jwtToken
    // outgoing: trips[], error, jwtToken
    var token = require("./createJWT.js");
    var error = "";

    const { userId, jwtToken } = req.body;
    try {
      if (token.isExpired(jwtToken)) {
        var r = { error: "The JWT is not longer valid.", jwtToken: "" };
        res.status(200).json(r);
        return;
      }
    } catch (e) {
      console.log(e.message);
    }

    try {
      const db = client.db("COP4331Cards");
      const trips = await db
        .collection("Trips")
        .find({ UserId: userId })
        .toArray();

      var refreshedToken = null;
      try {
        refreshedToken = token.refresh(jwtToken);
      } catch (e) {
        console.log(e.message);
      }

      var ret = { trips, error: "", jwtToken: refreshedToken };
      res.status(200).json(ret);
    } catch (e) {
      error = e.toString();
      var ret = { trips: [], error: error, jwtToken: token.refresh(jwtToken) };
      res.status(200).json(ret);
    }
  });

  app.post("/api/removeFromTrip", async (req, res, next) => {
    // incoming: userId, tripId, itemIndex, jwtToken
    // outgoing: error, jwtToken
    var token = require("./createJWT.js");
    var error = "";

    const { userId, tripId, itemIndex, jwtToken } = req.body;
    try {
      if (token.isExpired(jwtToken)) {
        var r = { error: "The JWT is not longer valid.", jwtToken: "" };
        res.status(200).json(r);
        return;
      }
    } catch (e) {
      console.log(e.message);
    }

    try {
      const db = client.db("COP4331Cards");
      const ObjectId = require("mongodb").ObjectId;

      const trip = await db
        .collection("Trips")
        .findOne({ _id: new ObjectId(tripId), UserId: userId });

      if (trip && trip.Items && trip.Items[itemIndex]) {
        trip.Items.splice(itemIndex, 1);
        await db
          .collection("Trips")
          .updateOne(
            { _id: new ObjectId(tripId), UserId: userId },
            { $set: { Items: trip.Items } }
          );
      }

      var refreshedToken = null;
      try {
        refreshedToken = token.refresh(jwtToken);
      } catch (e) {
        console.log(e.message);
      }

      var ret = { error: "", jwtToken: refreshedToken };
      res.status(200).json(ret);
    } catch (e) {
      error = e.toString();
      var refreshedToken = null;
      try {
        refreshedToken = token.refresh(jwtToken);
      } catch (e2) {
        console.log('Token refresh failed:', e2.message);
      }
      var ret = { error: error, jwtToken: refreshedToken };
      res.status(200).json(ret);
    }
  });

  app.post("/api/deleteTrip", async (req, res, next) => {
    // incoming: userId, tripId, jwtToken
    // outgoing: error, jwtToken
    var token = require("./createJWT.js");
    var error = "";

    const { userId, tripId, jwtToken } = req.body;
    try {
      if (token.isExpired(jwtToken)) {
        var r = { error: "The JWT is not longer valid.", jwtToken: "" };
        res.status(200).json(r);
        return;
      }
    } catch (e) {
      console.log(e.message);
    }

    try {
      const db = client.db("COP4331Cards");
      const ObjectId = require("mongodb").ObjectId;

      await db
        .collection("Trips")
        .deleteOne({ _id: new ObjectId(tripId), UserId: userId });

      var refreshedToken = null;
      try {
        refreshedToken = token.refresh(jwtToken);
      } catch (e) {
        console.log(e.message);
      }

      var ret = { error: "", jwtToken: refreshedToken };
      res.status(200).json(ret);
    } catch (e) {
      error = e.toString();
      var refreshedToken = null;
      try {
        refreshedToken = token.refresh(jwtToken);
      } catch (e2) {
        console.log('Token refresh failed:', e2.message);
      }
      var ret = { error: error, jwtToken: refreshedToken };
      res.status(200).json(ret);
    }
  });
};
