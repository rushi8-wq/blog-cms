# Fieldnotes frontend

## Run locally

From this `client/` directory:

```sh
npm install
```

Copy `.env.example` to `.env` and start Vite:

```sh
copy .env.example .env
npm run dev
```

In PowerShell, the copy command is `Copy-Item .env.example .env`.

By default, `VITE_USE_MOCK_API=true` uses the seeded in-memory API in `src/mocks/blogs.js`. It supports blog creation, editing, deletion, likes, and comments; mock data resets on a full page reload. The visitor ID used for likes is saved in browser local storage.

To connect to the Express API, set `VITE_USE_MOCK_API=false` and set `VITE_API_BASE_URL` to the API base URL (defaults to `http://localhost:5000/api`). API failures are displayed to the user; they do not switch the app to mock mode.

## Build

```sh
npm run build
npm run preview
```
