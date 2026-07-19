variable "name_prefix" {
  description = "Name prefix for Redis EFS access point resources."
  type        = string
}

variable "efs_file_system_id" {
  description = "EFS file system ID used for Redis persistence."
  type        = string
}
