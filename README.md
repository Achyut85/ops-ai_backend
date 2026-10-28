# Ops AI API

A TypeScript REST API for organization accounts, users, and support tickets. The API uses Express 5, PostgreSQL through Prisma Next, Zod validation, Argon2 password hashing, and JWT access tokens.

## Requirements

- Node.js 20 or later
- PostgreSQL 15 or later

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file in the project root:

   ```env
   DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
   JWT_SECRET="replace-with-a-long-random-secret"
   PORT=3000
   ```

3. Generate the Prisma contract and apply the database migrations using the Prisma CLI workflow configured in `prisma.config.ts`:

   ```bash
   npm run contract:emit
   npx prisma migration status
   ```

   Apply the migrations from `migrations/app/` to your development database before starting the API.

4. Start the development server:

   ```bash
   npm run dev
   ```

The API is available at `http://localhost:3000/api/v1` by default.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the API with file watching. |
| `npm run build` | Compile TypeScript to `dist/`. |
| `npm run typecheck` | Type-check without emitting files. |
| `npm start` | Run the compiled server. |
| `npm test` | Run Vitest in watch mode. |
| `npm run test:run` | Run all tests once. |
| `npm run contract:emit` | Regenerate `src/prisma/contract.json` and `contract.d.ts`. |

## API

All routes are prefixed with `/api/v1`.

### Authentication

#### Register an organization account

`POST /auth/register`

```json
{
  "organizationName": "Acme Support",
  "email": "owner@acme.test",
  "password": "password123"
}
```

Creates an organization and its owner account. Email addresses are normalized to lowercase. The response contains the organization and account without the password hash.

#### Log in as an organization account

`POST /auth/login`

```json
{
  "email": "owner@acme.test",
  "password": "password123"
}
```

Returns a 15-minute access token and account details. The refresh token is stored in an HttpOnly cookie, not returned in JSON.

#### Log in as an organization user

`POST /auth/user/login`

```json
{
  "organizationId": 1,
  "username": "alex",
  "password": "password123"
}
```

Returns a 15-minute access token and user details. The refresh token is stored in an HttpOnly cookie, not returned in JSON. User accounts must have `ACTIVE` status.

#### Refresh an access token

`POST /auth/refresh`

Send the refresh cookie with the request. On browser `fetch`, use `credentials: "include"`. The endpoint rotates the refresh token and returns a new access token; each refresh token can be used only once. Reuse of an old token revokes that login session family.

#### Log out

`POST /auth/logout` revokes the login session associated with the refresh cookie and clears the cookie.

`POST /auth/logout-all` requires a bearer access token, revokes all refresh sessions for that account, and clears the current browser cookie. Existing access tokens remain valid until their 15-minute expiry.

Refresh sessions have a 30-day sliding idle expiry and a 90-day absolute maximum age from login. Each rotation extends the idle expiry but never the absolute expiry; after 90 days, the user must log in again. Only SHA-256 hashes of opaque refresh tokens are stored in the database.

For browser deployments, configure `COOKIE_SECURE=true` in production. `COOKIE_SAME_SITE` defaults to `lax`; use `none` with `COOKIE_SECURE=true` only when the frontend and API are cross-site. Set `CORS_ORIGINS` to a comma-separated list of exact frontend origins for cross-origin browser requests. The auth routes allow credentials only for the same origin or configured origins.

Use a returned token with the standard header when calling routes that are wired to authentication middleware:

```http
Authorization: Bearer <access-token>
```

### Organizations

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/organizations/me` | Get the organization profile for the authenticated user or organization account. |

This endpoint requires a bearer access token. It identifies the organization from the token; clients do not send an organization ID.

### Users

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/users` | List users. |
| `GET` | `/users/me` | Get the current user. |
| `GET` | `/users/:id` | Get a user by ID. |
| `POST` | `/users` | Create a user. |
| `PATCH` | `/users/me` | Update the current user's name or email. |
| `PATCH` | `/users/:id` | Update a user's name or email. |
| `PATCH` | `/users/:id/status` | Update a user's status. |

Create a user:

```json
{
  "username": "alex",
  "email": "alex@example.com",
  "name": "Alex Smith",
  "password": "password123"
}
```

New users are always created with role `TICKET_HANDLER` and status `ACTIVE`. Client-provided role and status values are ignored. Password hashes are never returned by the API.

### Tickets

All ticket endpoints require a valid bearer access token. Ticket data is scoped to the organization in that token. Organization accounts manage tickets; users can access only tickets assigned to them.

Ticket collection endpoints accept `page` (default `1`) and `limit` (default `20`, maximum `100`). Results are ordered newest first, with ticket ID as a tie-breaker. Responses contain `data` and `pagination` metadata (`page`, `limit`, `total`, and `totalPages`).

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/tickets?page=1&limit=20` | Organization account: list a page of non-deleted tickets. |
| `GET` | `/tickets?status=OPEN&assignedUserId=1&page=1&limit=20` | Organization account: filter and paginate tickets by status or assignee. |
| `GET` | `/tickets/me?page=1&limit=20` | User: list a page of tickets assigned to them. |
| `GET` | `/tickets/:id` | Organization account: get any ticket in its organization; user: get an assigned ticket. |
| `POST` | `/tickets` | Organization account: create and optionally assign a ticket. |
| `PATCH` | `/tickets/:id/assignment` | Organization account: assign or reassign a ticket; send `{"assignedUserId": 1}` or `{"assignedUserId": null}` to unassign. |
| `PATCH` | `/tickets/:id` | User: change status on a ticket assigned to them. |
| `GET` | `/tickets/:id/history` | Organization account: get history; user: get history for an assigned ticket. |
| `DELETE` | `/tickets/:id` | Organization account: soft-delete a ticket. |

Paginated collection response:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

Create a ticket:

```json
{
  "title": "Unable to sign in",
  "description": "The login page rejects my password.",
  "status": "OPEN",
  "assignedUserId": 1
}
```

Supported ticket statuses are `OPEN`, `IN_PROGRESS`, and `RESOLVED`. Ticket creation, status changes, assignment changes, and deletion write entries to `TicketHistory`. Assignment history stores `oldAssignedUserId` and `newAssignedUserId` (nullable) so assignment, reassignment, unassignment, and initial assignment can be audited. Deleted tickets remain in the database with `deletedAt` set and are excluded from normal ticket queries.

## Data model

The Prisma contract is defined in [`src/prisma/contract.prisma`](src/prisma/contract.prisma) and contains:

- `Organization`
- `OrganizationAccount`
- `User`
- `Ticket`
- `TicketHistory`

After changing the contract, regenerate the generated contract files:

```bash
npm run contract:emit
```

## Project structure

```text
src/
  controllers/   HTTP request and response handling
  services/      Business rules and transactions
  repositories/  Database access
  schemas/       Zod request validation
  prisma/        Prisma contract and database client
  routes/        Express route definitions
  middleware/    Authentication and error handling
  tests/         API and password tests
```

## Notes

- Ticket authorization uses the authenticated actor and organization from the access token.
- Integration tests run against the configured database; for a safer workflow, use a dedicated test database so test records do not mix with development or production data.
