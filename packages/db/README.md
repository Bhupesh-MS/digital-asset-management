# @dam/db

Database package for the Digital Asset Management (DAM) platform.

This package utilizes Prisma ORM to interact with the PostgreSQL database. It exposes the generated Prisma client and database schemas for use across other services.

## Setup

Ensure you have PostgreSQL running. Run `pnpm install` and then `pnpm prisma generate` to generate the client.

## Commands

- `pnpm generate`: Generates Prisma Client.
- `pnpm push`: Pushes the Prisma schema state to the database.
- `pnpm studio`: Opens Prisma Studio.
