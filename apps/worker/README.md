# @dam/worker

Background worker service for the DAM platform.

This service listens to RabbitMQ queues and processes background tasks, such as generating video previews and extracting asset metadata.

## Setup

1. Ensure the PostgreSQL database, RabbitMQ, and MinIO are running.
2. Ensure environment variables are correctly set in `.env`.
3. Run `pnpm install`.
4. Run `pnpm run dev` to start the worker.
