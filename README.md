# Ops AI API

A TypeScript REST API for managing users and support tickets. It uses Express, PostgreSQL through Prisma ORM, Zod validation, and Argon2 password hashing.

## Requirements

- Node.js 20 or later
- A PostgreSQL database

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file and set the database connection string:

   ```env
   DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
   PORT=3000
   ```

3. Apply the project's Prisma migrations using the workflow configured for your database.

4. Start the development server:

   ```bash
   npm run dev
   ```

The API is available at `http://localhost:3000/api/v1` by default.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Run the API with file watching. |
| `npm run build` | Compile TypeScript to `dist/`. |
| `npm run typecheck` | Type-check without emitting files. |
| `npm start` | Run the compiled server. |
| `npm test` | Run Vitest in watch mode. |
| `npm run test:run` | Run the test suite once. |
| `npm run contract:emit` | Generate the Prisma ORM contract. |

## API

All routes are prefixed with `/api/v1`.

### Users

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/users` | List users in the current organization. |
| `GET` | `/users/me` | Get the current user. |
| `GET` | `/users/:id` | Get a user by ID. |
| `POST` | `/users` | Create a user. |
| `PATCH` | `/users/me` | Update the current user's name or email. |
| `PATCH` | `/users/:id` | Update a user's name or email. |
| `PATCH` | `/users/:id/status` | Set a user's status. |

Create a user:

```json
{
  "username": "alex",
  "email": "alex@example.com",
  "name": "Alex Smith",
  "password": "a-secure-password"
}
```

Users are created as `TICKET_HANDLER` with `ACTIVE` status. Client-provided role and status values are ignored.

### Tickets

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/tickets` | List active tickets. |
| `GET` | `/tickets?status=OPEN&assignedUserId=1` | Filter active tickets. |
| `GET` | `/tickets/:id` | Get an active ticket by ID. |
| `POST` | `/tickets` | Create a ticket. |
| `PATCH` | `/tickets/:id` | Change ticket status. |
| `GET` | `/tickets/:id/history` | Get ticket audit history. |
| `DELETE` | `/tickets/:id` | Soft-delete a ticket. |

Create a ticket:

```json
{
  "title": "Unable to sign in",
  "description": "The login page rejects my password.",
  "status": "OPEN",
  "assignedUserId": 1
}
```

Ticket statuses are `OPEN`, `IN_PROGRESS`, and `RESOLVED`. Creating, changing status, and deleting a ticket writes an audit entry to ticket history. Deletion is soft deletion, so deleted tickets are excluded from normal ticket queries.

## Project structure

```text
src/
  controllers/   HTTP request and response handling
  services/      Business rules and transactions
  repositories/  Database access
  schemas/       Zod request validation
  prisma/        Prisma contract and database client
  routes/        Express routes
  middleware/    Shared error handler
  tests/         API and password tests
```

## Current development assumptions

Authentication is not implemented yet. The controllers currently use organization ID `1`, and authenticated mutations use user ID `1`. Replace these values with identity and organization data from authentication middleware before deploying the API.

The test suite performs integration-style requests against the configured database. Use a dedicated test database to keep test records separate from development or production data.
