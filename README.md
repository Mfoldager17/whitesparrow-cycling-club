# Whitesparrow Cycling Club

Full-stack monorepo for the Whitesparrow Cycling Club platform — a private web app for club members to organise rides and events.

## Tech Stack

| Layer    | Technology                                              |
|----------|---------------------------------------------------------|
| Backend  | NestJS · Prisma · PostgreSQL · Swagger / OpenAPI        |
| Frontend | Next.js 16 (App Router) · Tailwind CSS · React Query · Orval |
| Language | TypeScript throughout                                   |
| Database | PostgreSQL (local via Docker)                           |

---

## Project Structure

```
whitesparrow-cycling-club/
├── src/
│   ├── backend/          # NestJS REST API (port 3001)
│   └── frontend/         # Next.js app (port 3000)
├── docker-compose.yml    # PostgreSQL database
└── package.json          # npm workspaces root
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [Docker](https://www.docker.com/) (for the database)
- npm v10+

---

## Setup

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd whitesparrow-cycling-club
npm install
```

### 2. Start the database

```bash
docker-compose up -d
```

This starts a PostgreSQL instance accessible at `localhost:5432`.

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

| Service     | URL                              |
|-------------|----------------------------------|
| Frontend    | http://localhost:3000            |
| Backend API | http://localhost:3001            |
| Swagger UI  | http://localhost:3001/api/docs   |

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

| Module          | Description                                      |
|-----------------|--------------------------------------------------|
| `auth`          | JWT login / register / token refresh             |
| `users`         | User profiles and admin management               |
| `activities`    | Rides (members) and club events (admins)         |
| `registrations` | Sign-up, waitlist, and cancellation logic        |
| `comments`      | Activity comments                                |

### Frontend Pages

| Route                   | Description                          |
|-------------------------|--------------------------------------|
| `/`                     | Landing page                         |
| `/login`                | Log in                               |
| `/register`             | Create account                       |
| `/activities`           | Calendar overview of upcoming rides  |
| `/activities/[id]`      | Activity detail, sign-up, comments   |
| `/my-rides`             | Your personal ride calendar          |
| `/profile`              | Edit your profile                    |
| `/admin/users`          | Admin: manage members                |
| `/admin/activities`     | Admin: manage all activities         |


## Tech Stack

| Layer    | Technology                                 |
|----------|--------------------------------------------|
| Backend  | NestJS · Prisma · PostgreSQL · Swagger     |
| Frontend | Next.js 16 · Tailwind CSS · React Query · Orval |
| Language | TypeScript (everywhere)                    |

## Project Structure

```
whitesparrow-cycling-club/
├── src/
│   ├── backend/          # NestJS REST API
│   └── frontend/         # Next.js App Router
├── docker-compose.yml    # PostgreSQL database
└── package.json          # npm workspaces root
```

## Getting Started

### 1. Start the database

```bash
docker-compose up -d
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp src/backend/.env.example src/backend/.env
cp src/frontend/.env.example src/frontend/.env.local
```

Fill in the values in the `.env` files.

### 4. Run database migrations

```bash
cd src/backend
npx prisma migrate dev --name init
```

### 5. Start development servers

```bash
# From root — starts both backend and frontend
npm run dev
```

- Backend API: http://localhost:3001
- Swagger UI: http://localhost:3001/api/docs
- Frontend:   http://localhost:3000

### 6. Regenerate API types (after backend changes)

```bash
npm run generate:api
```

Orval reads the Swagger spec from `http://localhost:3001/api/docs-json` and regenerates the fully typed hooks in `src/frontend/src/api/generated/`.

## Modules

### Backend

| Module          | Description                              |
|-----------------|------------------------------------------|
| `auth`          | JWT login/register, refresh tokens       |
| `users`         | User profiles and admin management       |
| `activities`    | Events (admin) and rides (members)       |
| `registrations` | Sign-up, waitlist, cancellation logic    |
| `comments`      | Activity comments with soft delete       |

### Frontend Pages

| Route                      | Description                  |
|----------------------------|------------------------------|
| `/`                        | Landing page                 |
| `/login` · `/register`     | Authentication               |
| `/activities`              | Browse upcoming activities   |
| `/activities/[id]`         | Activity detail + sign-up    |
| `/my-rides`                | My registrations             |
| `/profile`                 | Edit profile                 |
| `/admin/users`             | Admin: manage members        |
| `/admin/activities`        | Admin: manage activities     |
