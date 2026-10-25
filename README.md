# Blog / CMS Platform with Comments and Likes

A three-member MERN course project for creating, reading, editing and deleting
blog posts, with embedded comments and visitor likes.

The React/Vite client calls the Node/Express API; the API uses the shared Mongoose
Blog model to persist data in MongoDB. The frontend also has a standalone mock
mode. At this checkout the frontend exists, Member 3's database/tests/docs are
implemented, and **Member 2's `server/` has not been delivered**. Full-stack API
verification must wait for that backend.

## Prerequisites and installation

Use Node.js 20+ with npm, a locally running MongoDB instance, and Git. Use the
Node version supported by the team's installed dependencies; local verification
used Node 25.9.0. Preserve the existing frontend/backend dependency versions.

```sh
# From the repository root
cd client
npm install
cp .env.example .env
npm run dev
```

The frontend uses React 18, React Router and Vite. Its default
`VITE_USE_MOCK_API=true` supports UI work without the server. Mock data resets
when the page reloads. To use the backend, configure `client/.env`:

```dotenv
VITE_USE_MOCK_API=false
VITE_API_BASE_URL=http://localhost:5000/api
```

Restart Vite after environment changes. `npm run build` in `client/` creates the
production frontend build, and `npm run preview` previews it.

Once Member 2 delivers the backend, install its dependencies in the correct
directory:

```sh
cd server
npm install
cp .env.example .env
npm run
```

Select the backend's documented start/dev script from `npm run`. The server
package and scripts do not exist yet, so a specific backend start command cannot
be verified here. Member 2 must supply Express, Mongoose and dotenv in its package
using the team's approved versions. Member 3 has not changed dependency versions
or created a second backend package.

Configure the untracked `server/.env`:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/blog_cms
PORT=5000
```

Start MongoDB in another terminal:

```sh
mkdir -p /tmp/blog-cms-data
mongod --dbpath /tmp/blog-cms-data --bind_ip 127.0.0.1 --port 27017 --nounixsocket
```

After starting the backend on port 5000, run the frontend with mock mode disabled.
Member 2 must allow the frontend development origin through its CORS setup.
Never commit `.env`, credentials, tokens, or database data directories.

## Database and seed

Member 2 imports `connectDB()` from `database/connection.js`, awaits it before
listening, and uses the default Blog export from `database/models/Blog.js`.
Adjust import paths relative to the server entry. The model never connects on
import. `runtime.js` reuses dependencies from `server/node_modules`.

```sh
# From the repository root, after configuring server/.env
node database/seed.js
```

Five demo blogs are inserted using stable IDs and insert-only upserts. Existing
records, edits, likes, comments and timestamps are preserved across reruns.
See [database setup](database/README.md) for optional connection settings and safe
reset guidance, and [schema](docs/DATABASE_SCHEMA.md) for validation details.

## Features and API

- Blog list sorted newest first, detail view, creation, editing and deletion.
- Titles, content, author names and up to ten tags, with schema validation.
- Visitor like toggles; counts computed from the stored visitor array.
- Embedded comments with generated IDs and creation dates.

The API base is `http://localhost:5000/api`. Supported routes are GET/POST
`/blogs`, GET/PUT/DELETE `/blogs/:id`, POST `/blogs/:id/like`, and POST
`/blogs/:id/comments`. Responses use `{ success, data }` or
`{ success: false, error: { code, message, details } }`.
See the [API contract](docs/API_CONTRACT.md) for examples and the explicitly
marked status/health/response conventions awaiting both members' confirmation.

## Testing

No additional test framework is needed; tests use `node:test`, `assert` and fetch.
With the backend's approved dependencies installed:

```sh
# Schema checks; no database required
node --test tests/database/blog.model.test.js

# Real connection, persistence, timestamps, validation and seed idempotency
TEST_MONGODB_URI=mongodb://127.0.0.1:27017 node --test tests/database/*.test.js

# Once the backend exists: replace the example entry with its actual JS entry
TEST_MONGODB_URI=mongodb://127.0.0.1:27017 API_TEST_ENTRY=server/src/server.js \
  node --test tests/integration/blog.integration.test.js
```

Every live suite generates a separate database and cleans up only that database.
The HTTP suite launches the real server on a temporary port; it does not require
the frontend. Missing live-test prerequisites are reported as skips, which do not
mean integration passed. See [testing details and results](docs/TESTING.md).

## Team responsibilities and limitations

| Member | Ownership |
| --- | --- |
| 1 | `client/`, React UI, frontend mock data and frontend configuration |
| 2 | `server/`, routes, controllers, request validation, error handling, CORS, backend tests/configuration |
| 3 | `database/`, root `tests/`, shared `docs/`, root README |

This is an unauthenticated course demo. Author names and visitor IDs are
unverified; they can be impersonated. Frontend Edit/Delete controls are not secure
access controls. There is no authorization, moderation, pagination or production
hardening. Embedded arrays and demo visitor IDs need further design for production.
The backend owns atomic like handling and API serialization of `likesCount`.

Atlas is optional. The available Atlas connector currently reports that AI client
access is disabled for all account organizations; an Organization Owner must
enable it before connector operations can inspect the cluster. No cloud resources
were created. Local database verification does not establish Atlas connectivity.
