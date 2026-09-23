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

Returns an access token and account details. Organization account tokens have `actorType: "ORGANIZATION_ACCOUNT"` and expire after 15 minutes.

#### Log in as an organization user

`POST /auth/user/login`

```json
{
  "organizationId": 1,
  "username": "alex",
  "password": "password123"
}
```

Returns an access token and user details. User accounts must have `ACTIVE` status. User tokens have `actorType: "USER"` and expire after 15 minutes.

Use a returned token with the standard header when calling routes that are wired to authentication middleware:

```http
Authorization: Bearer <access-token>
```

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

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/tickets` | List non-deleted tickets. |
| `GET` | `/tickets?status=OPEN&assignedUserId=1` | Filter tickets by status or assignee. |
| `GET` | `/tickets/:id` | Get a non-deleted ticket by ID. |
| `POST` | `/tickets` | Create a ticket. |
| `PATCH` | `/tickets/:id` | Change a ticket's status. |
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

Supported ticket statuses are `OPEN`, `IN_PROGRESS`, and `RESOLVED`. Ticket creation, status changes, and deletion write entries to `TicketHistory`. Deleted tickets remain in the database with `deletedAt` set and are excluded from normal ticket queries.

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

## Current status

- Authentication and JWT verification are implemented and enforced on the user routes under `/users`.
- Ticket routes are still not protected by `authenticate` middleware and currently use placeholder organization/user values (`1`) in the controller layer.
- User-related controllers already read `req.auth` for organization scope and current-user identity, but the ticket flow still needs to be migrated to the authenticated actor context before this is production-ready.
- Integration tests run against the configured database; for a safer workflow, use a dedicated test database so test records do not mix with development or production data.
