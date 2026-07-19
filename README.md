# DAM Platform

A modern Digital Asset Management (DAM) platform built using a robust, scalable monorepo architecture.

It features a React frontend, an Express REST API backend, RabbitMQ-based background workers for file processing, MinIO/S3 for object storage, and PostgreSQL for data persistence.

## Table of Contents

- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Local Development](#local-development)
  - [Infrastructure Setup](#1-infrastructure-setup)
  - [Database Setup](#2-database-setup)
  - [Running the Application](#3-running-the-application)
- [Testing](#testing)
- [Deployment](#deployment)

---

## Architecture

The platform uses **Turborepo** to manage multiple applications and shared packages:

```text
apps/
  web/       React + Tailwind UI
  api/       Express REST API
  worker/    RabbitMQ consumers for asset processing
packages/
  shared-types/     Shared TypeScript definitions
  shared-utils/     Common utilities
  rabbitmq/         Queue client package
  storage/          S3/MinIO client package
  asset-processing/ Asset operations (metadata, transcoding, thumbnails)
  logger/           Structured logging
  db/               Prisma client and configuration
infrastructure/
  docker/           Dockerfiles and compose configs
  swarm/            Docker Swarm deployment configs
  scripts/          Utility shell scripts
prisma/             Prisma schema and migrations
```

---

## Prerequisites

Before setting up the project, ensure you have the following installed:

- [Node.js](https://nodejs.org/en/) (v22 or later recommended)
- [pnpm](https://pnpm.io/) (v9+)
- [Docker & Docker Compose](https://www.docker.com/) (for running dependent services)

---

## Installation

1. **Clone the repository** and navigate to the root directory.
2. **Install dependencies** across the monorepo:

   ```sh
   pnpm install
   ```

3. **Set up Environment Variables**:
   A sample environment file is provided. Copy it to `.env`:
   ```sh
   cp .env.sample .env
   ```
   _(The default variables in `.env.sample` are pre-configured to work perfectly with the local Docker Compose setup)._

---

## Local Development

### 1. Infrastructure Setup

You need to spin up the required local services (PostgreSQL, MinIO, RabbitMQ, Redis). You can do this using the provided Docker Compose configuration.

To start the infrastructure services:

```sh
pnpm docker:up
```

_(This starts all services defined in `infrastructure/docker/docker-compose.yml` in detached mode)._

### 2. Database Setup

Once the PostgreSQL database is running, generate the Prisma client and push the schema to the database:

```sh
# Generate the Prisma client for @dam/db
pnpm --filter @dam/db generate

# Push the schema to your local database instance
pnpm exec prisma db push --schema=prisma/schema.prisma
```

### 3. Running the Application

To build and start the entire platform (Web, API, and Worker), run:

```sh
pnpm dev
```

This command uses Turbo to concurrently run the `dev` scripts in all apps and packages.

### Default Service URLs

- **Web App**: `http://localhost:5173`
- **REST API**: `http://localhost:3000`
- **RabbitMQ Management**: `http://localhost:15672` (u/p: dam/dam)
- **MinIO Console**: `http://localhost:9001` (u/p: damadmin/damadmin123)

---

## Testing

The project is thoroughly tested using `vitest` for the frontend and the native `node:test` runner for backend packages.

To run the complete test suite across all apps and packages:

```sh
pnpm test
```

### Test Coverage

We enforce strict test coverage. Running `pnpm test` automatically generates and prints the coverage reports.

- Frontend uses `vitest run --coverage`.
- Backend uses the native `tsx --experimental-test-coverage --test`.

_Note: If tests are cached by Turbo, you can force a full run with `pnpm test --force`._

---

## Deployment

AWS deployment uses Terraform and GitHub Actions. The `develop` environment creates an Application Load Balancer in front of ECS, so GitHub variables should use the stable ALB DNS name instead of a changing ECS task public IP.

Public AWS endpoints:

- **Web App**: `http://ALB_DNS_NAME`
- **REST API**: `http://ALB_DNS_NAME:3000`
- **MinIO API**: `http://ALB_DNS_NAME:9000`

See [terraform/README.md](terraform/README.md) for the required GitHub Secrets/Variables and first-deployment steps.

## Deployment (Docker Swarm)

Production deployments use Docker Swarm.

1. **Build local images:**

   ```sh
   ./infrastructure/scripts/build-images.sh
   ```

2. **Deploy to swarm:**
   ```sh
   docker stack deploy -c infrastructure/swarm/stack.yml dam-platform
   ```

---

## API Usage Example

Check if the API is healthy:

```sh
curl http://localhost:3000/health
```

Upload a new asset (Note: Authorization might be required depending on your `.env` config):

```sh
curl -X POST http://localhost:3000/assets \
  -H "Content-Type: multipart/form-data" \
  -F "files=@/path/to/your/sample.jpg" \
  -F "tags=campaign,summer" \
  -F "category=marketing"
```
