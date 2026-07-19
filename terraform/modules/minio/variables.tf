variable "name_prefix" {
  description = "Name prefix for MinIO EFS access point resources."
  type        = string
}

variable "efs_file_system_id" {
  description = "EFS file system ID used for MinIO persistence."
  type        = string
}
