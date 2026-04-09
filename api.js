require("express");
require("mongodb");

exports.setApp = function (app, client) {

  const getRefreshedToken = (refreshResult) => {
    if (!refreshResult) return "";
    if (typeof refreshResult === "string") return refreshResult;
    return refreshResult?.accessToken || "";
  };
  
  app.post("/api/addCard", async (req, res, next) => {
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

    var ret = { error: error, jwtToken: getRefreshedToken(refreshedToken) };
    res.status(200).json(ret);
  });

  app.post("/api/register", async (req, res, next) => {
    var error = "";
    console.log(req.body);

    const { firstName, lastName, login, email, password } = req.body;
    const db = client.db("COP4331Cards");

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
      const userCount = await db.collection("Users").countDocuments();
      const newUserId = userCount + 1;

      // ✅ CHANGE 1 - Added IsVerified: false and sendVerificationEmail
      const newUser = {
        UserId: newUserId,
        FirstName: firstName,
        LastName: lastName,
        Login: login,
        Email: email,
        Password: password,
        IsVerified: false,
      };

      await db.collection("Users").insertOne(newUser);

      const { sendVerificationEmail } = require("./sendVerificationEmail.js");
      await sendVerificationEmail(email, newUserId);

      res.status(200).json({
        error: "",
        message: "Registration successful! Please check your email to verify your account."
      });
    } catch (e) {
      res.status(200).json({ error: e.message });
    }
  });

  app.post("/api/login", async (req, res, next) => {
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
      // ✅ CHANGE 2 - Block unverified users
      if (!results[0].IsVerified) {
        ret = { error: "Please verify your email before logging in." };
        res.status(200).json(ret);
        return;
      }

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

    var ret = { results: _ret, error: error, jwtToken: getRefreshedToken(refreshedToken) };
    res.status(200).json(ret);
  });

  app.post("/api/searchLocation", async (req, res, next) => {
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

      if (mockLocations[searchLower]) {
        locationData = mockLocations[searchLower];
        console.log('Using mock location data for:', search);
      } else {
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

        var ret = { ...locationData, error: "", jwtToken: getRefreshedToken(refreshedToken) };
        res.status(200).json(ret);
      } else {
        var refreshedToken = null;
        try {
          refreshedToken = token.refresh(jwtToken);
        } catch (e) {
          console.log('Token refresh failed:', e.message);
        }
        var ret = { error: "Location not found. Try: Orlando, New York, Los Angeles, Chicago, etc.", jwtToken: getRefreshedToken(refreshedToken) };
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
      var ret = { error: error, jwtToken: getRefreshedToken(refreshedToken) };
      res.status(200).json(ret);
    }
  });

  app.post("/api/getPlaces", async (req, res, next) => {
    var token = require("./createJWT.js");

    const { lat, lng, jwtToken, type } = req.body;

    try {
      if (token.isExpired(jwtToken)) {
        return res.status(200).json({
          error: "The JWT is no longer valid.",
          jwtToken: "",
        });
      }
    } catch (e) {
      console.log(e.message);
    }

    let refreshedToken = null;
    try {
      refreshedToken = token.refresh(jwtToken);
    } catch (e) {
      console.log(e.message);
    }

    const apiKey =
      process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

    const typeConfig = {
      all: { keyword: "things to do", placeType: null, radius: "10000" },
      things_to_do: { keyword: "things to do", placeType: "tourist_attraction", radius: "12000" },
      restaurant: { keyword: "restaurant", placeType: "restaurant", radius: "10000" },
      cafe: { keyword: "cafe", placeType: "cafe", radius: "10000" },
      park: { keyword: "park", placeType: "park", radius: "15000" },
      museum: { keyword: "museum", placeType: "museum", radius: "20000" },
      bar: { keyword: "bar", placeType: "bar", radius: "10000" },
    };

    const config = typeConfig[type] || typeConfig.all;

    const mockPlaces = [
      {
        name: "Downtown Museums",
        address: "Museum District",
        rating: 4.7,
        type: "museum",
        lat: lat + 0.02,
        lng: lng + 0.02,
        placeId: "mock1",
        image: "https://via.placeholder.com/300x200?text=Place",
      },
      {
        name: "Central Park Recreation",
        address: "Central Park Area",
        rating: 4.8,
        type: "park",
        lat: lat - 0.01,
        lng: lng - 0.01,
        placeId: "mock2",
        image: "https://via.placeholder.com/300x200?text=Place",
      },
      {
        name: "Historic District Cafe",
        address: "Historic District",
        rating: 4.5,
        type: "cafe",
        lat: lat + 0.01,
        lng: lng - 0.02,
        placeId: "mock3",
        image: "https://via.placeholder.com/300x200?text=Place",
      },
      {
        name: "Waterfront Dining",
        address: "Waterfront Promenade",
        rating: 4.6,
        type: "restaurant",
        lat: lat - 0.02,
        lng: lng + 0.01,
        placeId: "mock4",
        image: "https://via.placeholder.com/300x200?text=Place",
      },
      {
        name: "Art Gallery Downtown",
        address: "Arts District",
        rating: 4.4,
        type: "museum",
        lat: lat,
        lng: lng + 0.02,
        placeId: "mock5",
        image: "https://via.placeholder.com/300x200?text=Place",
      },
    ];

    try {
      console.log("Fetching places for:", lat, lng, "type:", type);

      if (!apiKey || apiKey === "your_google_places_api_key_here") {
        console.log("Using mock places because API key is missing");
        return res.status(200).json({
          places: mockPlaces,
          error: "",
          jwtToken: getRefreshedToken(refreshedToken),
        });
      }

      const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
      url.searchParams.append("location", `${lat},${lng}`);
      url.searchParams.append("radius", config.radius);
      url.searchParams.append("keyword", config.keyword);
      if (config.placeType) {
        url.searchParams.append("type", config.placeType);
      }
      url.searchParams.append("key", apiKey);

      const response = await fetch(url.toString());
      const data = await response.json();

      console.log("Places API Response:", data);

      if (!data.results || data.results.length === 0) {
        return res.status(200).json({
          places: [],
          error: data.error_message || "No places found for this location.",
          jwtToken: getRefreshedToken(refreshedToken),
        });
      }

      const places = data.results.map((place) => ({
        name: place.name,
        address: place.vicinity,
        rating: place.rating,
        type: place.types?.[0] || "place",
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
        placeId: place.place_id,
        image:
          place.photos?.length > 0
            ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${place.photos[0].photo_reference}&key=${apiKey}`
            : "https://via.placeholder.com/300x200?text=Place",
      }));

      return res.status(200).json({
        places,
        error: "",
        jwtToken: getRefreshedToken(refreshedToken),
      });
    } catch (e) {
      console.log("Places API Error:", e.toString());

      return res.status(200).json({
        places: mockPlaces,
        error: "",
        jwtToken: getRefreshedToken(refreshedToken),
      });
    }
  });

  app.post("/api/getEvents", async (req, res, next) => {
    var token = require("./createJWT.js");
    var error = "";

    const { location, startDate, endDate, jwtToken } = req.body;

    try {
      if (token.isExpired(jwtToken)) {
        var r = { error: "The JWT is not longer valid.", jwtToken: "" };
        res.status(200).json(r);
        return;
      }
    } catch (e) {
      console.log(e.message);
    }

    const mockEvents = [
      {
        name: "Live Jazz Concert",
        date: "2026-04-15",
        venue: "Downtown Concert Hall",
        ticketUrl: "#",
        image: "https://via.placeholder.com/300x200?text=Jazz+Concert",
      },
      {
        name: "Rock Festival 2026",
        date: "2026-05-20",
        venue: "City Park Amphitheater",
        ticketUrl: "#",
        image: "https://via.placeholder.com/300x200?text=Rock+Festival",
      },
      {
        name: "Comedy Night Show",
        date: "2026-04-10",
        venue: "Comedy Club Downtown",
        ticketUrl: "#",
        image: "https://via.placeholder.com/300x200?text=Comedy",
      },
    ];

    try {
      console.log("Fetching events for:", location, startDate, endDate);

      const apiKey = process.env.TICKETMASTER_API_KEY;

      if (apiKey && apiKey !== "your_ticketmaster_api_key_here") {
        const url = new URL(
          "https://app.ticketmaster.com/discovery/v2/events.json"
        );

        url.searchParams.append("city", location);
        url.searchParams.append("apikey", apiKey);
        url.searchParams.append("size", "20");

        if (startDate) {
          url.searchParams.append("startDateTime", `${startDate}T00:00:00Z`);
        }

        if (endDate) {
          url.searchParams.append("endDateTime", `${endDate}T23:59:59Z`);
        }

        const response = await fetch(url.toString());
        const data = await response.json();

        console.log("Events API Response:", data);

        let events = [];
        if (data._embedded && data._embedded.events) {
          events = data._embedded.events.map((event) => ({
            name: event.name,
            date: event.dates?.start?.localDate,
            venue: event._embedded?.venues?.[0]?.name || "Location not available",
            ticketUrl: event.url,
            image: event.images?.[0]?.url,
          }));

          let refreshedToken = null;
          try {
            refreshedToken = token.refresh(jwtToken);
          } catch (e) {
            console.log(e.message);
          }

          return res.status(200).json({
            events,
            error: "",
            jwtToken: getRefreshedToken(refreshedToken),
          });
        }
      }

      console.log("Using mock events data");

      let refreshedToken = null;
      try {
        refreshedToken = token.refresh(jwtToken);
      } catch (e) {
        console.log(e.message);
      }

      return res.status(200).json({
        events: mockEvents,
        error: "",
        jwtToken: getRefreshedToken(refreshedToken),
      });
    } catch (e) {
      error = e.toString();
      console.log("Events API Error:", error);

      let refreshedToken = null;
      try {
        refreshedToken = token.refresh(jwtToken);
      } catch (e2) {
        console.log(e2.message);
      }

      return res.status(200).json({
        events: mockEvents,
        error: "",
        jwtToken: getRefreshedToken(refreshedToken),
      });
    }
  });

  app.post("/api/searchFlights", async (req, res, next) => {
    var token = require("./createJWT.js");
    const {
      departureId,
      arrivalId,
      outboundDate,
      returnDate,
      tripType,
      adults,
      travelClass,
      departureToken,
      bookingToken,
      jwtToken,
    } = req.body;

    try {
      if (token.isExpired(jwtToken)) {
        return res.status(200).json({ error: "The JWT is no longer valid.", jwtToken: "" });
      }
    } catch (e) {
      console.log(e.message);
    }

    const refreshedToken = (() => {
      try {
        return token.refresh(jwtToken);
      } catch (e) {
        console.log(e.message);
        return null;
      }
    })();

    const serpApiKey = process.env.SERPAPI_KEY;
    if (!serpApiKey) {
      return res.status(200).json({
        flights: [],
        bookingOptions: [],
        phase: "none",
        error: "SERPAPI_KEY is not configured on the server.",
        jwtToken: getRefreshedToken(refreshedToken),
      });
    }

    try {
      const { getJson } = require("serpapi");
      const parsedTripType = Number(tripType) || 1;
      const basePayload = {
        engine: "google_flights",
        api_key: serpApiKey,
        ...(departureId ? { departure_id: String(departureId).toUpperCase().trim() } : {}),
        ...(arrivalId ? { arrival_id: String(arrivalId).toUpperCase().trim() } : {}),
        ...(outboundDate ? { outbound_date: outboundDate } : {}),
        ...(returnDate && parsedTripType === 1 ? { return_date: returnDate } : {}),
        type: parsedTripType,
        adults: Number(adults) || 1,
        travel_class: Number(travelClass) || 1,
        currency: "USD",
        hl: "en",
      };

      let payload = { ...basePayload };
      let phase = "initial";

      if (bookingToken) {
        payload = { ...basePayload, booking_token: bookingToken };
        phase = "booking";
      } else if (departureToken) {
        payload = { ...basePayload, departure_token: departureToken };
        phase = "returns";
      } else if (!departureId || !arrivalId || !outboundDate) {
        return res.status(200).json({
          flights: [],
          bookingOptions: [],
          phase: "none",
          error: "Departure airport, arrival airport, and departure date are required.",
          jwtToken: getRefreshedToken(refreshedToken),
        });
      }

      const response = await getJson(payload);
      const flights = response?.best_flights || response?.other_flights || [];
      const bookingOptions =
        response?.booking_options || response?.book_with || response?.booking_flights || [];

      return res.status(200).json({
        flights,
        bookingOptions,
        phase,
        error: "",
        jwtToken: getRefreshedToken(refreshedToken),
      });
    } catch (e) {
      return res.status(200).json({
        flights: [],
        bookingOptions: [],
        phase: "none",
        error: e.toString(),
        jwtToken: getRefreshedToken(refreshedToken),
      });
    }
  });

  app.post("/api/createTrip", async (req, res, next) => {
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

      var ret = { tripId, error: "", jwtToken: getRefreshedToken(refreshedToken) };
      res.status(200).json(ret);
    } catch (e) {
      error = e.toString();
      var refreshedToken = null;
      try {
        refreshedToken = token.refresh(jwtToken);
      } catch (e2) {
        console.log('Token refresh failed:', e2.message);
      }
      var ret = { error: error, jwtToken: getRefreshedToken(refreshedToken) };
      res.status(200).json(ret);
    }
  });

  app.post("/api/addToTrip", async (req, res, next) => {
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

      var ret = { error: "", jwtToken: getRefreshedToken(refreshedToken) };
      res.status(200).json(ret);
    } catch (e) {
      error = e.toString();
      var refreshedToken = null;
      try {
        refreshedToken = token.refresh(jwtToken);
      } catch (e2) {
        console.log('Token refresh failed:', e2.message);
      }
      var ret = { error: error, jwtToken: getRefreshedToken(refreshedToken) };
      res.status(200).json(ret);
    }
  });

  app.post("/api/getTrips", async (req, res, next) => {
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

      var ret = { trips, error: "", jwtToken: getRefreshedToken(refreshedToken) };
      res.status(200).json(ret);
    } catch (e) {
      error = e.toString();
      var ret = { trips: [], error: error, jwtToken: token.refresh(jwtToken) };
      res.status(200).json(ret);
    }
  });

  app.post("/api/removeFromTrip", async (req, res, next) => {
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

      var ret = { error: "", jwtToken: getRefreshedToken(refreshedToken) };
      res.status(200).json(ret);
    } catch (e) {
      error = e.toString();
      var refreshedToken = null;
      try {
        refreshedToken = token.refresh(jwtToken);
      } catch (e2) {
        console.log('Token refresh failed:', e2.message);
      }
      var ret = { error: error, jwtToken: getRefreshedToken(refreshedToken) };
      res.status(200).json(ret);
    }
  });

  app.post("/api/deleteTrip", async (req, res, next) => {
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

      var ret = { error: "", jwtToken: getRefreshedToken(refreshedToken) };
      res.status(200).json(ret);
    } catch (e) {
      error = e.toString();
      var refreshedToken = null;
      try {
        refreshedToken = token.refresh(jwtToken);
      } catch (e2) {
        console.log('Token refresh failed:', e2.message);
      }
      var ret = { error: error, jwtToken: getRefreshedToken(refreshedToken) };
      res.status(200).json(ret);
    }
  });

  app.get("/api/verifyEmail", async (req, res, next) => {
  const { token } = req.query;

  try {
    const jwt = require("jsonwebtoken");
    
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const db = client.db("COP4331Cards");
    const result = await db.collection("Users").updateOne(
      { UserId: decoded.userId },
      { $set: { IsVerified: true } }
    );

    res.redirect(`${process.env.CLIENT_URL}/verify-email?success=true`);
  } catch (e) {
    res.redirect(`${process.env.CLIENT_URL}/verify-email?success=false`);
  }
});

};