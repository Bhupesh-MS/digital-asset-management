# DAM Platform AWS Deployment

Terraform is organized for the current `develop` deployment under `terraform/environments/develop` and reusable modules under `terraform/modules`.

## Backend Setup

The S3 backend bucket must already exist. For GitHub Actions, set:

- Repository variable `TF_STATE_BUCKET`
- Repository variable `AWS_REGION`

The workflow passes those values into `terraform init`. For local runs, either edit the selected environment `backend.tf` or pass equivalent `-backend-config` values.

## GitHub Secrets

Add these repository or environment secrets for `develop`:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `DATABASE_PASSWORD` using 8-128 printable ASCII characters, excluding `/`, `@`, double quotes, and spaces. Example safe character set: letters, numbers, `_`, `-`, `.`, `#`, `%`, `+`, `=`.
- `RABBITMQ_PASSWORD` with at least 1 character
- `MINIO_ACCESS_KEY` with at least 3 characters
- `MINIO_SECRET_KEY` with at least 8 characters
- `JWT_SECRET` with at least 32 characters

## GitHub Variables

Add these repository or environment variables for `develop`:

- `AWS_REGION`
- `TF_STATE_BUCKET`
- `PROJECT_NAME` with `dam-platform`
- `DATABASE_NAME` with `dam`
- `DATABASE_SCHEMA` with `public`
- `DATABASE_USERNAME` with `dam`
- `RABBITMQ_USERNAME` with `dam`
- `MINIO_BUCKET` with `assets`
- `MINIO_PUBLIC_ENDPOINT` with your public MinIO host, public ECS task IP, or later a domain
- `MINIO_PUBLIC_PORT` with `9000`
- `CORS_ORIGIN` with the browser origin allowed to call the API
- `VITE_API_BASE_URL` with the browser-facing API URL, for example `http://PUBLIC_TASK_IP:3000`
- `API_BASE_URL` with the same browser-facing API URL, used by API docs metadata

Optional variables are supported and default to the local `.env.sample` values when omitted:

- `DATABASE_CONNECT_ATTEMPTS`
- `DATABASE_CONNECT_DELAY_MS`
- `MAX_JSON_PAYLOAD_SIZE`
- `LOG_LEVEL`
- `MINIO_USE_SSL`
- `MINIO_REGION`
- `MAX_ASSET_FILES`
- `MAX_ASSET_FILE_SIZE_BYTES`
- `UPLOAD_STREAM_CHUNK_SIZE_BYTES`
- `UPLOAD_TEMP_DIR`

## Generated Runtime Values

Do not add `DATABASE_URL` as a GitHub secret or variable for this Terraform deployment. Terraform builds it from:

- `DATABASE_USERNAME`
- `DATABASE_PASSWORD`
- `DATABASE_NAME`
- `DATABASE_SCHEMA`
- the RDS endpoint created by Terraform

Do not add `REDIS_URL` either. Redis runs as a container in the same ECS task, so Terraform sets it internally to `redis://localhost:6379`.

RabbitMQ and MinIO also run inside the same ECS task. Terraform sets the internal URLs/endpoints to localhost and uses only the username/password/access-key values from GitHub Secrets or Variables.

## Local Commands

Run helper scripts:

```bash
terraform/scripts/init.sh
terraform/scripts/validate.sh
terraform/scripts/plan.sh
terraform/scripts/apply.sh
terraform/scripts/destroy.sh
```

The committed `terraform.tfvars` files contain only safe defaults. Provide secret values through environment variables, GitHub Secrets, or an untracked tfvars file.
