variable "aws_region" {
  description = "AWS region for all resources."
  type        = string
}

variable "project_name" {
  description = "Project name used in resource names."
  type        = string
  default     = "dam-platform"
}

variable "environment" {
  description = "Environment name."
  type        = string
  default     = "develop"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
  default     = "10.20.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets."
  type        = list(string)
  default     = ["10.20.1.0/24", "10.20.2.0/24"]
}

variable "allowed_public_cidr_blocks" {
  description = "CIDR blocks allowed to reach public web and API ports."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "task_cpu" {
  description = "Fargate task CPU units for the combined app task."
  type        = number
  default     = 4096
}

variable "task_memory" {
  description = "Fargate task memory in MiB for the combined app task."
  type        = number
  default     = 8192
}

variable "desired_count" {
  description = "Desired ECS task count."
  type        = number
  default     = 1
}

variable "web_image" {
  description = "Full web image URI."
  type        = string
  default     = "public.ecr.aws/nginx/nginx:latest"
}

variable "api_image" {
  description = "Full API image URI."
  type        = string
  default     = "public.ecr.aws/docker/library/node:22-bookworm-slim"
}

variable "worker_image" {
  description = "Full worker image URI."
  type        = string
  default     = "public.ecr.aws/docker/library/node:22-bookworm-slim"
}

variable "database_name" {
  description = "RDS database name."
  type        = string
  default     = "dam"
}

variable "database_schema" {
  description = "PostgreSQL schema used by Prisma."
  type        = string
  default     = "public"
}

variable "database_username" {
  description = "RDS master username."
  type        = string
  default     = "dam"
}

variable "database_password" {
  description = "RDS master password."
  type        = string
  sensitive   = true

  validation {
    condition = (
      can(regex("^[!-~]{8,128}$", var.database_password)) &&
      !strcontains(var.database_password, "/") &&
      !strcontains(var.database_password, "@") &&
      !strcontains(var.database_password, "\"") &&
      !strcontains(var.database_password, " ")
    )
    error_message = "DATABASE_PASSWORD must be 8-128 printable ASCII characters and cannot contain '/', '@', double quotes, or spaces."
  }
}

variable "rds_instance_class" {
  description = "RDS instance class."
  type        = string
  default     = "db.t4g.micro"
}

variable "rds_allocated_storage" {
  description = "RDS allocated storage in GiB."
  type        = number
  default     = 20
}

variable "rds_skip_final_snapshot" {
  description = "Skip final RDS snapshot on destroy."
  type        = bool
  default     = false
}

variable "rabbitmq_username" {
  description = "RabbitMQ default username."
  type        = string
  default     = "dam"
}

variable "rabbitmq_password" {
  description = "RabbitMQ default password."
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.rabbitmq_password) >= 1
    error_message = "RABBITMQ_PASSWORD must be set and cannot be empty."
  }
}

variable "minio_access_key" {
  description = "MinIO access key."
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.minio_access_key) >= 3
    error_message = "MINIO_ACCESS_KEY must be at least 3 characters."
  }
}

variable "minio_secret_key" {
  description = "MinIO secret key."
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.minio_secret_key) >= 8
    error_message = "MINIO_SECRET_KEY must be at least 8 characters."
  }
}

variable "minio_bucket" {
  description = "MinIO bucket name used by the app."
  type        = string
  default     = "assets"
}

variable "minio_public_endpoint" {
  description = "Public MinIO endpoint advertised by the app."
  type        = string
  default     = "localhost"
}

variable "minio_public_port" {
  description = "Public MinIO API port."
  type        = number
  default     = 9000
}

variable "jwt_secret" {
  description = "JWT signing secret."
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.jwt_secret) >= 32
    error_message = "JWT_SECRET must be at least 32 characters."
  }
}

variable "cors_origin" {
  description = "Comma-separated allowed browser origins."
  type        = string
}

variable "api_base_url" {
  description = "API base URL used in Swagger server metadata."
  type        = string
  default     = "http://localhost:3000"
}

variable "vite_api_base_url" {
  description = "Frontend build-time API base URL."
  type        = string
}

variable "database_connect_attempts" {
  description = "Number of API database connection retry attempts at startup."
  type        = number
  default     = 10
}

variable "database_connect_delay_ms" {
  description = "Delay between API database connection retries in milliseconds."
  type        = number
  default     = 2000
}

variable "max_json_payload_size" {
  description = "Express JSON request body limit."
  type        = string
  default     = "10mb"
}

variable "log_level" {
  description = "Application log level."
  type        = string
  default     = "info"
}

variable "minio_use_ssl" {
  description = "Whether the app should use SSL when connecting to MinIO."
  type        = bool
  default     = false
}

variable "minio_region" {
  description = "MinIO/S3 region used by the storage client."
  type        = string
  default     = "us-east-1"
}

variable "max_asset_files" {
  description = "Maximum files per upload request."
  type        = number
  default     = 10
}

variable "max_asset_file_size_bytes" {
  description = "Maximum asset file size in bytes."
  type        = number
  default     = 524288000
}

variable "upload_stream_chunk_size_bytes" {
  description = "Upload stream chunk size in bytes."
  type        = number
  default     = 8388608
}

variable "upload_temp_dir" {
  description = "Upload temp path inside the API container."
  type        = string
  default     = "/tmp/dam-platform/uploads"
}
