require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();

const MongoClient = require("mongodb").MongoClient;
const url = process.env.MONGODB_URL;
console.log(url);
const client = new MongoClient(url);
client.connect();

var cardList = [];

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, DELETE, OPTIONS",
  );
  next();
});

var api = require("./api.js");
api.setApp(app, client);

app.listen(5000); // start Node + Express server on port 5000 (NOT 5173, the site's port)
