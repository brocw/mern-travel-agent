# mern-travel-agent

A travel agent web application with a React/TypeScript frontend, a Node.js/Express backend connected to MongoDB, and a Flutter mobile app.

## Tech Stack

- **Backend:** Node.js, Express, MongoDB (`mongodb` driver)
- **Frontend:** React 19, TypeScript, Vite
- **Mobile:** Flutter (Dart), targeting Android, iOS, Linux, macOS, Windows, and web
- **Key integrations:** Google Maps (`@react-google-maps/api`), SendGrid (`@sendgrid/mail`), JWT authentication (`jsonwebtoken`, `jwt-decode`, `react-jwt`), bcrypt for password hashing

## Features

The frontend defines the following client-side routes via `react-router-dom`:

- `/` — Login
- `/register` — Registration
- `/search` — Search page
- `/trips` — Trip management
- `/verify-email` — Email verification
- `/forgot-password` — Forgot password
- `/reset-password` — Password reset
- `/account` — Account management

The `Map` component loads the Google Maps JavaScript API at runtime, renders a map centered on a searched location, and places markers for the main location (red dot) and any returned places.

JWT tokens are stored, retrieved, and removed from `localStorage` via utility functions in `tokenStorage.ts` (`storeToken`, `retrieveToken`, `getAccessToken`, `removeToken`).

The Express server (`server.js`) connects to MongoDB using `MONGODB_URL`, configures CORS, loads routes from `api.js`, and listens on port 5000.

## Local Development

### .env

Add an `.env` file to the root of the project. The two required variables are:

```
MONGODB_URL=
ACCESS_TOKEN_SECRET=
```

The frontend also requires a `VITE_GOOGLE_MAPS_API_KEY` environment variable for the map component.

### Running

Open two terminal windows.

In the project root, start the backend:

```bash
npm run start
```

In the `frontend` directory, start the frontend dev server:

```bash
npm run dev
```

The backend runs on port 5000 and the frontend dev server runs on Vite's default port (5173).

### Building the frontend

```bash
cd frontend
npm run build
```
