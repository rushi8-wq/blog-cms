# Blog CMS API

## Setup

Run these commands from `server/`:

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Set `MONGODB_URI` in `.env` to the development database URI before starting the server. For a non-watch start, use `npm start`. Run the independent API tests with `npm test`; they use a controlled in-memory test model and do not connect to or modify MongoDB.

## Database integration

The server imports `connectDB` from `database/connection.js` and the default `Blog` model from `database/models/Blog.js` at the repository root. Those database-owned modules are not present yet, so the production server cannot start until they are provided. Because Node resolves a package from the importing file's location, dependencies installed only in `server/node_modules` are not resolvable by those root-level modules. The team must make Mongoose available to the root-level database modules (for example through an agreed root package/workspace setup); do not copy or recreate the database model in this backend. The connection module should read `MONGODB_URI`.

Like toggles use an atomic MongoDB update pipeline, which requires MongoDB 4.2 or later. Visitor IDs are demo identifiers, not authentication.

The current frontend permits some values that the agreed backend model rejects (for example, 51–80 character comment names and more than 10 tags). The frontend also reads the raw `likes` array to restore the viewer's liked state; this API intentionally does not expose visitor IDs. Coordinate those interface differences with the frontend and database owners rather than weakening the backend validation or exposing IDs.

## API

Base URL: `http://localhost:5000/api`

- `GET /health`
- `GET /blogs`, `GET /blogs/:id`
- `POST /blogs`, `PUT /blogs/:id`, `DELETE /blogs/:id`
- `POST /blogs/:id/like`
- `POST /blogs/:id/comments`

Responses use `{ "success": true, "data": ... }` or the documented error envelope. CORS allows `http://localhost:5173`.
