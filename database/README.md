# Database setup

Prerequisites: Node.js with ES module support (Node 20+ recommended for the test
runner and fetch), MongoDB, and the backend's approved Mongoose and dotenv
dependencies installed in `server/node_modules`. This module reuses those exact
versions through `runtime.js`; fallback resolution supports an existing ancestor
installation. No dependency versions have been added or changed here.

`database/package.json` scopes these files as ES modules independently of the
backend. Member 2 should use ES module imports or dynamic `import()` from CommonJS.

Start a local database in one terminal; use an empty directory of your choice:

```sh
mkdir -p /tmp/blog-cms-data
mongod --dbpath /tmp/blog-cms-data --bind_ip 127.0.0.1 --port 27017 --nounixsocket
```

Configure the backend's untracked `server/.env` (Member 2 owns its example file):

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/blog_cms
PORT=5000
```

`connectDB()` loads that file with dotenv and preserves variables already present
in the process. `DOTENV_CONFIG_PATH` optionally selects a different env file.
There is **no default URI** and no connection attempt on import. Missing URI,
unreadable env files and failed connections produce safe errors. Driver errors
are not echoed because they can expose connection details.

Optional settings: `MONGODB_DB_NAME` overrides the database name in the URI;
`MONGODB_SERVER_SELECTION_TIMEOUT_MS` is a positive integer (default 5000).
Concurrent calls share a pending connection. Repeated calls reuse the active
connection; changed settings require disconnecting first. Member 2 owns shutdown
handling, runtime database error handling and HTTP availability responses.

Backend integration:

```js
import { connectDB } from '../database/connection.js'; // adjust path from server entry
import Blog from '../database/models/Blog.js';

await connectDB(); // before listening for HTTP requests
// Use Blog in controllers; do not open a second connection in server/.
```

## Seed demonstration blogs

From the repository root:

```sh
node database/seed.js
```

This uses only the explicitly configured URI and optional database override.
Five realistic examples use fixed reserved IDs `6bc000000000000000000001` through
`6bc000000000000000000005`. Each is inserted with `$setOnInsert`/upsert. Repeated
runs preserve existing documents, user edits, comments, likes and timestamps.
An existing document with one of those IDs is left untouched. Partial failures
are safe to retry. No records are deleted and no database is automatically reset.

## Safe reset

For a fresh demo, stop the server and point `MONGODB_URI` at a **new database
name**, remove any conflicting `MONGODB_DB_NAME` override, and rerun the seed.
This preserves the old database. If deletion is necessary, back up first and use
MongoDB tooling to delete only explicitly selected seed IDs after checking the
database name. There is intentionally no broad reset/drop command in this script.

Real tests create random databases prefixed `blog_cms_test_` and drop only their
own generated database. See [testing](../docs/TESTING.md) for exact commands.
Never commit `.env`, passwords, tokens, data files or real connection credentials.
Atlas is optional; no cloud resources are required or provisioned by this work.
