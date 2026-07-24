variable "project_name" {
  description = "Project name used to prefix ECR repositories."
  type        = string
}

variable "environment" {
  description = "Deployment environment name."
  type        = string
}

variable "image_names" {
  description = "Application image repository suffixes."
  type        = set(string)
  default     = ["web", "api", "worker", "postgres-client", "redis", "rabbitmq", "minio"]
}

variable "force_delete" {
  description = "Allow Terraform to delete repositories that still contain images."
  type        = bool
  default     = false
}
