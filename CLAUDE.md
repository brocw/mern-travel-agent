# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (project root)
```bash
npm start          # Run backend with nodemon (port 5000)
```

### Frontend (`frontend/` directory)
```bash
npm run dev        # Start Vite dev server (port 5173)
npm run build      # TypeScript compile + Vite build
npm run lint       # ESLint
npm run preview    # Preview production build
```

### Integration test (project root)
```bash
npm test           # Mirrors CI: installs frontend deps and runs tsc + vite build
```

## Architecture

**MERN stack card management app** (MongoDB, Express, React, Node). Despite the repo name, this is a COP4331 coursework card management application.

### Backend (project root)
- `server.js` — Express entry point; connects to MongoDB, registers middleware, calls `api.js`
- `api.js` — All route definitions via `setApp(app, client)` pattern
- `createJWT.js` — JWT creation, verification, and rotation logic

**API endpoints** (all POST):
- `/api/login`, `/api/register` — unauthenticated
- `/api/addCard`, `/api/searchCards` — require `jwtToken` in request body

**Auth pattern**: JWT tokens are sent in the request body (not headers) and a refreshed token is returned in every authenticated response. Token rotation happens on every successful request.

### Frontend (`frontend/src/`)
- `App.tsx` — React Router config (3 routes: `/`, `/cards`, `/register`)
- `components/Path.ts` — Builds API base URL; uses `localhost:5000` in dev, `cop-4331-22.com:5000` in production
- `tokenStorage.ts` — All localStorage reads/writes for JWT and user data
- `components/Login.tsx`, `Register.tsx` — Auth forms
- `components/CardUI.tsx` — Main card management interface (search + add)

### Database
MongoDB database `COP4331Cards` with two collections:
- `Users` — `{ UserId, FirstName, LastName, Login, Email, Password }`
- `Cards` — `{ Card, UserId }`

## Environment Variables

Create `.env` at the project root:
```
MONGODB_URL=mongodb+srv://...
ACCESS_TOKEN_SECRET=your_secret_here
```
