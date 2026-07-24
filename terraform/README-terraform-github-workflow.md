# GitHub Workflow and Terraform Explanation

This README explains the deploy workflow in `.github/workflows/deploy-develop.yml` and the Terraform code under `terraform/`. It is written as a learning guide, so it explains what each important block does and gives examples of the Terraform commands used by this project.

## Big Picture

This repository deploys the DAM platform develop environment to AWS.

The GitHub workflow does this:

1. Runs when code is pushed to the `develop` branch.
2. Reads AWS, app, and secret values from GitHub Actions variables and secrets.
3. Initializes Terraform.
4. Creates ECR repositories first.
5. Builds Docker images for `web`, `api`, and `worker`.
6. Pushes those images to Amazon ECR.
7. Runs `terraform plan`.
8. Runs `terraform apply`.
9. Prints the deployed URLs.
10. Runs one-off ECS tasks for database grants and Prisma migrations.

The Terraform code creates this AWS infrastructure:

1. VPC, public subnets, private subnets, internet gateway, and route tables.
2. Security groups for the load balancer, ECS tasks, RDS, and EFS.
3. EFS file system and access points for Redis, RabbitMQ, and MinIO data.
4. Application Load Balancer listeners and target groups.
5. ECR repositories for Docker images.
6. ECS cluster and ECS Fargate service.
7. RDS PostgreSQL database.
8. ECS task definitions for the app, database grants, and migrations.

## GitHub Workflow: `.github/workflows/deploy-develop.yml`

### Workflow Name

```yaml
name: Deploy Develop
```

This is the display name shown in the GitHub Actions UI.

### Trigger

```yaml
on:
  push:
    branches:
      - develop
```

This workflow runs whenever someone pushes commits to the `develop` branch.

### Concurrency

```yaml
concurrency:
  group: deploy-develop
  cancel-in-progress: false
```

This prevents multiple develop deployments from running at the same time. If one deployment is running and another starts, GitHub queues it instead of cancelling the running deployment.

### Permissions

```yaml
permissions:
  contents: read
```

The workflow only needs read access to repository contents. AWS access is handled separately using AWS secrets.

### Environment Variables

```yaml
env:
  AWS_REGION: ${{ vars.AWS_REGION }}
  TF_IN_AUTOMATION: true
  TF_INPUT: false
  TF_VAR_aws_region: ${{ vars.AWS_REGION }}
```

These variables are available to all workflow steps.

Important Terraform behavior:

```text
TF_VAR_aws_region
```

automatically becomes the Terraform variable:

```hcl
variable "aws_region" {
  type = string
}
```

So this workflow passes Terraform inputs by setting `TF_VAR_*` environment variables.

Examples:

```yaml
TF_VAR_database_password: ${{ secrets.DATABASE_PASSWORD }}
TF_VAR_minio_bucket: ${{ vars.MINIO_BUCKET || 'assets' }}
TF_VAR_environment: develop
```

These become:

```hcl
var.database_password
var.minio_bucket
var.environment
```

Secrets such as database password, MinIO keys, RabbitMQ password, and JWT secret come from GitHub Actions secrets. Non-secret configuration such as region, project name, and ports comes from GitHub Actions variables.

### Job Definition

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: develop
```

This creates one job named `deploy`. It runs on a GitHub-hosted Ubuntu runner and uses the GitHub Actions environment named `develop`.

### Checkout Step

```yaml
- name: Checkout
  uses: actions/checkout@v4
```

Downloads the repository code into the GitHub Actions runner.

### Configure AWS Credentials

```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws-region: ${{ vars.AWS_REGION }}
```

Logs the runner into AWS so later commands can create infrastructure, push ECR images, and run ECS tasks.

### Validate Deployment Inputs

```yaml
- name: Validate deployment inputs
  run: |
    if [ -z "$TF_VAR_database_password" ]; then
      echo "DATABASE_PASSWORD secret must be set."
      exit 1
    fi
```

This shell script checks that required secrets are present and have valid minimum lengths. If a value is missing or too short, the workflow exits early before Terraform or Docker does anything.

Examples:

```sh
if [ ${#TF_VAR_jwt_secret} -lt 32 ]; then
  echo "JWT_SECRET secret must be at least 32 characters."
  exit 1
fi
```

`${#TF_VAR_jwt_secret}` means "length of this shell variable".

### Setup Terraform

```yaml
- name: Setup Terraform
  uses: hashicorp/setup-terraform@v3
  with:
    terraform_version: 1.8.5
```

Installs Terraform version `1.8.5` in the runner.

### Terraform Init

```yaml
- name: Terraform init
  working-directory: terraform/environments/develop
  run: terraform init -backend-config="bucket=${{ vars.TF_STATE_BUCKET }}" -backend-config="region=${{ vars.AWS_REGION }}"
```

Runs Terraform inside the develop environment directory. `terraform init` downloads providers and configures the remote S3 backend used to store Terraform state.

The workflow overrides these placeholders from `backend.tf`:

```hcl
bucket = "REPLACE_WITH_TERRAFORM_STATE_BUCKET"
region = "REPLACE_WITH_AWS_REGION"
```

with real GitHub Actions variable values.

### Terraform Validate

```yaml
- name: Terraform validate
  working-directory: terraform/environments/develop
  run: terraform validate
```

Checks that the Terraform files are syntactically valid and internally consistent.

### Ensure ECR Repositories Exist

```yaml
- name: Ensure ECR repositories exist
  working-directory: terraform/environments/develop
  run: terraform apply -auto-approve -target=module.ecr
```

This applies only the ECR module first. The Docker images cannot be pushed until the ECR repositories exist.

`-target=module.ecr` tells Terraform to focus only on the `module "ecr"` block.

### Read ECR Repository URLs

```yaml
- name: Read ECR repository URLs
  id: ecr
  working-directory: terraform/environments/develop
  run: |
    echo "web_repo=$(terraform output -raw ecr_web_repository_url)" >> "$GITHUB_OUTPUT"
```

Reads Terraform outputs and stores them as GitHub step outputs.

Example:

```yaml
${{ steps.ecr.outputs.web_repo }}
```

can be used by later workflow steps.

### Login to Amazon ECR

```yaml
- name: Login to Amazon ECR
  uses: aws-actions/amazon-ecr-login@v2
```

Logs Docker into Amazon ECR so the runner can push images.

### Build and Push Docker Images

```yaml
- name: Build and push web image
  run: |
    docker build \
      --build-arg VITE_API_BASE_URL="${{ vars.VITE_API_BASE_URL }}" \
      -f infrastructure/docker/web.Dockerfile \
      -t "${{ steps.ecr.outputs.web_repo }}:${{ github.sha }}" \
      .
    docker push "${{ steps.ecr.outputs.web_repo }}:${{ github.sha }}"
```

Builds the frontend Docker image and tags it with the current commit SHA.

Example tag:

```text
123456789012.dkr.ecr.ap-south-1.amazonaws.com/dam-platform-develop-web:abc123
```

The API and worker steps do the same thing with their own Dockerfiles and ECR repositories.

### Terraform Plan

```yaml
- name: Terraform plan
  working-directory: terraform/environments/develop
  env:
    TF_VAR_web_image: ${{ steps.ecr.outputs.web_repo }}:${{ github.sha }}
    TF_VAR_api_image: ${{ steps.ecr.outputs.api_repo }}:${{ github.sha }}
    TF_VAR_worker_image: ${{ steps.ecr.outputs.worker_repo }}:${{ github.sha }}
  run: terraform plan
```

Shows what Terraform will create, update, or destroy. This plan uses the newly built image URLs.

### Terraform Apply

```yaml
- name: Terraform apply
  working-directory: terraform/environments/develop
  env:
    TF_VAR_web_image: ${{ steps.ecr.outputs.web_repo }}:${{ github.sha }}
    TF_VAR_api_image: ${{ steps.ecr.outputs.api_repo }}:${{ github.sha }}
    TF_VAR_worker_image: ${{ steps.ecr.outputs.worker_repo }}:${{ github.sha }}
  run: terraform apply -auto-approve
```

Applies the infrastructure changes without asking for manual approval. This deploys the app using the new images.

### Show Load Balancer URLs

```yaml
- name: Show load balancer URLs
  working-directory: terraform/environments/develop
  run: |
    echo "Web URL: $(terraform output -raw web_url)"
    echo "API URL: $(terraform output -raw api_url)"
    echo "MinIO URL: $(terraform output -raw minio_url)"
```

Prints useful deployment URLs from Terraform outputs.

### Run Database Grants

```yaml
- name: Run database grants
  working-directory: terraform/environments/develop
  run: |
    CLUSTER_NAME="$(terraform output -raw ecs_cluster_name)"
    TASK_DEFINITION="$(terraform output -raw database_grants_task_definition_arn)"
```

This starts a one-off ECS Fargate task that grants PostgreSQL permissions to the application user.

Important commands:

```sh
aws ecs run-task
aws ecs wait tasks-stopped
aws ecs describe-tasks
```

The workflow waits for the task to finish, checks the container exit code, and fails the deployment if the grants task failed.

### Run Database Migrations

```yaml
- name: Run database migrations
  working-directory: terraform/environments/develop
  run: |
    TASK_DEFINITION="$(terraform output -raw migration_task_definition_arn)"
```

This starts another one-off ECS Fargate task. That task runs:

```sh
pnpm exec prisma migrate deploy --schema prisma/schema.prisma
```

It applies Prisma database migrations to the RDS PostgreSQL database.

## Terraform Code Structure

```text
terraform/
  environments/
    develop/
      backend.tf
      versions.tf
      providers.tf
      locals.tf
      variables.tf
      terraform.tfvars
      main.tf
      outputs.tf
  modules/
    app-ecs/
    ecr/
    ecs-cluster/
    minio/
    rabbitmq/
    rds/
    redis/
```

The `environments/develop` directory is the deployable Terraform root module. It calls reusable modules from `terraform/modules`.

## Terraform Language Basics Used Here

### Variables

```hcl
variable "aws_region" {
  description = "AWS region for all resources."
  type        = string
}
```

A variable is an input. This project passes many variables from GitHub Actions using `TF_VAR_*`.

### Locals

```hcl
locals {
  name_prefix = "${var.project_name}-${var.environment}"
}
```

A local is a reusable calculated value inside Terraform. Here it creates names like `dam-platform-develop`.

### Resources

```hcl
resource "aws_vpc" "this" {
  cidr_block = var.vpc_cidr
}
```

A resource creates or manages real infrastructure. This example creates an AWS VPC.

### Data Sources

```hcl
data "aws_availability_zones" "available" {
  state = "available"
}
```

A data source reads information from the provider. This reads available AWS Availability Zones.

### Modules

```hcl
module "ecr" {
  source = "../../modules/ecr"
}
```

A module is a reusable group of Terraform files. This root environment uses modules for ECR, ECS, RDS, Redis, RabbitMQ, MinIO, and the app service.

### Outputs

```hcl
output "web_url" {
  value = "http://${aws_lb.app.dns_name}"
}
```

An output exposes a value after Terraform runs. The GitHub workflow reads outputs with `terraform output`.

### `for_each`

```hcl
for_each = { for index, cidr in var.public_subnet_cidrs : tostring(index) => cidr }
```

This creates one resource instance per subnet CIDR. If there are two CIDRs, Terraform creates two public subnets.

### `dynamic`

```hcl
dynamic "load_balancer" {
  for_each = var.web_target_group_arn == null ? [] : [var.web_target_group_arn]
}
```

A dynamic block generates nested configuration only when needed. Here the ECS service adds a load balancer mapping only if a target group ARN was provided.

### `jsonencode`

```hcl
policy = jsonencode({
  rules = []
})
```

Converts Terraform objects into JSON strings. This is useful for IAM policies, ECR lifecycle policies, and ECS container definitions.

### `templatefile`

```hcl
container_definitions = templatefile("${path.module}/templates/task-definition.json.tpl", {
  web_image = var.web_image
})
```

Loads a template file and replaces placeholders with Terraform values. The `app-ecs` module uses it to generate the ECS container definition JSON.

## Develop Environment Files

### `backend.tf`

```hcl
terraform {
  backend "s3" {
    bucket  = "REPLACE_WITH_TERRAFORM_STATE_BUCKET"
    key     = "dam-platform/develop/terraform.tfstate"
    region  = "REPLACE_WITH_AWS_REGION"
    encrypt = true
  }
}
```

This configures Terraform state storage in S3.

Terraform state records which AWS resources belong to this project. The workflow provides the real bucket and region at runtime:

```sh
terraform init -backend-config="bucket=..." -backend-config="region=..."
```

### `versions.tf`

```hcl
terraform {
  required_version = ">= 1.6.0"
}
```

Requires Terraform CLI version `1.6.0` or newer.

```hcl
required_providers {
  aws = {
    source  = "hashicorp/aws"
    version = "~> 5.0"
  }
}
```

Requires the AWS provider from HashiCorp, using compatible `5.x` versions.

### `providers.tf`

```hcl
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.common_tags
  }
}
```

Configures the AWS provider. All supported AWS resources receive default tags:

```text
Project, Environment, ManagedBy
```

### `locals.tf`

```hcl
name_prefix = "${var.project_name}-${var.environment}"
```

Creates a standard name prefix such as `dam-platform-develop`.

```hcl
alb_name = "${substr(local.name_prefix, 0, 28)}-alb"
tg_prefix = substr(local.name_prefix, 0, 26)
```

Shortens names so AWS load balancer and target group name limits are not exceeded.

```hcl
database_url = "postgresql://${var.database_username}:${urlencode(var.database_password)}@${module.rds.address}:${module.rds.port}/${var.database_name}?schema=${var.database_schema}"
```

Builds the PostgreSQL connection URL used by the API and worker. `urlencode` makes special characters safe inside a URL.

```hcl
rabbitmq_url = "amqp://${var.rabbitmq_username}:${urlencode(var.rabbitmq_password)}@localhost:5672"
```

Builds the RabbitMQ connection URL. It uses `localhost` because RabbitMQ runs in the same ECS task as the API and worker containers.

### `variables.tf`

This file declares all input variables for the develop environment.

Examples:

```hcl
variable "vpc_cidr" {
  type    = string
  default = "10.20.0.0/16"
}
```

Defines the CIDR range for the VPC.

```hcl
variable "public_subnet_cidrs" {
  type    = list(string)
  default = ["10.20.1.0/24", "10.20.2.0/24"]
}
```

Defines two public subnets.

```hcl
variable "private_subnet_cidrs" {
  type    = list(string)
  default = ["10.20.101.0/24", "10.20.102.0/24"]
}
```

Defines two private subnets used by private infrastructure such as RDS.

```hcl
variable "database_password" {
  type      = string
  sensitive = true
}
```

Marks the database password as sensitive so Terraform hides it in most CLI output.

```hcl
validation {
  condition = length(var.jwt_secret) >= 32
}
```

Rejects invalid input before Terraform creates resources.

### `terraform.tfvars`

```hcl
project_name = "dam-platform"
environment  = "develop"
```

Provides default values for local Terraform runs. The file is intentionally safe to commit because it does not contain secrets.

For secrets, use environment variables or an untracked tfvars file.

### `main.tf`

This is the main infrastructure file for the develop environment.

#### Availability Zones

```hcl
data "aws_availability_zones" "available" {
  state = "available"
}
```

Finds available Availability Zones in the selected AWS region.

#### VPC

```hcl
resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
}
```

Creates the network boundary for the environment. DNS support is enabled so AWS services and ECS tasks can resolve hostnames.

#### Internet Gateway

```hcl
resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id
}
```

Gives the VPC a path to the public internet.

#### VPC Endpoints

```hcl
resource "aws_vpc_endpoint" "ecr_api" {}
resource "aws_vpc_endpoint" "ecr_dkr" {}
resource "aws_vpc_endpoint" "logs" {}
resource "aws_vpc_endpoint" "secretsmanager" {}
resource "aws_vpc_endpoint" "s3" {}
```

Gives private ECS tasks access to ECR, S3, CloudWatch Logs, and Secrets Manager without assigning public IPs or using a NAT gateway.

#### Public Subnets

```hcl
resource "aws_subnet" "public" {
  for_each = { for index, cidr in var.public_subnet_cidrs : tostring(index) => cidr }
}
```

Creates one public subnet for each CIDR in `var.public_subnet_cidrs`.

```hcl
map_public_ip_on_launch = true
```

Instances or tasks launched in this subnet can receive public IPs.

#### Private Subnets

```hcl
resource "aws_subnet" "private" {
  for_each = { for index, cidr in var.private_subnet_cidrs : tostring(index) => cidr }
}
```

Creates one private subnet for each CIDR in `var.private_subnet_cidrs`.

```hcl
map_public_ip_on_launch = false
```

Resources launched in these subnets do not automatically receive public IPs.

#### Public Route Table

```hcl
route {
  cidr_block = "0.0.0.0/0"
  gateway_id = aws_internet_gateway.this.id
}
```

Routes outbound internet traffic through the internet gateway.

#### Private Route Table

```hcl
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.this.id
}
```

Creates a route table for private subnets. It keeps only the implicit local VPC route plus routes added by gateway endpoints such as S3. There is no direct route to the internet gateway and no NAT route.

#### Route Table Associations

```hcl
resource "aws_route_table_association" "public" {
  for_each = aws_subnet.public
}
```

Attaches the public route table to every public subnet.

```hcl
resource "aws_route_table_association" "private" {
  for_each = aws_subnet.private
}
```

Attaches the private route table to every private subnet.

#### Security Groups

`aws_security_group.ecs_task` allows traffic from the load balancer to ECS containers on:

```text
80    web
3000  API
9000  MinIO API
```

`aws_security_group.alb` allows public traffic to the load balancer on the same ports.

`aws_security_group.rds` allows PostgreSQL traffic on port `5432`, but only from ECS tasks.

`aws_security_group.efs` allows NFS traffic on port `2049`, but only from ECS tasks.

#### EFS

```hcl
resource "aws_efs_file_system" "this" {
  encrypted       = true
  throughput_mode = "bursting"
}
```

Creates encrypted shared storage for persistent container data.

```hcl
resource "aws_efs_mount_target" "public" {
  for_each = aws_subnet.public
}
```

Creates an EFS mount target in each subnet so ECS tasks can mount EFS.

#### Application Load Balancer

```hcl
resource "aws_lb" "app" {
  internal           = false
  load_balancer_type = "application"
}
```

Creates a public Application Load Balancer.

#### Target Groups

```hcl
resource "aws_lb_target_group" "web" {
  port        = 80
  protocol    = "HTTP"
  target_type = "ip"
}
```

Creates a load balancer target group for the web container.

There are three target groups:

```text
web    port 80    health check /
api    port 3000  health check /health
minio  port 9000  health check /minio/health/live
```

`target_type = "ip"` is used because ECS Fargate tasks register by IP address.

#### Listeners

```hcl
resource "aws_lb_listener" "web" {
  port     = 80
  protocol = "HTTP"
}
```

Listeners receive traffic on the load balancer and forward it to target groups.

This project exposes:

```text
80    web
3000  API
9000  MinIO
```

#### Module Calls

```hcl
module "ecr" {
  source = "../../modules/ecr"
}
```

Creates ECR repositories.

```hcl
module "ecs_cluster" {
  source = "../../modules/ecs-cluster"
}
```

Creates the ECS cluster.

```hcl
module "redis" {
  source = "../../modules/redis"
}
```

Creates the Redis EFS access point.

```hcl
module "rabbitmq" {
  source = "../../modules/rabbitmq"
}
```

Creates the RabbitMQ EFS access point.

```hcl
module "minio" {
  source = "../../modules/minio"
}
```

Creates the MinIO EFS access point.

```hcl
module "rds" {
  source = "../../modules/rds"
}
```

Creates PostgreSQL on RDS.

```hcl
module "app_ecs" {
  source = "../../modules/app-ecs"
}
```

Creates ECS task definitions and the ECS service.

```hcl
depends_on = [
  aws_efs_mount_target.public,
  aws_lb_listener.web,
  aws_lb_listener.api,
  aws_lb_listener.minio
]
```

Forces Terraform to create EFS mount targets and load balancer listeners before creating the ECS service.

### `outputs.tf`

Outputs expose useful values after deployment.

Examples:

```hcl
output "web_url" {
  value = "http://${aws_lb.app.dns_name}"
}
```

The frontend URL.

```hcl
output "ecr_web_repository_url" {
  value = module.ecr.repository_urls["web"]
}
```

The ECR URL used by the workflow when building and pushing the web image.

```hcl
output "migration_task_definition_arn" {
  value = module.app_ecs.migration_task_definition_arn
}
```

The ECS task definition ARN used by the workflow to run Prisma migrations.

## Terraform Modules

### `modules/ecr`

Creates one ECR repository for each image name:

```hcl
for_each = var.image_names
```

Default image names are:

```text
web
api
worker
```

Repository names look like:

```text
dam-platform-develop-web
dam-platform-develop-api
dam-platform-develop-worker
```

This module also enables:

```hcl
scan_on_push = true
```

so AWS scans pushed images for vulnerabilities.

It creates a lifecycle policy:

```hcl
countNumber = 30
```

which keeps only the last 30 pushed images.

### `modules/ecs-cluster`

```hcl
resource "aws_ecs_cluster" "this" {
  name = var.name
}
```

Creates an ECS cluster.

```hcl
containerInsights = "enabled"
```

Enables CloudWatch Container Insights for better ECS metrics.

### `modules/rds`

```hcl
resource "aws_db_subnet_group" "this" {
  subnet_ids = var.subnet_ids
}
```

Groups subnets where RDS can run.

```hcl
resource "aws_db_instance" "this" {
  engine              = "postgres"
  storage_encrypted   = true
  publicly_accessible = false
}
```

Creates a private, encrypted PostgreSQL RDS database.

### `modules/redis`

```hcl
resource "aws_efs_access_point" "this" {
  root_directory {
    path = "/redis"
  }
}
```

Creates an EFS access point for Redis data at `/redis`.

### `modules/rabbitmq`

```hcl
resource "aws_efs_access_point" "this" {
  root_directory {
    path = "/rabbitmq"
  }
}
```

Creates an EFS access point for RabbitMQ data at `/rabbitmq`.

### `modules/minio`

```hcl
resource "aws_efs_access_point" "this" {
  root_directory {
    path = "/minio"
  }
}
```

Creates an EFS access point for MinIO object storage data at `/minio`.

### `modules/app-ecs`

This is the main application runtime module.

#### Shared App Environment

```hcl
shared_app_environment = [
  { name = "NODE_ENV", value = "production" },
  { name = "DATABASE_URL", value = var.database_url }
]
```

Builds environment variables shared by the API and worker containers.

#### CloudWatch Logs

```hcl
resource "aws_cloudwatch_log_group" "this" {
  name              = "/ecs/${var.name_prefix}"
  retention_in_days = 14
}
```

Creates a CloudWatch log group and keeps logs for 14 days.

#### IAM Roles

```hcl
resource "aws_iam_role" "execution" {}
resource "aws_iam_role" "task" {}
```

The execution role lets ECS pull images and write logs. The task role is the role available to running application containers.

#### Main ECS Task Definition

```hcl
resource "aws_ecs_task_definition" "this" {
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
}
```

Defines the long-running ECS Fargate task.

```hcl
container_definitions = templatefile("${path.module}/templates/task-definition.json.tpl", ...)
```

Generates the container list from `templates/task-definition.json.tpl`.

#### EFS Volumes

```hcl
volume {
  name = "redis-data"
}
```

Defines persistent volumes for:

```text
redis-data
rabbitmq-data
minio-data
```

Each volume uses the shared EFS file system and a service-specific access point.

#### Migration Task Definition

```hcl
resource "aws_ecs_task_definition" "migration" {
  command = ["pnpm", "exec", "prisma", "migrate", "deploy", "--schema", "prisma/schema.prisma"]
}
```

Defines a one-off task that applies Prisma migrations.

#### Database Grants Task Definition

```hcl
resource "aws_ecs_task_definition" "database_grants" {}
```

Defines a one-off task using the configured PostgreSQL client image. The deploy workflow builds that image from `postgres:16-alpine` and pushes it to private ECR so the task can run from private subnets without NAT.

The long-running app task also uses private ECR image URIs for Redis, RabbitMQ, and MinIO. The deploy workflow pulls the pinned public images on the GitHub-hosted runner, tags them with the current commit SHA, and pushes them to private ECR before Terraform updates the ECS task definition.

#### ECS Service

```hcl
resource "aws_ecs_service" "this" {
  desired_count = var.desired_count
  launch_type   = "FARGATE"
}
```

Runs and maintains the main application task.

The service connects containers to target groups:

```text
web   -> web target group
api   -> api target group
minio -> minio target group
```

#### Task Definition Template

`templates/task-definition.json.tpl` defines six containers in one ECS task:

```text
redis
rabbitmq
minio
api
worker
web
```

Redis:

```json
"image": "${redis_image}"
```

Runs Redis and mounts `/data` from EFS.

RabbitMQ:

```json
"image": "${rabbitmq_image}"
```

Runs RabbitMQ and mounts `/var/lib/rabbitmq` from EFS.

MinIO:

```json
"image": "${minio_image}"
```

Runs MinIO with data stored at `/data`.

API:

```json
"image": "${api_image}"
```

Runs the API image built by GitHub Actions.

Worker:

```json
"image": "${worker_image}"
```

Runs the background worker image built by GitHub Actions.

Web:

```json
"image": "${web_image}"
```

Runs the frontend image built by GitHub Actions.

Container dependencies make startup more reliable:

```json
"dependsOn": [
  { "containerName": "redis", "condition": "HEALTHY" },
  { "containerName": "rabbitmq", "condition": "HEALTHY" }
]
```

The API waits for Redis and RabbitMQ. The web container waits for the API to start.

## AWS Services Used

This project uses several AWS services together. Terraform creates most of them, and the GitHub workflow uses some of them during deployment.

### Amazon VPC

Terraform resources:

```hcl
aws_vpc
aws_subnet
aws_internet_gateway
aws_route_table
aws_route_table_association
```

Amazon VPC is the private network where the application's AWS resources live.

In this project, the VPC is created with:

```hcl
cidr_block = var.vpc_cidr
```

The default CIDR is:

```text
10.20.0.0/16
```

That means all resources inside this VPC use private IP addresses from that range.

Public subnets are created from:

```hcl
public_subnet_cidrs = ["10.20.1.0/24", "10.20.2.0/24"]
```

The internet gateway and route table make those subnets public by routing:

```text
0.0.0.0/0 -> internet gateway
```

This is why the Application Load Balancer and ECS tasks can be reached from the internet.

### Availability Zones

Terraform data source:

```hcl
data "aws_availability_zones" "available"
```

Availability Zones are separate data center locations inside an AWS region.

The Terraform code reads available zones and places public subnets across them:

```hcl
availability_zone = data.aws_availability_zones.available.names[tonumber(each.key)]
```

Using more than one subnet in different Availability Zones improves availability because the application is not tied to only one zone.

### Security Groups

Terraform resources:

```hcl
aws_security_group.ecs_task
aws_security_group.alb
aws_security_group.rds
aws_security_group.efs
```

Security groups act like virtual firewalls.

The load balancer security group allows public traffic on:

```text
80    web
3000  API
9000  MinIO API
```

The ECS task security group allows traffic only from the load balancer on those same application ports.

The RDS security group allows PostgreSQL traffic:

```text
5432 from ECS tasks only
```

The EFS security group allows NFS file system traffic:

```text
2049 from ECS tasks only
```

This means the public can reach the load balancer, but the database and file system are protected from direct public access.

### Elastic Load Balancing: Application Load Balancer

Terraform resources:

```hcl
aws_lb
aws_lb_target_group
aws_lb_listener
```

The Application Load Balancer is the public entry point for the deployed app.

It receives browser or API traffic and forwards it to the correct ECS container.

This project creates three listeners:

```text
Port 80    -> web target group
Port 3000  -> API target group
Port 9000  -> MinIO target group
```

Target groups tell the load balancer where to send traffic.

Health checks tell AWS whether a container is healthy:

```text
web    /
api    /health
minio  /minio/health/live
```

If a target becomes unhealthy, the load balancer stops sending traffic to it until it recovers.

### Amazon ECS

Terraform resources:

```hcl
aws_ecs_cluster
aws_ecs_task_definition
aws_ecs_service
```

Amazon ECS runs containers.

In this project, ECS runs the application using AWS Fargate, so there are no EC2 servers to manage manually.

The ECS cluster is the logical place where tasks and services run:

```hcl
resource "aws_ecs_cluster" "this"
```

The ECS task definition describes the containers:

```text
redis
rabbitmq
minio
api
worker
web
```

The ECS service keeps the main application task running:

```hcl
desired_count = var.desired_count
```

If `desired_count = 1`, ECS keeps one copy of the task running. If it crashes, ECS starts a replacement.

The GitHub workflow also uses ECS to run one-off tasks:

```sh
aws ecs run-task
```

Those one-off tasks are used for:

```text
database grants
Prisma migrations
```

### AWS Fargate

Terraform setting:

```hcl
requires_compatibilities = ["FARGATE"]
launch_type              = "FARGATE"
```

Fargate is the serverless compute engine for ECS.

Without Fargate, you would need to create and maintain EC2 instances for containers. With Fargate, AWS starts the compute capacity needed for each ECS task.

This project configures CPU and memory with:

```hcl
task_cpu    = 4096
task_memory = 8192
```

That gives the combined application task CPU and memory for all six containers.

### Amazon ECR

Terraform resources:

```hcl
aws_ecr_repository
aws_ecr_lifecycle_policy
```

Amazon ECR stores Docker images.

This project creates three repositories:

```text
dam-platform-develop-web
dam-platform-develop-api
dam-platform-develop-worker
```

The GitHub workflow builds Docker images and pushes them to ECR:

```sh
docker build -t "$ECR_REPO:$GITHUB_SHA" .
docker push "$ECR_REPO:$GITHUB_SHA"
```

ECS later pulls those images from ECR when deploying the task.

ECR image scanning is enabled:

```hcl
scan_on_push = true
```

This asks AWS to scan images for known vulnerabilities after they are pushed.

The lifecycle policy keeps the repositories clean:

```text
Keep the last 30 pushed images
```

Older images are expired automatically.

### Amazon RDS

Terraform resources:

```hcl
aws_db_subnet_group
aws_db_instance
```

Amazon RDS runs the PostgreSQL database.

This project creates a PostgreSQL database:

```hcl
engine = "postgres"
```

The database is encrypted:

```hcl
storage_encrypted = true
```

The database is not publicly accessible:

```hcl
publicly_accessible = false
```

Only ECS tasks can connect to it through the RDS security group.

The application receives a PostgreSQL URL built in `locals.tf`:

```hcl
database_url = "postgresql://..."
```

The API and worker use that connection string to talk to the database.

### Amazon EFS

Terraform resources:

```hcl
aws_efs_file_system
aws_efs_mount_target
aws_efs_access_point
```

Amazon EFS is a shared file system that can be mounted by ECS tasks.

This project uses EFS for persistent data used by containers running inside ECS:

```text
Redis data
RabbitMQ data
MinIO data
```

The main EFS file system is encrypted:

```hcl
encrypted = true
```

Mount targets are created in each public subnet:

```hcl
resource "aws_efs_mount_target" "public"
```

Access points split the shared file system into service-specific directories:

```text
/redis
/rabbitmq
/minio
```

The ECS task mounts those directories into containers:

```text
redis    /data
rabbitmq /var/lib/rabbitmq
minio    /data
```

### Amazon CloudWatch Logs

Terraform resource:

```hcl
aws_cloudwatch_log_group
```

CloudWatch Logs stores logs from ECS containers.

This project creates one log group:

```hcl
name = "/ecs/${var.name_prefix}"
```

Container logs are sent using the `awslogs` log driver:

```hcl
logDriver = "awslogs"
```

Logs are retained for 14 days:

```hcl
retention_in_days = 14
```

This helps debug API, worker, web, Redis, RabbitMQ, MinIO, migration, and database grant task output.

### AWS IAM

Terraform resources:

```hcl
aws_iam_role
aws_iam_role_policy_attachment
```

IAM controls what AWS actions ECS tasks are allowed to perform.

This project creates two ECS roles:

```text
execution role
task role
```

The execution role is used by ECS itself. It lets ECS pull images from ECR and write logs to CloudWatch.

The task role is available to the running containers. It is where application-level AWS permissions would normally be attached if the app needed to access AWS APIs.

The execution role receives this AWS managed policy:

```hcl
AmazonECSTaskExecutionRolePolicy
```

### Amazon S3

Terraform backend:

```hcl
backend "s3"
```

S3 stores Terraform state for this environment.

Terraform state is important because it maps Terraform resources to real AWS resource IDs.

The configured state key is:

```text
dam-platform/develop/terraform.tfstate
```

The workflow supplies the real bucket with:

```sh
terraform init -backend-config="bucket=${{ vars.TF_STATE_BUCKET }}"
```

State encryption is enabled:

```hcl
encrypt = true
```

Because Terraform state may contain sensitive infrastructure data, the S3 bucket should be private and access-controlled.

### AWS Systems Used by the GitHub Workflow

The workflow uses AWS APIs through these commands and actions:

```yaml
aws-actions/configure-aws-credentials@v4
aws-actions/amazon-ecr-login@v2
```

and:

```sh
aws ecs run-task
aws ecs wait tasks-stopped
aws ecs describe-tasks
```

`configure-aws-credentials` authenticates the workflow to AWS.

`amazon-ecr-login` authenticates Docker to ECR.

`aws ecs run-task` starts one-off Fargate tasks for database grants and migrations.

`aws ecs wait tasks-stopped` waits until those tasks finish.

`aws ecs describe-tasks` reads the task exit code so the workflow can fail if the task failed.

## Terraform Commands

Run these commands from:

```sh
cd terraform/environments/develop
```

### `terraform init`

```sh
terraform init
```

Initializes the working directory. It downloads providers and configures backend state.

In this project, CI uses:

```sh
terraform init \
  -backend-config="bucket=$TF_STATE_BUCKET" \
  -backend-config="region=$AWS_REGION"
```

This supplies the real S3 state bucket and AWS region.

### `terraform validate`

```sh
terraform validate
```

Checks whether the Terraform configuration is valid. It does not contact AWS to compare real infrastructure changes.

### `terraform fmt`

```sh
terraform fmt -recursive
```

Formats Terraform files into standard style. `-recursive` formats modules too.

### `terraform plan`

```sh
terraform plan
```

Shows what Terraform would change without applying it.

Example with image variables:

```sh
TF_VAR_web_image="repo/web:sha" \
TF_VAR_api_image="repo/api:sha" \
TF_VAR_worker_image="repo/worker:sha" \
terraform plan
```

### `terraform apply`

```sh
terraform apply
```

Creates, updates, or destroys infrastructure to match the `.tf` files. Terraform asks for confirmation.

CI uses:

```sh
terraform apply -auto-approve
```

which skips the interactive confirmation.

### `terraform apply -target=module.ecr`

```sh
terraform apply -auto-approve -target=module.ecr
```

Applies only the ECR module. This project does that first because Docker images must be pushed to repositories before the ECS service can deploy them.

Use `-target` carefully. It is useful for bootstrapping, but normal deployments should apply the full stack.

### `terraform output`

```sh
terraform output
```

Prints all outputs.

```sh
terraform output -raw web_url
```

Prints one output as plain text.

```sh
terraform output -json private_subnet_ids
```

Prints output as JSON. The workflow pipes this to `jq` to build the subnet list for `aws ecs run-task`.

```sh
terraform output -json public_subnet_ids
```

Prints the public subnet IDs used by the internet-facing ALB.

### `terraform state list`

```sh
terraform state list
```

Lists resources currently tracked in Terraform state.

### `terraform destroy`

```sh
terraform destroy
```

Destroys infrastructure managed by this Terraform root module.

Be careful with this command. In this project it can remove the ECS service, load balancer, EFS, ECR repositories depending on settings, and RDS database.

### `terraform providers`

```sh
terraform providers
```

Shows which providers are required by the configuration and state.

## Local Run Example

For a local plan, export required secret variables first:

```sh
export TF_VAR_aws_region="ap-south-1"
export TF_VAR_database_password="replace-with-valid-password"
export TF_VAR_rabbitmq_password="replace-with-rabbit-password"
export TF_VAR_minio_access_key="minio-access"
export TF_VAR_minio_secret_key="replace-with-minio-secret"
export TF_VAR_jwt_secret="replace-with-at-least-32-characters"
export TF_VAR_cors_origin="http://localhost:5173"
export TF_VAR_vite_api_base_url="http://localhost:3000"
```

Then run:

```sh
cd terraform/environments/develop
terraform init -backend-config="bucket=your-state-bucket" -backend-config="region=ap-south-1"
terraform validate
terraform plan
```

## Important Notes

The RDS database is private:

```hcl
publicly_accessible = false
```

It is placed in the private subnets through the RDS subnet group. Only ECS tasks can connect to it through the RDS security group.

The ECS service and one-off tasks run without public IPs:

```hcl
assign_public_ip = false
```

They use private subnets. Public browser traffic reaches the public ALB first, and the ALB forwards traffic to the ECS task security group over private VPC networking.

Redis, RabbitMQ, MinIO, API, worker, and web all run inside one ECS task definition. This means `localhost` works between those containers inside the same task.

Sensitive Terraform input variables are marked with:

```hcl
sensitive = true
```

Terraform creates AWS Secrets Manager entries for sensitive ECS runtime values and the ECS task definitions reference them through container `secrets` blocks instead of plain environment variables. Treat Terraform state as sensitive infrastructure data because Terraform still receives the secret values from GitHub Secrets and manages the Secrets Manager versions.
