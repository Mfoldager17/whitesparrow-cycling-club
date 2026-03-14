# Whitesparrow Cycling Club

Full-stack monorepo for the Whitesparrow Cycling Club platform — a private web app for club members to organise rides and events.

## Tech Stack

| Layer    | Technology                                              |
|----------|---------------------------------------------------------|
| Backend  | NestJS · Prisma · PostgreSQL · Swagger / OpenAPI        |
| Frontend | Next.js 16 (App Router) · Tailwind CSS · React Query · Orval |
| Language | TypeScript throughout                                   |
| Database | PostgreSQL (local via Docker)                           |
| Storage  | MinIO (S3-compatible, local via Docker)                 |

---

## Project Structure

```
whitesparrow-cycling-club/
├── src/
│   ├── backend/          # NestJS REST API (port 3001)
│   └── frontend/         # Next.js app (port 3000)
├── docker-compose.yml    # PostgreSQL + MinIO
└── package.json          # npm workspaces root
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [Docker](https://www.docker.com/) (for the database and object storage)
- npm v10+

---

## Setup

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd whitesparrow-cycling-club
npm install
```

### 2. Start the database and object storage

```bash
docker-compose up -d
```

This starts:
- **PostgreSQL** at `localhost:5432`
- **MinIO** at `localhost:9000` (S3-compatible object storage for GPX files). The MinIO admin console is available at `localhost:9001`.

### 3. Configure environment variables

```bash
cp src/backend/.env.example src/backend/.env
cp src/frontend/.env.example src/frontend/.env.local
```

**`src/backend/.env`**

```env
DATABASE_URL="postgresql://whitesparrow:whitesparrow_dev@localhost:5432/whitesparrow"

JWT_SECRET=change-me-in-production-use-a-long-random-string
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=change-me-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d

MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin_dev
MINIO_BUCKET=whitesparrow

# Strava OAuth — get credentials from https://www.strava.com/settings/api
STRAVA_CLIENT_ID=your_strava_client_id
STRAVA_CLIENT_SECRET=your_strava_client_secret
STRAVA_REDIRECT_URI=http://localhost:3001/strava/callback

PORT=3001
```

**`src/frontend/.env.local`**

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 4. Run database migrations

```bash
cd src/backend
npx prisma migrate dev
cd ../..
```

### 5. (Optional) Seed the database

```bash
cd src/backend
npm run seed
cd ../..
```

---

## Running in Development

Start both backend and frontend with a single command from the root:

```bash
npm run dev
```

| Service          | URL                              |
|------------------|----------------------------------|
| Frontend         | http://localhost:3000            |
| Backend API      | http://localhost:3001            |
| Swagger UI       | http://localhost:3001/api/docs   |
| MinIO Console    | http://localhost:9001            |

Or run them individually:

```bash
# Backend only
npm run dev --workspace=src/backend

# Frontend only
npm run dev --workspace=src/frontend
```

---

## Regenerating API Types

Whenever the backend API changes, regenerate the typed frontend hooks:

> The backend must be running before you run this.

```bash
npm run generate:api
```

This calls [Orval](https://orval.dev), which reads the OpenAPI spec from `http://localhost:3001/api/docs-json` and writes fully typed React Query hooks to `src/frontend/src/api/generated/`.

---

## Building for Production

```bash
npm run build
```

Then start both services:

```bash
# Backend
cd src/backend && npm run start

# Frontend
cd src/frontend && npm run start
```

---

## Application Modules

### Backend

| Module          | Description                                                    |
|-----------------|----------------------------------------------------------------|
| `auth`          | JWT login / register / token refresh                           |
| `users`         | User profiles and admin management                             |
| `activities`    | Rides (members) and club events (admins)                       |
| `registrations` | Sign-up, waitlist, and cancellation logic                      |
| `comments`      | Activity comments                                              |
| `storage`       | MinIO S3 client — upload, delete, presigned URL generation     |
| `strava`        | Strava OAuth 2.0 integration with persistent per-user tokens   |

### Frontend Pages

| Route                   | Description                                          |
|-------------------------|------------------------------------------------------|
| `/`                     | Landing page                                         |
| `/login`                | Log in                                               |
| `/register`             | Create account                                       |
| `/activities`           | Calendar overview of upcoming rides                  |
| `/activities/[id]`      | Activity detail, sign-up, comments, GPX route        |
| `/my-rides`             | Your personal ride calendar                          |
| `/profile`              | Edit your profile · Connect / disconnect Strava      |
| `/admin/users`          | Admin: manage members                                |
| `/admin/activities`     | Admin: manage all activities                         |

---

## GPX Routes

Each activity can have a GPX route attached to it. Activity creators and admins can:

- **Upload a `.gpx` file** directly from their computer.
- **Import a route from Strava** (requires connecting a Strava account first).

Once a route is attached the activity detail page shows:
- An interactive **Leaflet map** with the track drawn on a CyclOSM tile layer.
- An **elevation profile chart** (distance vs. elevation) with gain/loss/max/min stats.
- Key stats: total distance, elevation gain, elevation loss, and maximum elevation.

GPX files are stored in MinIO (S3-compatible object storage).

---

## Strava Integration

Users can connect their Strava account on the **Profile** page. Once connected:

- Tokens are stored securely in the database and **auto-refreshed** when they are about to expire.
- Users can **import any of their Strava cycling routes** directly onto an activity — no GPX download/upload needed.
- Users can disconnect their Strava account at any time.

The OAuth flow uses an **HMAC-SHA256 signed state parameter** with a 10-minute expiry to prevent CSRF attacks.

To enable Strava integration, register an API application at [strava.com/settings/api](https://www.strava.com/settings/api) and set the callback domain to `localhost` for local development. Add the credentials to `src/backend/.env` as shown above.
