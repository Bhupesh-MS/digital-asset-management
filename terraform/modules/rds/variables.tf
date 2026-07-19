variable "name_prefix" {
  description = "Name prefix for RDS resources."
  type        = string
}

variable "subnet_ids" {
  description = "Subnet IDs for the DB subnet group."
  type        = list(string)
}

variable "security_group_ids" {
  description = "Security groups attached to the DB instance."
  type        = list(string)
}

variable "database_name" {
  description = "Initial database name."
  type        = string
}

variable "database_username" {
  description = "Database master username."
  type        = string
}

variable "database_password" {
  description = "Database master password."
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
    error_message = "Database password must be 8-128 printable ASCII characters and cannot contain '/', '@', double quotes, or spaces."
  }
}

variable "instance_class" {
  description = "RDS instance class."
  type        = string
  default     = "db.t4g.micro"
}

variable "allocated_storage" {
  description = "Allocated database storage in GiB."
  type        = number
  default     = 20
}

variable "engine_version" {
  description = "PostgreSQL engine version. Use a major version so RDS selects an available minor version in the target region."
  type        = string
  default     = "16"
}

variable "skip_final_snapshot" {
  description = "Whether to skip a final snapshot on destroy."
  type        = bool
  default     = false
}
