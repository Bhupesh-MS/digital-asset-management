variable "name_prefix" {
  description = "Name prefix for ECS resources."
  type        = string
}

variable "cluster_id" {
  description = "ECS cluster ID."
  type        = string
}

variable "subnet_ids" {
  description = "Subnet IDs where Fargate tasks run."
  type        = list(string)
}

variable "security_group_ids" {
  description = "Security groups attached to the ECS service."
  type        = list(string)
}

variable "web_target_group_arn" {
  description = "Optional ALB target group ARN for the web container."
  type        = string
  default     = null
}

variable "api_target_group_arn" {
  description = "Optional ALB target group ARN for the API container."
  type        = string
  default     = null
}

variable "minio_target_group_arn" {
  description = "Optional ALB target group ARN for the MinIO container."
  type        = string
  default     = null
}

variable "assign_public_ip" {
  description = "Whether the ECS task gets a public IP."
  type        = bool
  default     = true
}

variable "task_cpu" {
  description = "Fargate task CPU units."
  type        = number
}

variable "task_memory" {
  description = "Fargate task memory in MiB."
  type        = number
}

variable "desired_count" {
  description = "Desired ECS service task count."
  type        = number
  default     = 1
}

variable "web_image" {
  description = "Full web container image URI."
  type        = string
}

variable "api_image" {
  description = "Full API container image URI."
  type        = string
}

variable "worker_image" {
  description = "Full worker container image URI."
  type        = string
}

variable "database_url" {
  description = "Application PostgreSQL connection string."
  type        = string
  sensitive   = true
}

variable "rabbitmq_url" {
  description = "RabbitMQ URL used by API and worker containers."
  type        = string
  sensitive   = true
}

variable "redis_url" {
  description = "Redis URL used by API and worker containers."
  type        = string
}

variable "minio_endpoint" {
  description = "Internal MinIO endpoint."
  type        = string
}

variable "minio_public_endpoint" {
  description = "Public MinIO endpoint advertised by the API."
  type        = string
}

variable "minio_port" {
  description = "Internal MinIO API port."
  type        = number
}

variable "minio_public_port" {
  description = "Public MinIO API port."
  type        = number
}

variable "minio_bucket" {
  description = "MinIO bucket name."
  type        = string
}

variable "minio_access_key" {
  description = "MinIO root/access key."
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.minio_access_key) >= 3
    error_message = "MinIO access key must be at least 3 characters."
  }
}

variable "minio_secret_key" {
  description = "MinIO root/secret key."
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.minio_secret_key) >= 8
    error_message = "MinIO secret key must be at least 8 characters."
  }
}

variable "jwt_secret" {
  description = "JWT signing secret."
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.jwt_secret) >= 32
    error_message = "JWT secret must be at least 32 characters."
  }
}

variable "cors_origin" {
  description = "Comma-separated allowed CORS origins."
  type        = string
}

variable "api_base_url" {
  description = "API base URL used in Swagger server metadata."
  type        = string
}

variable "database_connect_attempts" {
  description = "Number of API database connection retry attempts at startup."
  type        = number
}

variable "database_connect_delay_ms" {
  description = "Delay between API database connection retries in milliseconds."
  type        = number
}

variable "max_json_payload_size" {
  description = "Express JSON request body limit."
  type        = string
}

variable "log_level" {
  description = "Application log level."
  type        = string
}

variable "minio_use_ssl" {
  description = "Whether the app should use SSL when connecting to MinIO."
  type        = bool
}

variable "minio_region" {
  description = "MinIO/S3 region used by the storage client."
  type        = string
}

variable "api_port" {
  description = "API container port."
  type        = number
  default     = 3000
}

variable "web_port" {
  description = "Web container port."
  type        = number
  default     = 80
}

variable "upload_temp_dir" {
  description = "Temporary upload directory inside the API container."
  type        = string
  default     = "/tmp/dam-platform/uploads"
}

variable "max_asset_files" {
  description = "Maximum files accepted per upload request."
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

variable "efs_file_system_id" {
  description = "EFS file system ID for task volumes."
  type        = string
}

variable "redis_access_point_id" {
  description = "EFS access point for Redis."
  type        = string
}

variable "rabbitmq_access_point_id" {
  description = "EFS access point for RabbitMQ."
  type        = string
}

variable "minio_access_point_id" {
  description = "EFS access point for MinIO."
  type        = string
}

variable "rabbitmq_username" {
  description = "RabbitMQ default username."
  type        = string
}

variable "rabbitmq_password" {
  description = "RabbitMQ default password."
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.rabbitmq_password) >= 1
    error_message = "RabbitMQ password must be set and cannot be empty."
  }
}

variable "aws_region" {
  description = "AWS region for CloudWatch logs."
  type        = string
}
