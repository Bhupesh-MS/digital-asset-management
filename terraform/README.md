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
- `MINIO_PUBLIC_ENDPOINT` with the load balancer DNS name from `terraform output -raw alb_dns_name`
- `MINIO_PUBLIC_PORT` with `9000`
- `CORS_ORIGIN` with the browser origin allowed to call the API, for example `http://ALB_DNS_NAME`
- `VITE_API_BASE_URL` with the browser-facing API URL, for example `http://ALB_DNS_NAME:3000`
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

Terraform also appends `sslmode=require&uselibpqcompat=true` because the RDS PostgreSQL connection must use SSL when encryption is enforced by the database. ECS also sets `DATABASE_SSL=true` and `DATABASE_SSL_REJECT_UNAUTHORIZED=false` so the Prisma PostgreSQL adapter passes an explicit SSL config to the underlying `pg` pool.

Do not add `REDIS_URL` either. Redis runs as a container in the same ECS task, so Terraform sets it internally to `redis://localhost:6379`.

RabbitMQ and MinIO also run inside the same ECS task. Terraform sets the internal URLs/endpoints to localhost and uses only the username/password/access-key values from GitHub Secrets or Variables.

## Load Balancer Endpoint

The `develop` environment creates an internet-facing Application Load Balancer in front of the ECS service. Use the ALB DNS name instead of the ECS task public IP; the DNS name stays stable across task restarts and deployments.

Terraform outputs the public endpoints after apply:

```bash
terraform -chdir=terraform/environments/develop output -raw web_url
terraform -chdir=terraform/environments/develop output -raw api_url
terraform -chdir=terraform/environments/develop output -raw minio_url
```

The listeners are:

- Web: `http://ALB_DNS_NAME`
- API: `http://ALB_DNS_NAME:3000`
- MinIO API: `http://ALB_DNS_NAME:9000`

After the first deployment that creates the ALB, update GitHub variables to use the ALB DNS name:

- `VITE_API_BASE_URL`: `http://ALB_DNS_NAME:3000`
- `API_BASE_URL`: `http://ALB_DNS_NAME:3000`
- `CORS_ORIGIN`: `http://ALB_DNS_NAME`
- `MINIO_PUBLIC_ENDPOINT`: `ALB_DNS_NAME`
- `MINIO_PUBLIC_PORT`: `9000`

Run the deploy workflow once more after updating those variables so the web image is rebuilt with the stable API URL. ECS tasks run in private subnets without public IPs, so browser-facing traffic enters only through the ALB.

## Network Layout

The `develop` VPC creates separate public and private subnets. The internet-facing ALB uses the public subnets. ECS tasks and RDS use the private subnets. ECS tasks do not receive public IPs. Private AWS service access uses VPC endpoints for ECR, S3, CloudWatch Logs, and Secrets Manager, which lets Fargate pull private ECR images, write logs, and resolve ECS task secrets without a NAT gateway. The deploy workflow mirrors Redis, RabbitMQ, and MinIO into private ECR before updating ECS, so the app task does not need Docker Hub access from private subnets. RDS uses the private subnets through the database subnet group and has `publicly_accessible = false`, so PostgreSQL is reachable only from resources inside the VPC that are allowed by the RDS security group.

## ECS Secrets

Terraform creates AWS Secrets Manager entries for sensitive ECS values such as `DATABASE_URL`, `RABBITMQ_URL`, MinIO credentials, `JWT_SECRET`, and the database grant password. ECS references those values through each container's `secrets` block instead of plain environment variables.

The deploy workflow still passes the source values from GitHub Secrets into Terraform so Terraform can create or update the Secrets Manager versions. Keep the Terraform state backend private, encrypted, and tightly permissioned because secret versions are still represented in state.

To customize the private subnet ranges, set `private_subnet_cidrs`. Keep at least two CIDR blocks in different Availability Zones so the RDS subnet group remains valid.

## Database Grants

The deploy workflow runs a one-off ECS task before Prisma migrations to apply PostgreSQL privileges for the configured database user. The task runs inside the VPC with the ECS task security group, so it can reach the private RDS endpoint without exposing RDS publicly. The PostgreSQL client image is built and pushed to private ECR by the workflow so the task can start from private subnets without NAT.

The grant SQL is generated from Terraform variables:

- `DATABASE_NAME`
- `DATABASE_SCHEMA`
- `DATABASE_USERNAME`
- `DATABASE_PASSWORD`
- the RDS host and port created by Terraform

Do not hardcode database names or usernames in manual SQL for normal deployments. Update the GitHub variables/secrets instead, then rerun the deploy workflow.

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
