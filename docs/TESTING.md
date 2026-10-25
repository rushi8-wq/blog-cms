# Independent testing

Tests use Node's built-in `node:test`, `assert`, and HTTP fetch. There are no new
test-framework dependencies. Use Node 20+ and the backend's approved Mongoose and
dotenv installation. All commands below run from the repository root.

## Schema and cleanup safety tests (no MongoDB required)

```sh
node --test tests/database/blog.model.test.js tests/database/isolation.test.js
```

These execute actual Mongoose document validation, not a mocked model. They cover
required/blank fields, trimmed length boundaries, tags, embedded comment rules,
comment IDs/dates, defaults, duplicate likes, invalid casting and storage
serialization. They also verify generated test targets preserve URI options and
cleanup refuses non-test databases. Timestamps on persisted blogs are tested only
by the real database suite. Passing these tests alone does not prove connectivity.

## Real MongoDB tests

Start local MongoDB using [database setup](../database/README.md), then:

```sh
TEST_MONGODB_URI=mongodb://127.0.0.1:27017 \
  node --test tests/database/*.test.js
```

`TEST_MONGODB_URI` is deliberately separate from the normal `MONGODB_URI`.
The suite replaces its database component with a generated name of the form
`blog_cms_test_<32 random hex characters>`; authentication/query options remain.
It overrides `MONGODB_DB_NAME` and bypasses the developer env file. It never uses
an ordinary database as the cleanup target. The database user needs create/read/
write/drop privileges for generated test databases; prefer a local disposable
instance. Failed connectivity with a configured URI fails the suite rather than
being reported as a successful skip.

The real database test checks missing configuration, sanitized connection failure,
retry after failure, concurrent/repeated connection reuse, configuration mismatch,
saved data, timestamps, duplicate likes, invalid saves/query updates, serialization,
and seed reruns. It verifies that rerunning the seed preserves edits, timestamps
and unrelated records. The `t.after` hook drops only the generated database after
checking the actual connection name, then closes the connection. If the process
is forcibly terminated, a generated test database may remain; inspect its name
before any manual cleanup.

## Actual HTTP integration

Member 2's backend is absent in this checkout. Once delivered, identify its
actual JavaScript entry point and use it in place of the example below:

```sh
TEST_MONGODB_URI=mongodb://127.0.0.1:27017 \
API_TEST_ENTRY=server/src/server.js \
  node --test tests/integration/blog.integration.test.js
```

The suite starts the actual backend as a child process from `server/`, passes a
temporary HTTP port and generated database URI/name, waits for readiness, sends
real HTTP requests, and independently checks persisted MongoDB records. It shuts
down its child before dropping the generated database. No frontend is required
and it never attaches to an already-running developer API.

The backend must honor `PORT`, `MONGODB_URI` and `MONGODB_DB_NAME`, preserve injected
environment values, use the shared Blog collection/model, and not fork a detached
server. A compiled backend should be built using Member 2's instructions first;
point `API_TEST_ENTRY` at the compiled JavaScript. Backend dependency/configuration
issues must be fixed by Member 2, not by editing their files from this task.

The current health-path proposal is `/api/health`. If the team approves a different
path, set `API_TEST_HEALTH_PATH=/health` (or its agreed value). The suite covers:

1. Health JSON envelope.
2. Creation and independently verified database persistence.
3. Newest-first listing and individual retrieval.
4. Updates through HTTP and persistence checks.
5. Malformed IDs and nonexistent resources on all resource routes.
6. Like/unlike/like requests, distinct visitors and absence of duplicate IDs.
7. Comment fields, timestamps and persisted content.
8. Invalid comments/blogs/visitor IDs and error envelopes.
9. Deletion, independent absence check and subsequent 404.

The supplied brief leaves some API details unspecified. Tests assert the explicit
proposals in [API contract](API_CONTRACT.md#integration-conventions-requiring-member-1-and-member-2-confirmation).
Confirm these with both other members before treating disagreements as backend
defects. The suite does not claim to prove concurrent like-toggle correctness;
Member 2 must implement and test atomic operations. Backend stdout/stderr is
suppressed because it could include connection details; diagnose startup in a
separate terminal using an isolated database and safe logging.

## All tests and interpreting results

```sh
TEST_MONGODB_URI=mongodb://127.0.0.1:27017 \
API_TEST_ENTRY=server/src/server.js \
  node --test tests/database/*.test.js tests/integration/*.test.js
```

No `TEST_MONGODB_URI`: live database and HTTP suites explicitly skip. No usable
`API_TEST_ENTRY`: the HTTP suite explicitly skips. A skip is not a pass. There is
no fabricated HTTP server or mock-based claim of backend integration success.

## Verification recorded on 25 October 2026

Local runtime: Node 25.9.0, existing ancestor-installed Mongoose 9.5.0 and MongoDB
8.2.7. dotenv was absent from the checkout, so the required dotenv package was
installed only into `/private/tmp/blog-cms-verification` for verification. No
project dependency manifest/version or other member's files were changed.

The verification command uses that temporary dependency directory:

```sh
NODE_PATH=/private/tmp/blog-cms-verification/node_modules \
TEST_MONGODB_URI=mongodb://127.0.0.1:27029 \
  node --test tests/database/*.test.js tests/integration/*.test.js
```

The MongoDB instance ran locally on port 27029 using a temporary data directory,
with loopback-only binding and Unix sockets disabled. The desktop sandbox needed
network permission to start/connect to it. The first restricted run failed to
connect; the permitted final rerun passed real persistence and seed checks:
**26 passed, 0 failed, 1 skipped** (the HTTP suite). The database-independent
run passed **25 tests with 2 live suites skipped**, confirming the no-MongoDB
path also reports its limitations explicitly. `git diff --check` passed.

Atlas was not tested: the connector reports AI client access disabled for every
account organization. An Organization Owner must enable that access. This does
not affect the verified local MongoDB behavior. The actual HTTP suite was not run
because `server/` is absent. No backend endpoint defect has been observed or
reported to Member 2, and no messages were sent to teammates.

## Backend handoff and Git delivery

Member 2 needs to deliver the backend, approved dependencies, startup command and
health route, and confirm the marked HTTP conventions with Member 1. Future test
failures include method, path, submitted body and observed JSON for reproducible
handoff. Report that evidence to the owner; do not edit `server/` or `client/`.

Work stays on `feature/database-testing-docs`. The intended PR target is `main`,
which the team has not created. Per the user's instruction, Member 3 must not
create/modify/merge `main` or open a PR. The user will open the PR after the team
establishes `main`.
